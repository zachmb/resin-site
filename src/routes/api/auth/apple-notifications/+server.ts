import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createVerify } from 'crypto';

interface AppleNotificationPayload {
	notificationType: 'SignedUp' | 'AccountDelete' | 'EmailChange' | 'ConsentRevoked';
	subjectToken?: string;
	subjectTokenExpiresIn?: number;
	data?: {
		transferSubjectToken?: string;
		transferSubjectTokenExpiresIn?: number;
		email?: string;
	};
	timestamp: number;
}

// Apple's public keys endpoint
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

// Cache Apple's public keys
let cachedKeys: any = null;
let keysCacheTime = 0;
const KEYS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Decode JWT without verification (to extract header/payload)
 */
function decodeJWT(token: string): { header: any; payload: any } {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
	const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

	return { header, payload };
}

/**
 * Fetch and cache Apple's public keys
 */
async function getApplePublicKeys(): Promise<any> {
	const now = Date.now();
	if (cachedKeys && now - keysCacheTime < KEYS_CACHE_DURATION) {
		return cachedKeys;
	}

	const response = await fetch(APPLE_KEYS_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch Apple public keys: ${response.status}`);
	}

	cachedKeys = await response.json();
	keysCacheTime = now;
	return cachedKeys;
}

/**
 * Verify and decode Apple's signed notification
 */
async function verifyAppleNotification(signedPayload: string): Promise<AppleNotificationPayload> {
	try {
		const { header, payload } = decodeJWT(signedPayload);
		const publicKeys = await getApplePublicKeys();

		// Find the matching key by kid
		const key = publicKeys.keys.find((k: any) => k.kid === header.kid);
		if (!key) {
			throw new Error(`No matching key found for kid: ${header.kid}`);
		}

		// Verify the signature
		const [headerB64, payloadB64, signatureB64] = signedPayload.split('.');
		const message = `${headerB64}.${payloadB64}`;
		const signature = Buffer.from(signatureB64, 'base64');

		// Convert JWK to PEM (using built-in Node.js approach)
		const crypto = await import('crypto');
		const publicKey = crypto.createPublicKey({
			key: key,
			format: 'jwk'
		});

		const verify = createVerify('RSA-SHA256');
		verify.update(message);

		if (!verify.verify(publicKey, signature)) {
			throw new Error('Signature verification failed');
		}

		console.log('[AppleNotifications] Signature verified ✓');
		return payload as AppleNotificationPayload;
	} catch (error) {
		console.error('[AppleNotifications] JWT verification failed:', error);
		throw new Error('Invalid notification signature');
	}
}

/**
 * Handle account deletion notification from Apple
 */
async function handleAccountDelete(_payload: AppleNotificationPayload): Promise<{ action: string; manualReviewRequired: boolean }> {
	console.log('[AppleNotifications] Handling account deletion');

	console.log(
		'[AppleNotifications] Account deletion requested. No local Apple account mapping was found for automatic deletion.'
	);
	return { action: 'acknowledged_without_local_mapping', manualReviewRequired: true };
}

/**
 * Handle email change notification from Apple
 */
async function handleEmailChange(payload: AppleNotificationPayload): Promise<{ action: string }> {
	console.log('[AppleNotifications] Handling email change');
	if (payload.data?.email) {
		console.log('[AppleNotifications] User email changed; local account mapping not available for automatic update.');
		// You could update user records or send confirmation emails here
	}
	return { action: 'acknowledged_without_local_mapping' };
}

/**
 * Handle consent revocation from Apple
 */
async function handleConsentRevoked(_payload: AppleNotificationPayload): Promise<{ action: string; manualReviewRequired: boolean }> {
	console.log('[AppleNotifications] Handling consent revocation');
	// User has revoked consent for Sign in with Apple
	// Ideally, you should:
	// 1. Invalidate the user's session
	// 2. Prevent future logins with Apple
	// 3. Notify the user
	return { action: 'acknowledged_without_local_mapping', manualReviewRequired: true };
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the signed payload from the request
		const body = await request.json();
		const { signedPayload } = body;

		if (!signedPayload) {
			console.error('[AppleNotifications] Missing signedPayload');
			return json({ error: 'Missing signedPayload' }, { status: 400 });
		}

		// Verify and decode the notification
		console.log('[AppleNotifications] Verifying notification signature...');
		const payload = await verifyAppleNotification(signedPayload);

		console.log('[AppleNotifications] Notification type:', payload.notificationType);
		console.log('[AppleNotifications] Timestamp:', new Date(payload.timestamp * 1000).toISOString());

		// Handle different notification types
		let processingResult: Record<string, unknown> = { action: 'acknowledged' };
		switch (payload.notificationType) {
			case 'AccountDelete':
				processingResult = await handleAccountDelete(payload);
				break;
			case 'EmailChange':
				processingResult = await handleEmailChange(payload);
				break;
			case 'ConsentRevoked':
				processingResult = await handleConsentRevoked(payload);
				break;
			case 'SignedUp':
				console.log('[AppleNotifications] User signed up (informational only)');
				break;
			default:
				console.log('[AppleNotifications] Unknown notification type:', payload.notificationType);
		}

		// Always respond with 200 OK to acknowledge receipt
		return json({ success: true, processed: processingResult }, { status: 200 });
	} catch (error) {
		console.error('[AppleNotifications] Error processing notification:', error);
		// Still return 200 to acknowledge that we received it
		// (Apple expects 200 even if processing fails)
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 200 }
		);
	}
};
