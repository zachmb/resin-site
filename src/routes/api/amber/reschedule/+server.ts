import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { getGoogleAccessToken, updateCalendarEvent } from '$lib/amber_service';
import type { RequestEvent } from '@sveltejs/kit';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

export const POST = async ({ request }: RequestEvent) => {
    const authHeader = request.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Authenticate user
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        // 2. Parse request body
        const body = await request.json();
        const { task_id, new_start_time, new_end_time } = body;

        console.log('[api/amber/reschedule] Request:', { task_id, new_start_time, new_end_time, userId: user.id });

        if (!task_id || !new_start_time || !new_end_time) {
            return json(
                { error: 'Missing required fields: task_id, new_start_time, new_end_time' },
                { status: 400 }
            );
        }

        // 3. Fetch task with session info to verify ownership and get title
        const { data: taskData, error: taskError } = await admin
            .from('amber_tasks')
            .select('id, title, calendar_event_id, start_time, end_time, amber_session_id, amber_sessions!amber_session_id(user_id, display_title)')
            .eq('id', task_id)
            .single();

        console.log('[api/amber/reschedule] Task fetch:', { taskError, taskData: taskData ? { id: taskData.id, title: taskData.title } : null });

        if (taskError || !taskData) {
            return json({ error: 'Task not found' }, { status: 404 });
        }

        // Verify user owns this task
        const session = (taskData as any).amber_sessions;
        if (session?.user_id !== user.id) {
            return json({ error: 'Permission denied' }, { status: 403 });
        }

        // 4. Determine timezone from profile
        const { data: profile } = await admin
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .single();

        const timezone = profile?.timezone ?? 'America/New_York';

        // 5. Update calendar event if it exists
        let calendar_warning = false;
        if (taskData.calendar_event_id) {
            try {
                console.log('[api/amber/reschedule] Updating calendar event:', taskData.calendar_event_id);
                const gToken = await getGoogleAccessToken(user.id);
                const success = await updateCalendarEvent(
                    gToken,
                    taskData.calendar_event_id,
                    taskData.title,
                    new_start_time,
                    new_end_time,
                    timezone
                );
                console.log('[api/amber/reschedule] Calendar update result:', success);
                if (!success) {
                    calendar_warning = true;
                }
            } catch (calErr) {
                console.warn('[api/amber/reschedule] Calendar update warning:', calErr);
                calendar_warning = true;
            }
        } else {
            console.log('[api/amber/reschedule] No calendar event ID, skipping calendar update');
        }

        // 6. Update task times in Supabase
        console.log('[api/amber/reschedule] Updating task in database');
        const { data: updatedTask, error: updateError } = await admin
            .from('amber_tasks')
            .update({
                start_time: new_start_time,
                end_time: new_end_time,
                updated_at: new Date().toISOString(),
            })
            .eq('id', task_id)
            .select()
            .single();

        console.log('[api/amber/reschedule] Database update result:', { updateError: updateError ? updateError.message : 'success', updatedTask: updatedTask ? { id: updatedTask.id } : null });

        if (updateError) {
            console.error('[api/amber/reschedule] Database update error:', updateError);
            throw updateError;
        }

        console.log(`[api/amber/reschedule] Successfully rescheduled task ${task_id} for user ${user.id}`);
        return json({
            success: true,
            task: updatedTask,
            calendar_warning,
        });
    } catch (err) {
        console.error('[api/amber/reschedule] Error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[api/amber/reschedule] Stack:', err instanceof Error ? err.stack : 'no stack');
        return json({ error: errorMessage }, { status: 500 });
    }
};
