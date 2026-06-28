/**
 * POST /api/devices/register-ios
 *
 * Registers an iOS APNs device token for a user identified by email. The iOS app
 * is a guest/local client with no Supabase JWT, so it authenticates with the
 * shared RESIN_SYNC_KEY (same model as /api/notes/sync) rather than a Bearer token.
 *
 * Body: { email: string, api_key: string, device_token: string }
 * Response: { success: true, user_id: string }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, RESIN_SYNC_KEY, resolveUserIdByEmail } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; device_token?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, api_key, device_token } = body;

	if (!api_key || api_key !== RESIN_SYNC_KEY) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}
	if (!email || !email.includes('@')) {
		return json({ error: 'Valid email required' }, { status: 400 });
	}
	if (!device_token || typeof device_token !== 'string') {
		return json({ error: 'device_token is required' }, { status: 400 });
	}

	const userId = await resolveUserIdByEmail(email.trim().toLowerCase());
	if (!userId) {
		return json({ error: 'Could not resolve account' }, { status: 500 });
	}

	const { error } = await adminClient.from('device_tokens').upsert(
		{
			user_id: userId,
			token: device_token,
			device_type: 'ios',
			is_active: true,
			last_used_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'user_id,token' }
	);

	if (error) {
		console.error('[register-ios] upsert failed:', error.message);
		return json({ error: 'Failed to register device token' }, { status: 500 });
	}

	return json({ success: true, user_id: userId });
};
