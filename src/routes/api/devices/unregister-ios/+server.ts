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
import { adminClient, isValidResinSyncKey, resolveExistingUserIdByEmail } from '$lib/server/auth';

const MIN_APNS_TOKEN_LENGTH = 32;
const MAX_APNS_TOKEN_LENGTH = 512;

function normalizeAPNSToken(token: string): string {
	return token.trim().toLowerCase();
}

function isValidAPNSToken(token: string): boolean {
	return (
		token.length >= MIN_APNS_TOKEN_LENGTH &&
		token.length <= MAX_APNS_TOKEN_LENGTH &&
		token.length % 2 === 0 &&
		/^[a-f0-9]+$/.test(token)
	);
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; device_token?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, api_key, device_token } = body;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}
	if (!email || !email.includes('@')) {
		return json({ error: 'Valid email required' }, { status: 400 });
	}
	if (!device_token || typeof device_token !== 'string') {
		return json({ error: 'device_token is required' }, { status: 400 });
	}

	const normalizedToken = normalizeAPNSToken(device_token);
	if (!isValidAPNSToken(normalizedToken)) {
		return json({ error: 'Invalid device token' }, { status: 400 });
	}

	const userId = await resolveExistingUserIdByEmail(email.trim().toLowerCase());
	if (!userId) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	const { error } = await adminClient
		.from('device_tokens')
		.update({
			is_active: false,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', userId)
		.eq('token', normalizedToken);

	if (error) {
		console.error('[unregister-ios] token cleanup failed');
		return json({ error: 'Failed to unregister device token' }, { status: 500 });
	}

	return json({ success: true });
};
