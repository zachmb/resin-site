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
 *   release_all_ios_sessions?: boolean,
 *   sessions: Array<{ id, title?, start_time, end_time, is_active?, status? }>
 * }
 * Response: { synced: number, blocked_domains: string[], active_sessions: Array<...> }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, isValidResinSyncKey, normalizeEmail, resolveExistingUserIdByEmail, userHasProAccess } from '$lib/server/auth';
import { getUserBlockedDomains } from '$lib/server/blockingDomains';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

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
const MAX_PAST_START_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_START_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_TITLE_LENGTH = 120;
const MAX_REQUEST_BODY_LENGTH = 64_000;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = new Set(['active', 'scheduled', 'completed', 'canceled']);
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

function parseValidDate(value: string): Date | null {
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? date : null;
}

function sanitizeSessionTitle(value: unknown): string {
	if (typeof value !== 'string') return 'Focus Session';
	const safe = value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
	return safe || 'Focus Session';
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
		.eq('created_by', 'ios')
		.lte('start_time', nowIso)
		.gt('end_time', nowIso);

	if (incomingIds.length > 0) {
		query = query.not('id', 'in', `(${incomingIds.join(',')})`);
	}

	const { error } = await query;
	if (error) {
		// Older deployments may not have device_scheduled/updated_at yet. Sync
		// must still succeed; stale cleanup will activate once the migration lands.
		console.error('[blocking/sync] stale iOS session cleanup skipped');
	}
}

