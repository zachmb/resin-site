import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { adminClient } from '$lib/server/auth';
import { createHash } from 'crypto';

const PAT_RE = /^(?:resin_oclaw_[0-9a-f]{64}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const MAX_RETURNED_CONTENT_CHARS = 6000;
const MAX_RETURNED_TITLE_CHARS = 160;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    Vary: 'Authorization',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400'
};
const DEFAULT_FOCUS_WINDOW = { start: '16:00', end: '22:00' };

function timeFromHour(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) return null;
    return `${String(value).padStart(2, '0')}:00`;
}

function focusWindowForToday(schedule: unknown): { start: string; end: string } {
    if (!Array.isArray(schedule)) return DEFAULT_FOCUS_WINDOW;

    const today = schedule[new Date().getDay()] as { start?: unknown; end?: unknown } | undefined;
    const start = timeFromHour(today?.start);
    const end = timeFromHour(today?.end);
    if (!start || !end || end <= start) return DEFAULT_FOCUS_WINDOW;

    return { start, end };
}

function safeScheduleText(value: unknown, fallback = ''): string {
    if (typeof value !== 'string') return fallback;
    return value
        .replace(CONTROL_CHARS_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function hashAccessToken(token: string): string {
    return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

export const GET = async ({ request }: RequestEvent) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ error: 'Missing or invalid Authorization header (Bearer token required)' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const token = authHeader.slice(7).trim();

    if (!PAT_RE.test(token)) {
        return json({ error: 'Invalid access token' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    // 1. Authenticate Request via a one-way PAT digest.
    let { data: profile, error } = await adminClient
        .from('profiles')
        .select('id, sync_notes, availability_schedule')
        .eq('openclaw_api_key', hashAccessToken(token))
        .maybeSingle();

    // Migrate previously issued plaintext tokens after their next valid use.
    if (!error && !profile) {
        const legacyLookup = await adminClient
            .from('profiles')
            .select('id, sync_notes, availability_schedule')
            .eq('openclaw_api_key', token)
            .maybeSingle();
        profile = legacyLookup.data;
        error = legacyLookup.error;
        if (!error && profile) {
            const { error: migrationError } = await adminClient
                .from('profiles')
                .update({ openclaw_api_key: hashAccessToken(token) })
                .eq('id', profile.id)
                .eq('openclaw_api_key', token);
            if (migrationError) {
                console.error('[schedule] Legacy access token migration failed');
                return json({ error: 'Failed to authenticate access token' }, { status: 500, headers: NO_STORE_HEADERS });
            }
        }
    }

    if (error) {
        console.error('[schedule] Access token lookup failed');
        return json({ error: 'Failed to retrieve schedule' }, { status: 500, headers: NO_STORE_HEADERS });
    }
    if (!profile) {
        return json({ error: 'Unauthorized: Invalid access token' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    // 2. Fetch the user's latest focus notes to return as the schedule context
    // Do not share note content with third-party PAT clients unless explicitly enabled.
    const syncEnabled = profile.sync_notes === true;

    let recentSessions: any[] = [];
    if (syncEnabled) {
        const { data: notes, error: notesError } = await adminClient
            .from('amber_sessions')
            .select('id, display_title, title, raw_text, created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (notesError) {
            return json({ error: 'Failed to retrieve schedule' }, { status: 500, headers: NO_STORE_HEADERS });
        }
        recentSessions = (notes || []).map((note: any) => ({
            id: note.id,
            title: safeScheduleText(note.display_title ?? note.title, 'Untitled').slice(0, MAX_RETURNED_TITLE_CHARS),
            content: safeScheduleText(note.raw_text).slice(0, MAX_RETURNED_CONTENT_CHARS),
            created_at: note.created_at
        }));
    }

    // 3. Return the user's focus schedule for OpenCLAW integration
    return json({
        status: "success",
        user: {
            focus_window: focusWindowForToday(profile.availability_schedule)
        },
        openclaw_integrated: true,
        sync_enabled: syncEnabled,
        recent_focus_sessions: recentSessions
    }, { headers: NO_STORE_HEADERS });
};

export const OPTIONS = async () => new Response(null, {
    status: 204,
    headers: NO_STORE_HEADERS
});
