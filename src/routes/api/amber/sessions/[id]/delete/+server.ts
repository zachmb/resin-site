import { json } from '@sveltejs/kit';
import { getGoogleAccessToken, deleteCalendarEvent } from '$lib/services/amber';
import { syncStonesFromNotes } from '$lib/services/gamification';
import type { RequestEvent } from '@sveltejs/kit';
import { adminClient } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MAX_JWT_LENGTH = 8192;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

/**
 * POST /api/amber/sessions/[id]/delete
 * 
 * Securely deletes an Amber session and cleans up associated resources.
 * Handles:
 * 1. Database deletion (RLS bypass via admin client)
 * 2. Calendar event removal
 * 3. Stone count recalculation
 */
export const POST = async ({ params, request, setHeaders }: RequestEvent) => {
    const headers = responseHeaders(request);
    setHeaders(NO_STORE_HEADERS);

    const sessionId = params.id;
    const authHeader = request.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers });
    }
    if (!sessionId || !UUID_RE.test(sessionId)) {
        return json({ error: 'Invalid session ID' }, { status: 400, headers });
    }

    // 1. Authenticate user
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401, headers });
    }

    try {
        // 2. Fetch session and tasks to find calendar events
        const { data: sessionData, error: sessionFetchError } = await adminClient
            .from('amber_sessions')
            .select('id, amber_tasks(calendar_event_id)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (sessionFetchError || !sessionData) {
            return json({ error: 'Session not found or permission denied' }, { status: 404, headers });
        }

        // 3. Capture Calendar events before deleting the session
        const calendarEventIds = new Set<string>();
        if (sessionData.amber_tasks) {
            sessionData.amber_tasks.forEach((t: any) => {
                if (t.calendar_event_id) calendarEventIds.add(t.calendar_event_id);
            });
        }

        // 4. Delete from database before performing irreversible external cleanup
        const { error: deleteError, count } = await adminClient
            .from('amber_sessions')
            .delete({ count: 'exact' })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[api/amber/delete] Database delete error');
            throw deleteError;
        }

        if (count === 0) {
            console.warn('[api/amber/delete] No matching session found to delete');
            return json({ error: 'Session not found or already deleted' }, { status: 404, headers });
        }

        // 5. Clean up Calendar events only after the owned session was deleted
        if (calendarEventIds.size > 0) {
            try {
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch {
                console.warn('[api/amber/delete] Calendar cleanup warning');
            }
        }

        // 6. Recalculate stones (1 note = 1 stone) to ensure count decrements
        await syncStonesFromNotes(user.id, { force: true });

        console.log('[api/amber/delete] Session deleted');
        return json({ success: true, message: 'Session deleted successfully' }, { headers });
    } catch {
        console.error('[api/amber/delete] Error');
        return json({ error: 'Failed to delete session' }, { status: 500, headers });
    }
}

export const OPTIONS = async ({ request }: RequestEvent) => browserCorsOptions(request);
