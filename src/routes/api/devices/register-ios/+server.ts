/**
 * POST /api/devices/register-ios
 *
 * Registers an iOS APNs device token for a user identified by email. The iOS app
 * is a guest/local client with no Supabase JWT, so it authenticates with the
 * shared RESIN_SYNC_KEY (same model as /api/notes/sync) rather than a Bearer token.
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

	const { data: existing, error: lookupError } = await adminClient
		.from('device_tokens')
		.select('id, user_id')
		.eq('token', normalizedToken)
		.maybeSingle();

	if (lookupError) {
		console.error('[register-ios] token lookup failed');
		return json({ error: 'Failed to register device token' }, { status: 500, headers: NO_STORE_HEADERS });
	}
	if (existing && existing.user_id !== userId) {
		return json({ error: 'Device token already registered' }, { status: 409, headers: NO_STORE_HEADERS });
	}

	const payload = {
		user_id: userId,
		token: normalizedToken,
		device_type: 'ios',
		device_name: 'iOS App',
		is_active: true,
		last_used_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	const { error } = existing
		? await adminClient
				.from('device_tokens')
				.update(payload)
				.eq('id', existing.id)
				.eq('user_id', userId)
		: await adminClient.from('device_tokens').insert(payload);

	if (error) {
		console.error('[register-ios] upsert failed');
		return json({ error: 'Failed to register device token' }, { status: 500, headers: NO_STORE_HEADERS });
	}

	return json({ success: true }, { headers: NO_STORE_HEADERS });
};
