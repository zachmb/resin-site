import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { adminClient } from '$lib/server/auth';
import { deleteUserAccount } from '$lib/server/accountDeletion';
import { createVerify } from 'crypto';
import { APNS_BUNDLE_ID } from '$env/static/private';
import { readBoundedJsonBody, readBoundedJsonResponse, RequestBodyError } from '$lib/server/requestBody';

interface AppleNotificationPayload {
	iss?: string;
	aud?: string | string[];
	iat?: number;
	events?: string;
	notificationType?: string;
	type?: string;
	sub?: string;
	email?: string;
	subjectToken?: string;
	subjectTokenExpiresIn?: number;
	data?: {
		transferSubjectToken?: string;
		transferSubjectTokenExpiresIn?: number;
		email?: string;
		sub?: string;
	};
	timestamp: number;
}

interface ApplePublicKey {
	kty?: string;
	kid?: string;
	use?: string;
	alg?: string;
	n?: string;
	e?: string;
	x?: string;
	y?: string;
	crv?: string;
}

interface ApplePublicKeySet {
	keys: ApplePublicKey[];
}

// Apple's public keys endpoint
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_KEYS_TIMEOUT_MS = 8000;
const MAX_APPLE_KEYS_RESPONSE_LENGTH = 32_000;
const MAX_APPLE_PUBLIC_KEYS = 10;
const MAX_SIGNED_PAYLOAD_LENGTH = 16_384;
const MAX_REQUEST_BODY_LENGTH = 20_000;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_NOTIFICATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NOTIFICATION_FUTURE_SKEW_MS = 10 * 60 * 1000;
const MAX_EVENTS_CLAIM_LENGTH = 8_192;
const APPLE_ISSUER = 'https://appleid.apple.com';
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

// Cache Apple's public keys
let cachedKeys: ApplePublicKeySet | null = null;
let keysCacheTime = 0;
const KEYS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Decode JWT without verification (to extract header/payload)
 */
