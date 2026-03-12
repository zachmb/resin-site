import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { getGoogleAccessToken, deleteCalendarEvent } from '$lib/amber_service';
import { syncStonesFromNotes } from '$lib/gamification_service';
import type { RequestEvent } from '@sveltejs/kit';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

/**
 * POST /api/amber/sessions/[id]/delete
 * 
 * Securely deletes an Amber session and cleans up associated resources.
 * Handles:
 * 1. Database deletion (RLS bypass via admin client)
 * 2. Calendar event removal
 * 3. Stone count recalculation
 */
export const POST = async ({ params, request }: RequestEvent) => {
    const sessionId = params.id;
    const authHeader = request.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt || !sessionId) {
        return json({ error: 'Unauthorized or missing session ID' }, { status: 401 });
    }

    // 1. Authenticate user
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        // 2. Fetch session and tasks to find calendar events
        const { data: sessionData, error: sessionFetchError } = await admin
            .from('amber_sessions')
            .select('*, amber_tasks(calendar_event_id)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionFetchError || !sessionData) {
            return json({ error: 'Session not found or permission denied' }, { status: 404 });
        }

        // 3. Clean up Calendar events
        const calendarEventIds = new Set<string>();
        if (sessionData.amber_tasks) {
            sessionData.amber_tasks.forEach((t: any) => {
                if (t.calendar_event_id) calendarEventIds.add(t.calendar_event_id);
            });
        }

        if (calendarEventIds.size > 0) {
            try {
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch (calErr) {
                console.warn('[api/amber/delete] Calendar cleanup warning (token might be missing):', calErr);
                // We proceed with DB deletion anyway
            }
        }

        // 4. Delete from database
        const { error: deleteError } = await admin
            .from('amber_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // 5. Recalculate stones (1 note = 1 stone) to ensure count decrements
        await syncStonesFromNotes(user.id);

        return json({ success: true, message: 'Session deleted successfully' });
    } catch (err) {
        console.error('[api/amber/delete] Error:', err);
        return json({ error: String(err) }, { status: 500 });
    }
}
