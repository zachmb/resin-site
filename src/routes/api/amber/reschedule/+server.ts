import { json } from '@sveltejs/kit';
import { getGoogleAccessToken, updateCalendarEvent } from '$lib/services/amber';
import type { RequestEvent } from '@sveltejs/kit';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { adminClient } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MIN_TASK_WINDOW_MS = 60 * 1000;
const MAX_TASK_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUEST_BODY_LENGTH = 8_000;
const MAX_JWT_LENGTH = 8192;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEZONE_RE = /^[A-Za-z0-9_+\-/.]{1,64}$/;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

function validTimezone(value: unknown): string | null {
    if (typeof value !== 'string' || !TIMEZONE_RE.test(value)) return null;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
        return value;
    } catch {
        return null;
    }
}

function logRescheduleIssue(scope: string, error: unknown) {
    const issue = error as { code?: unknown; name?: unknown; message?: unknown; status?: unknown };
    console.error(`[api/amber/reschedule] ${scope}`, {
        code: typeof issue?.code === 'string' ? issue.code : undefined,
        name: typeof issue?.name === 'string' ? issue.name : undefined,
        status: typeof issue?.status === 'number' || typeof issue?.status === 'string' ? issue.status : undefined,
        hasMessage: typeof issue?.message === 'string' && issue.message.length > 0
    });
}

export const POST = async ({ request, setHeaders }: RequestEvent) => {
    const headers = responseHeaders(request);
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    const authHeader = request.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers });
    }

    // 1. Authenticate user
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401, headers });
    }

    try {
        // 2. Parse request body
        const body = await readBoundedJsonBody<{
            task_id?: unknown;
            new_start_time?: unknown;
            new_end_time?: unknown;
            timezone?: unknown;
        }>(request, MAX_REQUEST_BODY_LENGTH);
        const { task_id, new_start_time, new_end_time, timezone: clientTimezone } = body;

        if (!task_id || !new_start_time || !new_end_time) {
            return json(
                { error: 'Missing required fields: task_id, new_start_time, new_end_time' },
                { status: 400, headers }
            );
        }
        if (typeof task_id !== 'string' || !UUID_RE.test(task_id)) {
            return json({ error: 'Invalid task' }, { status: 400, headers });
        }
        const safeNewStartTime = String(new_start_time);
        const safeNewEndTime = String(new_end_time);
        const newStart = new Date(safeNewStartTime);
        const newEnd = new Date(safeNewEndTime);
        const windowMs = newEnd.getTime() - newStart.getTime();
        if (!Number.isFinite(newStart.getTime()) || !Number.isFinite(newEnd.getTime())) {
            return json({ error: 'Invalid task time' }, { status: 400, headers });
        }
        if (windowMs < MIN_TASK_WINDOW_MS || windowMs > MAX_TASK_WINDOW_MS) {
            return json({ error: 'Task window must be between 1 minute and 24 hours' }, { status: 400, headers });
        }

        // 3. Fetch task then verify session ownership
        const { data: taskData, error: taskError } = await adminClient
            .from('amber_tasks')
            .select('id, title, calendar_event_id, start_time, end_time, session_id')
            .eq('id', task_id)
            .maybeSingle();

        if (taskError || !taskData || !(taskData as any).session_id) {
            return json({ error: 'Task not found' }, { status: 404, headers });
        }

        const sessionId = (taskData as any).session_id as string;
        const { data: sessionData, error: sessionError } = await adminClient
            .from('amber_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .maybeSingle();

        if (sessionError || !sessionData) {
            return json({ error: 'Session not found' }, { status: 404, headers });
        }

        if (sessionData.user_id !== user.id) {
            return json({ error: 'Permission denied' }, { status: 403, headers });
        }

        // 4. Determine timezone from profile
        const { data: profile, error: profileError } = await adminClient
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError) {
            logRescheduleIssue('profile_lookup_warning', profileError);
        }

        const timezone = validTimezone(profile?.timezone) ?? validTimezone(clientTimezone) ?? 'UTC';

        // 5. Update task times before changing the external Calendar event
        const { data: updatedTask, error: updateError } = await adminClient
            .from('amber_tasks')
            .update({
                start_time: safeNewStartTime,
                end_time: safeNewEndTime,
                updated_at: new Date().toISOString(),
            })
            .eq('id', task_id)
            .eq('session_id', sessionId)
            .select('id, title, description, estimated_minutes, sequence_order, start_time, end_time, requires_focus, requires_camera_verification, created_at, updated_at')
            .maybeSingle();

        if (updateError || !updatedTask) {
            logRescheduleIssue('task_update_failed', updateError);
            throw updateError ?? new Error('Task update returned no row');
        }

        // 6. Keep Calendar in sync only after the owned task update succeeds
        let calendar_warning = false;
        if (taskData.calendar_event_id) {
            try {
                const gToken = await getGoogleAccessToken(user.id);
                const success = await updateCalendarEvent(
                    gToken,
                    taskData.calendar_event_id,
                    taskData.title,
                    safeNewStartTime,
                    safeNewEndTime,
                    timezone
                );
                if (!success) {
                    calendar_warning = true;
                }
            } catch (calErr) {
                logRescheduleIssue('calendar_update_warning', calErr);
                calendar_warning = true;
            }
        }

        return json({
            success: true,
            task: updatedTask,
            calendar_warning,
        }, { headers });
    } catch (err) {
        if (err instanceof RequestBodyError) {
            return json({
                error: err.status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status: err.status, headers });
        }
        logRescheduleIssue('request_failed', err);
        return json({ error: 'Failed to reschedule task' }, { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }: RequestEvent) => browserCorsOptions(request);