function decodeBase64Url(value: string): Buffer {
	return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function safeAppleLog(message: string) {
	console.warn(message);
}

function decodeJWT(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const header = JSON.parse(decodeBase64Url(parts[0]).toString());
	const payload = JSON.parse(decodeBase64Url(parts[1]).toString());

	return { header, payload };
}

function isSafeBase64Url(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{1,2048}$/.test(value);
}

function isValidApplePublicKey(key: unknown): key is ApplePublicKey {
	if (!key || typeof key !== 'object') return false;
	const candidate = key as ApplePublicKey;
	const kid = typeof candidate.kid === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(candidate.kid);
	const alg = candidate.alg === undefined || candidate.alg === 'RS256' || candidate.alg === 'ES256';
	if (!kid || !alg) return false;

	if (candidate.kty === 'RSA') {
		return isSafeBase64Url(candidate.n) && isSafeBase64Url(candidate.e);
	}
	if (candidate.kty === 'EC') {
		return candidate.crv === 'P-256' && isSafeBase64Url(candidate.x) && isSafeBase64Url(candidate.y);
	}
	return false;
}

function isValidApplePublicKeySet(value: unknown): value is ApplePublicKeySet {
	if (!value || typeof value !== 'object') return false;
	const keys = (value as { keys?: unknown }).keys;
	return Array.isArray(keys) &&
		keys.length > 0 &&
		keys.length <= MAX_APPLE_PUBLIC_KEYS &&
		keys.every(isValidApplePublicKey);
}

function joseEcdsaToDer(signature: Buffer): Buffer {
	if (signature.length !== 64) {
		throw new Error('Invalid ES256 signature length');
	}

	const encodeInteger = (rawValue: Buffer) => {
		let value = rawValue;
		while (value.length > 1 && value[0] === 0 && (value[1] & 0x80) === 0) {
			value = value.subarray(1);
		}
		if (value[0] & 0x80) {
			value = Buffer.concat([Buffer.from([0]), value]);
		}
		return Buffer.concat([Buffer.from([0x02, value.length]), value]);
	};

	const r = encodeInteger(signature.subarray(0, 32));
	const s = encodeInteger(signature.subarray(32));
	const length = r.length + s.length;
	return Buffer.concat([Buffer.from([0x30, length]), r, s]);
}

function signatureForAlg(signature: Buffer, alg: string): Buffer {
	if (alg === 'ES256') return joseEcdsaToDer(signature);
	if (alg === 'RS256') return signature;
	throw new Error(`Unsupported Apple notification algorithm: ${alg}`);
}

function verifierAlgorithmForAlg(alg: string): string {
	if (alg === 'ES256') return 'SHA256';
	if (alg === 'RS256') return 'RSA-SHA256';
	throw new Error(`Unsupported Apple notification algorithm: ${alg}`);
}

/**
 * Fetch and cache Apple's public keys
 */
async function getApplePublicKeys(): Promise<ApplePublicKeySet> {
	const now = Date.now();
	if (cachedKeys && now - keysCacheTime < KEYS_CACHE_DURATION) {
		return cachedKeys;
	}

	let response: Response;
	try {
		response = await fetch(APPLE_KEYS_URL, {
			signal: AbortSignal.timeout(APPLE_KEYS_TIMEOUT_MS)
		});
	} catch {
		throw new Error('Failed to fetch Apple public keys');
	}
	if (!response.ok) {
		await response.body?.cancel().catch(() => undefined);
		throw new Error('Failed to fetch Apple public keys');
	}

	const keySet = await readBoundedJsonResponse<unknown>(response, MAX_APPLE_KEYS_RESPONSE_LENGTH);
	if (!isValidApplePublicKeySet(keySet)) {
		throw new Error('Invalid Apple public key response');
	}

	cachedKeys = keySet;
	keysCacheTime = now;
	return cachedKeys;
}

/**
 * Verify and decode Apple's signed notification
 */
async function verifyAppleNotification(signedPayload: string): Promise<AppleNotificationPayload> {
	try {
		const { header, payload } = decodeJWT(signedPayload);
		const alg = typeof header.alg === 'string' ? header.alg : '';
		const kid = typeof header.kid === 'string' ? header.kid : '';
		if (!kid) throw new Error('Missing Apple notification key id');
		const publicKeys = await getApplePublicKeys();

		// Find the matching key by kid
		const key = publicKeys.keys.find((candidate) => candidate.kid === kid);
		if (!key) {
			throw new Error('No matching Apple notification key');
		}

		// Verify the signature
		const [headerB64, payloadB64, signatureB64] = signedPayload.split('.');
		const message = `${headerB64}.${payloadB64}`;
		const signature = signatureForAlg(decodeBase64Url(signatureB64), alg);

		// Convert JWK to PEM (using built-in Node.js approach)
		const crypto = await import('crypto');
		const publicKey = crypto.createPublicKey({
			key: key,
			format: 'jwk'
		});

		const verify = createVerify(verifierAlgorithmForAlg(alg));
		verify.update(message);

		if (!verify.verify(publicKey, signature)) {
			throw new Error('Signature verification failed');
		}

		const verifiedPayload = normalizeAppleNotificationPayload(payload);
		assertFreshNotification(verifiedPayload);
		assertTrustedAppleClaims(verifiedPayload);
		safeAppleLog('[AppleNotifications] Signature verified');
		return verifiedPayload;
	} catch (error) {
		safeAppleLog('[AppleNotifications] JWT verification failed');
		throw new Error('Invalid notification signature');
	}
}

function normalizeAppleNotificationPayload(payload: Record<string, unknown>): AppleNotificationPayload {
	const basePayload = payload as unknown as AppleNotificationPayload;
	if (typeof basePayload.events !== 'string') return basePayload;
	if (!basePayload.events || basePayload.events.length > MAX_EVENTS_CLAIM_LENGTH) {
		throw new Error('Invalid Apple notification events claim');
	}

	const event = JSON.parse(basePayload.events) as Record<string, unknown>;
	if (!event || typeof event !== 'object' || Array.isArray(event)) {
		throw new Error('Invalid Apple notification events claim');
	}

	return {
		...basePayload,
		type: typeof event.type === 'string' ? event.type : basePayload.type,
		sub: typeof event.sub === 'string' ? event.sub : basePayload.sub,
		email: typeof event.email === 'string' ? event.email : basePayload.email,
		timestamp: typeof event.event_time === 'number'
			? event.event_time
			: typeof basePayload.iat === 'number'
				? basePayload.iat
				: basePayload.timestamp
	};
}

function notificationTimestampMs(payload: AppleNotificationPayload): number | null {
	const timestamp = Number(payload.timestamp);
	if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
	return timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
}

function assertFreshNotification(payload: AppleNotificationPayload) {
	const timestampMs = notificationTimestampMs(payload);
	if (!timestampMs) throw new Error('Missing notification timestamp');
	const ageMs = Date.now() - timestampMs;
	if (ageMs > MAX_NOTIFICATION_AGE_MS || ageMs < -MAX_NOTIFICATION_FUTURE_SKEW_MS) {
		throw new Error('Stale Apple notification');
	}
}

function assertTrustedAppleClaims(payload: AppleNotificationPayload) {
	if (payload.iss !== APPLE_ISSUER) {
		throw new Error('Unexpected Apple notification issuer');
	}

	if (!payload.aud || !APNS_BUNDLE_ID) {
		throw new Error('Missing Apple notification audience');
	}

	const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!audiences.includes(APNS_BUNDLE_ID)) {
		throw new Error('Unexpected Apple notification audience');
	}
}

