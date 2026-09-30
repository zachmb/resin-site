/**
 * POST /api/devices/unregister-ios
 *
 * Deactivates an iOS APNs device token for the account identified by email.
 * Used by the iOS app during sign-out so stale devices stop receiving pushes.
 *
 * Body: { email: string, api_key: string, device_token: string }
 * Response: { success: true }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, isValidResinSyncKey, normalizeEmail, resolveExistingUserIdByEmail } from '$lib/server/auth';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const APNS_TOKEN_LENGTH = 64;
const MAX_REQUEST_BODY_LENGTH = 4_000;
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

function normalizeAPNSToken(token: string): string {
	return token.trim().toLowerCase();
}

function isValidAPNSToken(token: string): boolean {
	return (
		token.length === APNS_TOKEN_LENGTH &&
		/^[a-f0-9]+$/.test(token)
	);
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; device_token?: string };
	try {
		body = await readBoundedJsonBody(request, MAX_REQUEST_BODY_LENGTH);
	} catch (error) {
		const status = error instanceof RequestBodyError ? error.status : 400;
		return json({ error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, { status, headers: NO_STORE_HEADERS });
	}

	const { email, api_key, device_token } = body;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401, headers: NO_STORE_HEADERS });
	}
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return json({ error: 'Valid email required' }, { status: 400, headers: NO_STORE_HEADERS });
	}
	if (!device_token || typeof device_token !== 'string') {
		return json({ error: 'device_token is required' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const normalizedToken = normalizeAPNSToken(device_token);
	if (!isValidAPNSToken(normalizedToken)) {
		return json({ error: 'Invalid device token' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const userId = await resolveExistingUserIdByEmail(normalizedEmail);
	if (!userId) {
		return json({ success: true }, { headers: NO_STORE_HEADERS });
	}

	const { error } = await adminClient
		.from('device_tokens')
		.update({
			is_active: false,
			last_used_at: null,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', userId)
		.eq('token', normalizedToken);

	if (error) {
		console.error('[unregister-ios] token cleanup failed');
		return json({ error: 'Failed to unregister device token' }, { status: 500, headers: NO_STORE_HEADERS });
	}

	return json({ success: true }, { headers: NO_STORE_HEADERS });
};
