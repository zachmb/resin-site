/**
 * Server-side StoreKit 2 transaction verification.
 *
 * iOS sends the App Store's signed transaction (`Transaction.jwsRepresentation`);
 * we verify it cryptographically against Apple's root certificates before ever
 * granting Pro on the shared account. This is the money-safe replacement for
 * trusting a client-claimed `is_pro` boolean.
 *
 * Money-safety contract (all failures fall CLOSED — never grant on doubt):
 *   - malformed / missing JWS            → { verified: false }
 *   - signature or cert chain invalid    → { verified: false }
 *   - bundle id / environment mismatch   → { verified: false } (checked by Apple's lib)
 *   - product id not in the Pro allowlist → { verified: false }
 *   - transaction revoked / expired      → { verified: false }
 *
 * Configuration (env, all optional — sensible defaults for the current TestFlight
 * build; set these when shipping to the App Store):
 *   APPLE_IAP_BUNDLE_ID        default "comlooplessapp.resin"
 *   APPLE_IAP_APP_APPLE_ID     the app's numeric App Store id — REQUIRED to accept
 *                              Production transactions (omitted → Sandbox only)
 *   APPLE_IAP_PRODUCT_IDS      comma-separated Pro product ids (default monthly+yearly)
 *   APPLE_IAP_DISABLE_SANDBOX  set to "1" to stop accepting Sandbox/TestFlight txns
 */
import { env } from '$env/dynamic/private';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { APPLE_ROOT_CERTS } from './apple-root-certs';

const DEFAULT_BUNDLE_ID = 'comlooplessapp.resin';
const DEFAULT_PRODUCT_IDS = [
	'comlooplessapp.resin.pro.monthly',
	'comlooplessapp.resin.pro.yearly'
];
const MIN_JWS_LENGTH = 20;
const MAX_JWS_LENGTH = 32_000;

export interface ProVerificationResult {
	verified: boolean;
	reason?: string;
	productId?: string;
	expiresDate?: number;
}

function allowedProductIds(): Set<string> {
	const raw = env.APPLE_IAP_PRODUCT_IDS;
	const ids = raw
		? raw.split(',').map((s) => s.trim()).filter(Boolean)
		: DEFAULT_PRODUCT_IDS;
	return new Set(ids.length > 0 ? ids : DEFAULT_PRODUCT_IDS);
}

let cachedVerifiers: SignedDataVerifier[] | undefined;

/**
 * Build the set of verifiers to try. Sandbox is always attempted (TestFlight and
 * sandbox testers) unless explicitly disabled; Production is attempted only when
 * the app's numeric App Store id is configured. A transaction is accepted if ANY
 * verifier validates it, so no env flip is needed to move from TestFlight to the
 * App Store — just add APPLE_IAP_APP_APPLE_ID.
 */
function getVerifiers(): SignedDataVerifier[] {
	if (cachedVerifiers !== undefined) return cachedVerifiers;

	const bundleId = (env.APPLE_IAP_BUNDLE_ID ?? DEFAULT_BUNDLE_ID).trim() || DEFAULT_BUNDLE_ID;
	const appAppleIdRaw = env.APPLE_IAP_APP_APPLE_ID?.trim();
	const appAppleId =
		appAppleIdRaw && Number.isFinite(Number(appAppleIdRaw)) ? Number(appAppleIdRaw) : undefined;

	const verifiers: SignedDataVerifier[] = [];

	if (env.APPLE_IAP_DISABLE_SANDBOX !== '1') {
		try {
			verifiers.push(new SignedDataVerifier(APPLE_ROOT_CERTS, false, Environment.SANDBOX, bundleId));
		} catch {
			console.error('[storekit] sandbox verifier init failed');
		}
	}

	if (appAppleId !== undefined) {
		try {
			verifiers.push(
				new SignedDataVerifier(APPLE_ROOT_CERTS, false, Environment.PRODUCTION, bundleId, appAppleId)
			);
		} catch {
			console.error('[storekit] production verifier init failed');
		}
	}

	cachedVerifiers = verifiers;
	return verifiers;
}

/** True when at least one verifier is available (i.e. Pro can be granted on proof). */
export function isStoreKitVerificationAvailable(): boolean {
	return getVerifiers().length > 0;
}

/**
 * Verify an App Store StoreKit signed transaction (JWS) and confirm it grants
 * active Pro right now. Fail-closed on every error path.
 */
export async function verifyProEntitlement(
	signedTransaction: unknown,
	now: number = Date.now()
): Promise<ProVerificationResult> {
	if (
		typeof signedTransaction !== 'string' ||
		signedTransaction.length < MIN_JWS_LENGTH ||
		signedTransaction.length > MAX_JWS_LENGTH
	) {
		return { verified: false, reason: 'missing_or_malformed' };
	}

	const verifiers = getVerifiers();
	if (verifiers.length === 0) {
		return { verified: false, reason: 'not_configured' };
	}

	let payload: Awaited<ReturnType<SignedDataVerifier['verifyAndDecodeTransaction']>> | null = null;
	for (const verifier of verifiers) {
		try {
			payload = await verifier.verifyAndDecodeTransaction(signedTransaction);
			break;
		} catch {
			// Try the next verifier (e.g. Sandbox txn against Production verifier).
		}
	}
	if (!payload) {
		return { verified: false, reason: 'signature_invalid' };
	}

	const productId = typeof payload.productId === 'string' ? payload.productId : undefined;
	if (!productId || !allowedProductIds().has(productId)) {
		return { verified: false, reason: 'product_not_allowed' };
	}
	if (typeof payload.revocationDate === 'number') {
		return { verified: false, reason: 'revoked' };
	}
	// Auto-renewable subscriptions carry an expiresDate; if present it must be in
	// the future. (Non-subscription products omit it — those are accepted.)
	if (typeof payload.expiresDate === 'number' && payload.expiresDate <= now) {
		return { verified: false, reason: 'expired' };
	}

	return { verified: true, productId, expiresDate: payload.expiresDate };
}