function normalizedNotificationType(payload: AppleNotificationPayload): string {
	return (payload.notificationType ?? payload.type ?? '')
		.trim()
		.toLowerCase()
		.replace(/_/g, '-');
}

/**
 * Handle account deletion notification from Apple
 */
function getAppleSubject(payload: AppleNotificationPayload): string | null {
	return payload.sub ?? payload.data?.sub ?? null;
}

function getAppleEmail(payload: AppleNotificationPayload): string | null {
	return payload.email ?? payload.data?.email ?? null;
}

function identityMatchesAppleSubject(identity: any, subject: string): boolean {
	if (identity?.provider !== 'apple') return false;
	return (
		identity.id === subject ||
		identity.identity_id === subject ||
		identity.identity_data?.sub === subject ||
		identity.identity_data?.provider_id === subject
	);
}

async function findAppleUserId(payload: AppleNotificationPayload): Promise<string | null> {
	const subject = getAppleSubject(payload);
	const email = getAppleEmail(payload)?.toLowerCase();

	if (!subject && !email) return null;

	for (let page = 1; page <= 20; page += 1) {
		const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
		if (error) {
			safeAppleLog('[AppleNotifications] Could not list users for account lookup');
			return null;
		}

		const user = data.users.find((candidate: any) => {
			const identities = Array.isArray(candidate.identities) ? candidate.identities : [];
			if (subject && identities.some((identity: any) => identityMatchesAppleSubject(identity, subject))) return true;
			if (email && candidate.email?.toLowerCase() === email) {
				return identities.some((identity: any) => identity?.provider === 'apple');
			}
			return false;
		});

		if (user) return user.id;
		if (data.users.length < 1000) break;
	}

	return null;
}

async function handleAccountDelete(payload: AppleNotificationPayload): Promise<{ action: string; manualReviewRequired: boolean }> {
	safeAppleLog('[AppleNotifications] Handling account deletion');

	const userId = await findAppleUserId(payload);
	if (!userId) {
		safeAppleLog('[AppleNotifications] Account deletion requested without local mapping');
		return { action: 'mapping_failed', manualReviewRequired: true };
	}

	const { error } = await deleteUserAccount(userId);
	if (error) {
		safeAppleLog('[AppleNotifications] Automatic account deletion failed');
		return { action: 'delete_failed', manualReviewRequired: true };
	}

	safeAppleLog('[AppleNotifications] Deleted local account for Apple deletion notification');
	return { action: 'deleted_local_account', manualReviewRequired: false };
}

