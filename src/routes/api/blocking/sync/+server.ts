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
 *   release_stale_ios_sessions?: boolean,
 *   sessions: Array<{ id, title?, start_time, end_time, is_active?, status? }>
 * }
 * Response: { synced: number, blocked_domains: string[], active_sessions: Array<...>, user_id: string }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, isValidResinSyncKey, resolveUserIdByEmail, userHasProAccess } from '$lib/server/auth';

interface IncomingSession {
	id: string;
	title?: string;
	start_time: string;
	end_time: string;
	is_active?: boolean;
	status?: string;
}

interface OutgoingSession {
	id: string;
	title: string;
	start_time: string;
	end_time: string;
	is_active: boolean;
	device_scheduled: boolean;
}

const MAX_SYNC_SESSIONS = 50;
const MAX_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseValidDate(value: string): Date | null {
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? date : null;
}

async function deactivateStaleIOSRows(userId: string, incomingIds: string[], nowIso: string) {
	let query = adminClient
		.from('blocking_sessions')
		.update({
			is_active: false,
			status: 'canceled',
			updated_at: nowIso
		})
		.eq('user_id', userId)
		.eq('is_active', true)
		.eq('device_scheduled', true)
		.gt('end_time', nowIso);

	if (incomingIds.length > 0) {
		query = query.not('id', 'in', `(${incomingIds.join(',')})`);
	}

	const { error } = await query;
	if (error) {
		// Older deployments may not have device_scheduled/updated_at yet. Sync
		// must still succeed; stale cleanup will activate once the migration lands.
		console.error('[blocking/sync] stale iOS session cleanup skipped:', error.message);
	}
}

async function getActiveSessions(userId: string, nowIso: string): Promise<OutgoingSession[]> {
	const { data: activeSessions, error } = await adminClient
		.from('blocking_sessions')
		.select('id, title, start_time, end_time, is_active, device_scheduled')
		.eq('user_id', userId)
		.eq('is_active', true)
		.lte('start_time', nowIso)
		.gt('end_time', nowIso)
		.order('end_time', { ascending: true })
		.limit(10);

	if (error) {
		console.error('[blocking/sync] active session lookup failed:', error.message);
		return [];
	}

	return (activeSessions ?? []).map((session) => ({
		id: session.id,
		title: session.title ?? 'Focus Session',
		start_time: session.start_time,
		end_time: session.end_time,
		is_active: session.is_active ?? true,
		device_scheduled: session.device_scheduled ?? false
	}));
}

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; sessions?: IncomingSession[]; release_stale_ios_sessions?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, api_key, sessions } = body;
	const releaseStaleIOSSessionRows = body.release_stale_ios_sessions === true;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}
	if (!email || !email.includes('@')) {
		return json({ error: 'Valid email required' }, { status: 400 });
	}

	const userId = await resolveUserIdByEmail(email.trim().toLowerCase());
	if (!userId) {
		return json({ error: 'Could not resolve account' }, { status: 500 });
	}
	if (!(await userHasProAccess(userId))) {
		return json({
			error: 'Pro required',
			code: 'PRO_REQUIRED',
			message: 'Web and extension blocking sync require Resin Pro.'
		}, { status: 402 });
	}

	// Read back the user's blocked domains so iOS can display them (iOS enforces
	// app blocking via FamilyControls; domain blocking is a web/extension concern).
	const { data: profile } = await adminClient
		.from('profiles')
		.select('blocked_domains')
		.eq('id', userId)
		.maybeSingle();
	const blocked_domains: string[] = profile?.blocked_domains ?? [];

	const now = new Date();
	const nowIso = now.toISOString();

	const list = Array.isArray(sessions) ? sessions : [];
	if (list.length > MAX_SYNC_SESSIONS) {
		return json({ error: `Too many sessions. Max ${MAX_SYNC_SESSIONS} per sync.` }, { status: 413 });
	}

	const rows = list
		.map((s) => {
			if (!s || typeof s.id !== 'string' || !s.id || !s.start_time || !s.end_time) return null;
			const start = parseValidDate(s.start_time);
			const end = parseValidDate(s.end_time);
			if (!start || !end) return null;
			const durationMs = end.getTime() - start.getTime();
			if (durationMs <= 0 || durationMs > MAX_SESSION_WINDOW_MS) return null;
			return {
				id: s.id,
				user_id: userId,
				title: s.title ?? 'Focus Session',
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				status: s.status ?? 'active',
				is_active: s.is_active ?? true,
				device_scheduled: true, // iOS schedules enforcement locally via DeviceActivity
				created_by: 'ios',
				updated_at: nowIso
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	const incomingIds = rows.map((row) => row.id);
	if (releaseStaleIOSSessionRows) {
		await deactivateStaleIOSRows(userId, incomingIds, nowIso);
	}

	if (rows.length === 0) {
		const active_sessions = await getActiveSessions(userId, nowIso);
		return json({ synced: 0, blocked_domains, active_sessions, user_id: userId });
	}

	const { data: existingRows, error: existingError } = await adminClient
		.from('blocking_sessions')
		.select('id, user_id')
		.in('id', incomingIds);
	if (existingError) {
		console.error('[blocking/sync] ownership check failed:', existingError.message);
		return json({ error: 'Failed to verify sessions' }, { status: 500 });
	}
	const foreignSession = existingRows?.find((row) => row.user_id !== userId);
	if (foreignSession) {
		return json({ error: 'Session id is already owned by another account' }, { status: 409 });
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
			console.error('[blocking/sync] minimal upsert failed:', fallbackError.message);
			return json({ error: 'Failed to sync sessions' }, { status: 500 });
		}
		synced = fallback?.length ?? 0;
	} else {
		synced = upserted?.length ?? 0;
	}

	const active_sessions = await getActiveSessions(userId, nowIso);
	return json({ synced, blocked_domains, active_sessions, user_id: userId });
};
