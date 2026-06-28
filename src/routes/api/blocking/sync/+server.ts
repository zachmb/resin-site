/**
 * POST /api/blocking/sync
 *
 * Receives the iOS app's active/scheduled blocking sessions and upserts them into
 * `blocking_sessions` so the web app and Chrome extension can enforce blocking
 * during iOS focus sessions. The iOS app is a guest/local client with no Supabase
 * JWT, so it authenticates with the shared RESIN_SYNC_KEY (same model as
 * /api/notes/sync).
 *
 * Body: {
 *   email: string,
 *   api_key: string,
 *   sessions: Array<{ id, title?, start_time, end_time, is_active?, status? }>
 * }
 * Response: { synced: number, blocked_domains: string[], user_id: string }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, RESIN_SYNC_KEY, resolveUserIdByEmail } from '$lib/server/auth';

interface IncomingSession {
	id: string;
	title?: string;
	start_time: string;
	end_time: string;
	is_active?: boolean;
	status?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; sessions?: IncomingSession[] };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, api_key, sessions } = body;

	if (!api_key || api_key !== RESIN_SYNC_KEY) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}
	if (!email || !email.includes('@')) {
		return json({ error: 'Valid email required' }, { status: 400 });
	}

	const userId = await resolveUserIdByEmail(email.trim().toLowerCase());
	if (!userId) {
		return json({ error: 'Could not resolve account' }, { status: 500 });
	}

	// Read back the user's blocked domains so iOS can display them (iOS enforces
	// app blocking via FamilyControls; domain blocking is a web/extension concern).
	const { data: profile } = await adminClient
		.from('profiles')
		.select('blocked_domains')
		.eq('id', userId)
		.maybeSingle();
	const blocked_domains: string[] = profile?.blocked_domains ?? [];

	const list = Array.isArray(sessions) ? sessions : [];
	if (list.length === 0) {
		return json({ synced: 0, blocked_domains, user_id: userId });
	}

	const now = new Date().toISOString();
	const rows = list
		.filter((s) => s && s.id && s.start_time && s.end_time)
		.map((s) => ({
			id: s.id,
			user_id: userId,
			title: s.title ?? 'Focus Session',
			start_time: s.start_time,
			end_time: s.end_time,
			status: s.status ?? 'active',
			is_active: s.is_active ?? true,
			device_scheduled: true, // iOS schedules enforcement locally via DeviceActivity
			created_by: 'ios',
			updated_at: now
		}));

	if (rows.length === 0) {
		return json({ synced: 0, blocked_domains, user_id: userId });
	}

	let synced = 0;
	const { data: upserted, error } = await adminClient
		.from('blocking_sessions')
		.upsert(rows, { onConflict: 'id' })
		.select('id');

	if (error) {
		// Gracefully retry without optional columns that may not exist in the schema.
		console.error('[blocking/sync] upsert failed, retrying minimal:', error.message);
		const minimal = rows.map(({ device_scheduled: _d, created_by: _c, updated_at: _u, ...rest }) => rest);
		const { data: fallback, error: fallbackError } = await adminClient
			.from('blocking_sessions')
			.upsert(minimal, { onConflict: 'id' })
			.select('id');
		if (fallbackError) {
			return json({ error: 'Failed to sync sessions', details: fallbackError.message }, { status: 500 });
		}
		synced = fallback?.length ?? 0;
	} else {
		synced = upserted?.length ?? 0;
	}

	return json({ synced, blocked_domains, user_id: userId });
};