/**
 * Handle email change notification from Apple
 */
async function handleEmailChange(payload: AppleNotificationPayload): Promise<{ action: string }> {
	safeAppleLog('[AppleNotifications] Handling email change');
	if (payload.data?.email) {
		safeAppleLog('[AppleNotifications] User email changed without automatic local mapping');
		// You could update user records or send confirmation emails here
	}
	return { action: 'acknowledged_without_local_mapping' };
}

/**
 * Handle consent revocation from Apple
 */
async function handleConsentRevoked(_payload: AppleNotificationPayload): Promise<{ action: string; manualReviewRequired: boolean }> {
	safeAppleLog('[AppleNotifications] Handling consent revocation');
	// Consent revocation is not always account deletion. We acknowledge it and
	// leave the self-serve deletion path available unless Apple sends AccountDelete.
	return { action: 'acknowledged_without_local_mapping', manualReviewRequired: true };
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the signed payload from the request
		let body: { signedPayload?: unknown };
		try {
			body = await readBoundedJsonBody<{ signedPayload?: unknown }>(request, MAX_REQUEST_BODY_LENGTH);
		} catch (error) {
			safeAppleLog(error instanceof RequestBodyError && error.status === 413
				? '[AppleNotifications] Request body too large'
				: '[AppleNotifications] Invalid JSON body');
			const status = error instanceof RequestBodyError ? error.status : 400;
			return json({ success: false, error: 'Invalid notification' }, { status, headers: NO_STORE_HEADERS });
		}
		const { signedPayload } = body;

		if (typeof signedPayload !== 'string' || signedPayload.length === 0) {
			safeAppleLog('[AppleNotifications] Missing signedPayload');
			return json({ success: false, error: 'Invalid notification' }, { status: 400, headers: NO_STORE_HEADERS });
		}
		if (signedPayload.length > MAX_SIGNED_PAYLOAD_LENGTH || !JWT_RE.test(signedPayload)) {
			safeAppleLog('[AppleNotifications] Invalid signedPayload shape');
			return json({ success: false, error: 'Invalid notification' }, { status: 400, headers: NO_STORE_HEADERS });
		}

		// Verify and decode the notification
		safeAppleLog('[AppleNotifications] Verifying notification signature');
		const payload = await verifyAppleNotification(signedPayload);

		const notificationType = normalizedNotificationType(payload);

		// Handle different notification types
		switch (notificationType) {
			case 'accountdelete':
			case 'account-delete':
			case 'account-deleted': {
				const result = await handleAccountDelete(payload);
				if (result.manualReviewRequired) {
					return json(
						{ success: false, error: 'Account deletion processing failed' },
						{ status: 500, headers: NO_STORE_HEADERS }
					);
				}
				break;
			}
			case 'emailchange':
			case 'email-change':
			case 'email-enabled':
			case 'email-disabled':
				await handleEmailChange(payload);
				break;
			case 'consentrevoked':
			case 'consent-revoked':
				await handleConsentRevoked(payload);
				break;
			case 'signedup':
			case 'signed-up':
				safeAppleLog('[AppleNotifications] User signed up');
				break;
			default:
				safeAppleLog('[AppleNotifications] Unknown notification type');
		}

		// Acknowledge successfully processed or non-actionable notifications.
		return json({ success: true }, { status: 200, headers: NO_STORE_HEADERS });
	} catch (error) {
		safeAppleLog('[AppleNotifications] Error processing notification');
		return json(
			{
				success: false,
				error: 'Invalid notification'
			},
			{ status: 500, headers: NO_STORE_HEADERS }
		);
	}
};