async function deactivateAllIOSRows(userId: string, nowIso: string) {
	const { error } = await adminClient
		.from('blocking_sessions')
		.update({
			is_active: false,
			status: 'canceled',
			updated_at: nowIso
		})
		.eq('user_id', userId)
		.eq('is_active', true)
		.eq('device_scheduled', true)
		.eq('created_by', 'ios');

	if (error) {
		console.error('[blocking/sync] all iOS session cleanup failed');
		return false;
	}
	return true;
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
		console.error('[blocking/sync] active session lookup failed');
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

async function markIOSDevicesSeenForActiveSync(userId: string, syncedRows: Array<{ is_active: boolean; start_time: string; end_time: string }>, nowIso: string) {
	const hasCurrentActiveIOSSession = syncedRows.some((row) =>
		row.is_active &&
		row.start_time <= nowIso &&
		row.end_time > nowIso
	);
	if (!hasCurrentActiveIOSSession) return;

	const { error } = await adminClient
		.from('device_tokens')
		.update({
			last_used_at: nowIso,
			is_active: true,
			updated_at: nowIso
		})
		.eq('user_id', userId)
		.eq('device_type', 'ios')
		.eq('is_active', true);
	if (error) {
		console.warn('[blocking/sync] iOS device freshness update skipped');
	}
}

export const POST: RequestHandler = async ({ request }) => {
	let body: {
		email?: string;
		api_key?: string;
		sessions?: IncomingSession[];
		release_stale_ios_sessions?: boolean;
		release_all_ios_sessions?: boolean;
	};
	try {
		body = await readBoundedJsonBody<typeof body>(request, MAX_REQUEST_BODY_LENGTH);
	} catch (error) {
		const status = error instanceof RequestBodyError ? error.status : 400;
		return json({
			error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
		}, { status, headers: NO_STORE_HEADERS });
	}

	const { email, api_key, sessions } = body;
	const releaseStaleIOSSessionRows = body.release_stale_ios_sessions === true;
	const releaseAllIOSSessionRows = body.release_all_ios_sessions === true;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401, headers: NO_STORE_HEADERS });
	}
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return json({ error: 'Valid email required' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const userId = await resolveExistingUserIdByEmail(normalizedEmail);
	if (!userId) {
		return json({ synced: 0, blocked_domains: [], active_sessions: [] }, { headers: NO_STORE_HEADERS });
	}

	const list = Array.isArray(sessions) ? sessions : [];
	if (list.length > MAX_SYNC_SESSIONS) {
		return json({ error: `Too many sessions. Max ${MAX_SYNC_SESSIONS} per sync.` }, { status: 413, headers: NO_STORE_HEADERS });
	}
	if (releaseAllIOSSessionRows && list.length > 0) {
		return json({ error: 'Full release cannot include sessions' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const now = new Date();
	const nowIso = now.toISOString();
	if (releaseAllIOSSessionRows) {
		const released = await deactivateAllIOSRows(userId, nowIso);
		if (!released) {
			return json({ error: 'Failed to release sessions' }, { status: 500, headers: NO_STORE_HEADERS });
		}
	}
	if (!(await userHasProAccess(userId))) {
		if (releaseAllIOSSessionRows) {
			return json({ synced: 0, blocked_domains: [], active_sessions: [] }, { headers: NO_STORE_HEADERS });
		}
		return json({
			error: 'Pro required',
			code: 'PRO_REQUIRED',
			message: 'Web and extension blocking sync require Resin Pro.'
		}, { status: 402, headers: NO_STORE_HEADERS });
	}

	// Read back the user's merged custom/legacy blocked domains so iOS can
	// display the same protection list the web app and extension enforce.
	const blocked_domains = await getUserBlockedDomains(userId);

	const rows = list
		.map((s) => {
			if (!s || typeof s.id !== 'string' || !SESSION_ID_RE.test(s.id) || !s.start_time || !s.end_time) return null;
			const start = parseValidDate(s.start_time);
			const end = parseValidDate(s.end_time);
			if (!start || !end) return null;
			const startDeltaMs = start.getTime() - now.getTime();
			if (startDeltaMs < -MAX_PAST_START_MS || startDeltaMs > MAX_FUTURE_START_MS) return null;
			const durationMs = end.getTime() - start.getTime();
			if (durationMs <= 0 || durationMs > MAX_SESSION_WINDOW_MS) return null;
			const title = sanitizeSessionTitle(s.title);
			const status = typeof s.status === 'string' && ALLOWED_STATUSES.has(s.status)
				? s.status
				: 'active';
			const isActive = s.is_active ?? (status === 'active' || status === 'scheduled');
			return {
				id: s.id,
				user_id: userId,
				title,
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				status,
				is_active: isActive,
				device_scheduled: isActive, // iOS schedules enforcement locally only for active/scheduled windows
				created_by: 'ios',
				updated_at: nowIso
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null);

	const incomingIds = rows.map((row) => row.id);
	if (releaseStaleIOSSessionRows && !releaseAllIOSSessionRows) {
		await deactivateStaleIOSRows(userId, incomingIds, nowIso);
	}

	if (rows.length === 0) {
		const active_sessions = await getActiveSessions(userId, nowIso);
		return json({ synced: 0, blocked_domains, active_sessions }, { headers: NO_STORE_HEADERS });
	}

	const { data: existingRows, error: existingError } = await adminClient
		.from('blocking_sessions')
		.select('id, user_id')
		.in('id', incomingIds);
	if (existingError) {
		console.error('[blocking/sync] ownership check failed');
		return json({ error: 'Failed to verify sessions' }, { status: 500, headers: NO_STORE_HEADERS });
	}
	const foreignSession = existingRows?.find((row) => row.user_id !== userId);
	if (foreignSession) {
		return json({ error: 'Session conflict' }, { status: 409, headers: NO_STORE_HEADERS });
	}

	const existingIds = new Set((existingRows ?? []).map((row) => row.id));
	const newRows = rows.filter((row) => !existingIds.has(row.id));
	const ownedRows = rows.filter((row) => existingIds.has(row.id));
	let synced = 0;

	if (newRows.length > 0) {
		const { data: inserted, error } = await adminClient
			.from('blocking_sessions')
			.insert(newRows)
			.select('id');

		if (error) {
			// Gracefully retry without optional columns that may not exist in the schema.
			console.error('[blocking/sync] insert failed, retrying minimal');
			const minimal = newRows.map(({ device_scheduled: _d, created_by: _c, updated_at: _u, ...rest }) => rest);
			const { data: fallback, error: fallbackError } = await adminClient
				.from('blocking_sessions')
				.insert(minimal)
				.select('id');
			if (fallbackError) {
				console.error('[blocking/sync] minimal insert failed');
				return json({ error: 'Failed to sync sessions' }, { status: 500, headers: NO_STORE_HEADERS });
			}
			synced += fallback?.length ?? 0;
		} else {
			synced += inserted?.length ?? newRows.length;
		}
	}

	for (const row of ownedRows) {
		const { id, user_id: _userId, ...updates } = row;
		const { data: updated, error: updateError } = await adminClient
			.from('blocking_sessions')
			.update(updates)
			.eq('id', id)
			.eq('user_id', userId)
			.select('id')
			.maybeSingle();

		if (updateError) {
			console.error('[blocking/sync] scoped update failed');
			return json({ error: 'Failed to sync sessions' }, { status: 500, headers: NO_STORE_HEADERS });
		}
		if (updated) synced += 1;
	}

	await markIOSDevicesSeenForActiveSync(userId, rows, nowIso);
	const active_sessions = await getActiveSessions(userId, nowIso);
	return json({ synced, blocked_domains, active_sessions }, { headers: NO_STORE_HEADERS });
};
