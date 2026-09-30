import { json } from '@sveltejs/kit';
import { isPermanentAPNsTokenFailure, sendPushWithResult } from '$lib/services/apns';
import type { RequestEvent } from '@sveltejs/kit';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { adminClient } from '$lib/server/auth';

const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 480;
const MAX_TITLE_LENGTH = 120;
const MAX_REQUEST_BODY_LENGTH = 8_000;
const MAX_FOCUS_PUSH_DEVICE_TOKENS = 200;
const ACTIVE_DEVICE_WINDOW_MS = 10 * 60 * 1000;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_JWT_LENGTH = 8192;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

function sanitizeFocusTitle(value: unknown): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
        : '';
}

async function getAuthenticatedUser(request: Request, locals: RequestEvent['locals']) {
    const authHeader = request.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (jwt) {
        if (jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) return null;

        const { data: { user }, error } = await adminClient.auth.getUser(jwt);
        if (error || !user) return null;
        return user;
    }

    const session = await locals.getSession();
    if (session?.user) return session.user;
    return null;
}

export const POST = async ({ request, locals }: RequestEvent) => {
    const headers = responseHeaders(request);
    // 1. Auth: web uses cookies; extension/iOS can use a verified Bearer JWT.
    const user = await getAuthenticatedUser(request, locals);
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    // 2. Parse body
    let body: {
        title: string;
        durationMinutes: number;
        startTime?: string; // ISO string
        groupId?: string; // Optional for group focus sessions
    };
    try {
        body = await readBoundedJsonBody<typeof body>(request, MAX_REQUEST_BODY_LENGTH);
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400;
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers });
    }

    const { title, durationMinutes, startTime, groupId } = body;
    const safeTitle = sanitizeFocusTitle(title);
    const safeGroupId = typeof groupId === 'string' ? groupId.trim() : '';

    if (!safeTitle || !durationMinutes) {
        return json({ error: 'title and durationMinutes are required' }, { status: 400, headers });
    }
    if (
        !Number.isFinite(durationMinutes) ||
        durationMinutes < MIN_FOCUS_MINUTES ||
        durationMinutes > MAX_FOCUS_MINUTES
    ) {
        return json({ error: `durationMinutes must be between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES}` }, { status: 400, headers });
    }

    const start = startTime ? new Date(startTime) : new Date();
    if (!Number.isFinite(start.getTime())) {
        return json({ error: 'Invalid startTime' }, { status: 400, headers });
    }
    if (safeGroupId && !UUID_RE.test(safeGroupId)) {
        return json({ error: 'Invalid group id' }, { status: 400, headers });
    }
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const sessionId = crypto.randomUUID();

    // The service-role client bypasses RLS, so membership must be checked.
    // Group membership alone is not consent to activate protection for every
    // member; each participant must start protection on their own account.
    const userIds = [user.id];
    if (safeGroupId) {
        const { data: membership, error: membershipError } = await adminClient
            .from('focus_group_members')
            .select('user_id')
            .eq('group_id', safeGroupId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (membershipError) {
            console.error('[api/focus] Group membership lookup failed');
            return json({ error: 'Failed to verify focus group' }, { status: 500, headers });
        }
        if (!membership) {
            return json({ error: 'Not a member of this group' }, { status: 403, headers });
        }
    }

    try {
        // Validate push fanout before creating any session rows. Returning after
        // insertion would leave active group sessions behind while the caller
        // sees an error and may retry, creating duplicate protection windows.
        const { data: devices, error: devicesError } = await adminClient
            .from('device_tokens')
            .select('token, user_id')
            .in('user_id', userIds)
            .eq('device_type', 'ios')
            .eq('is_active', true)
            .limit(MAX_FOCUS_PUSH_DEVICE_TOKENS + 1);
        if (devicesError) {
            console.error('[api/focus] Device lookup failed');
        }
        if ((devices?.length ?? 0) > MAX_FOCUS_PUSH_DEVICE_TOKENS) {
            return json({ error: 'Too many device tokens to notify at once' }, { status: 413, headers });
        }

        // 3. Insert only the caller's blocking session. Other group members
        // opt in independently through their own authenticated session.
        const sessionsToInsert = userIds.map((userId, index) => ({
            id: index === 0 && userId === user.id ? sessionId : crypto.randomUUID(),
            user_id: userId,
            title: safeTitle,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            is_active: true,
            device_scheduled: false
        }));
        const { data: insertedSessions, error } = await adminClient
            .from('blocking_sessions')
            .insert(sessionsToInsert)
            .select('id, user_id, title, start_time, end_time, is_active, device_scheduled');

        if (error) throw error;
        const primarySession = insertedSessions?.find(session => session.user_id === user.id) ?? insertedSessions?.[0];
        if (!primarySession) throw new Error('Focus session not created');
        const sessionsByUserId = new Map(insertedSessions.map(session => [session.user_id, session]));

        // 5. Check whether the caller also has a recently active extension.
        const { count: recentUserExtensionDeviceCount, error: extensionDeviceError } = await adminClient
            .from('device_tokens')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('device_type', 'extension')
            .eq('is_active', true)
            .gte('last_used_at', new Date(Date.now() - ACTIVE_DEVICE_WINDOW_MS).toISOString());
        if (extensionDeviceError) {
            console.error('[api/focus] Extension device lookup failed');
        }

        // 6. Send silent push notification to iOS devices
        // This will trigger the blocking session to activate on the device immediately
        let notificationsSent = 0;
        if (devices && devices.length > 0) {
            const pushPromises = devices.map(async (device) => {
                const deviceSession = sessionsByUserId.get(device.user_id) ?? primarySession;
                const result = await sendPushWithResult(device.token, {
                    title: 'Focus session',
                    body: 'Focus session started',
                    pushType: 'background',
                    data: {
                        type: 'focus_session_start',
                        sessionId: deviceSession.id,
                        startTime: deviceSession.start_time,
                        endTime: deviceSession.end_time
                    }
                });
                return { token: device.token, success: result.success, permanentFailure: isPermanentAPNsTokenFailure(result) };
            });

            const results = await Promise.allSettled(pushPromises);
            const permanentlyFailedTokens = results
                .filter((r): r is PromiseFulfilledResult<{ token: string; success: boolean; permanentFailure: boolean }> =>
                    r.status === 'fulfilled' && r.value.permanentFailure
                )
                .map(r => r.value.token);
            if (permanentlyFailedTokens.length > 0) {
                await adminClient
                    .from('device_tokens')
                    .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
                    .in('token', permanentlyFailedTokens)
                    .in('user_id', userIds);
            }
            notificationsSent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        }

        console.log('[api/focus] Focus session created; device wake attempted.');

        return json({
            status: 'success',
            session: primarySession,
            notificationsSent,
            extensionDevicesPresent: (recentUserExtensionDeviceCount || 0) > 0
        }, { headers });

    } catch {
        console.error('[api/focus] Session creation failed');
        return json({ error: 'Failed to create focus session' }, { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }: RequestEvent) => browserCorsOptions(request);
