import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { isPermanentAPNsTokenFailure, sendPushWithResult } from '$lib/services/apns';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BODY_LENGTH = 4_000;
const MAX_PUSH_DEVICE_TOKENS = 200;

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

/**
 * Send silent push notification to iOS devices when focus session starts
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        let body: { sessionId?: unknown; groupId?: unknown };
        try {
            body = await readBoundedJsonBody<{ sessionId?: unknown; groupId?: unknown }>(
                event.request,
                MAX_REQUEST_BODY_LENGTH
            );
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({
                error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status, headers });
        }

        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';

        if (!sessionId) {
            return json(
                { error: 'Missing required fields' },
                { status: 400, headers }
            );
        }
        if (!UUID_RE.test(sessionId) || (groupId && !UUID_RE.test(groupId))) {
            return json({ error: 'Invalid id' }, { status: 400, headers });
        }

        // Group membership is not consent to wake or activate every member's
        // devices. A participant may only dispatch their own session push.
        const userIds = [userId];

        if (groupId) {
            // Only allow broadcasting to a group the caller actually belongs to.
            const { data: membership, error: membershipError } = await supabase
                .from('focus_group_members')
                .select('user_id')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .maybeSingle();
            if (membershipError) {
                console.error('[notifications/send-focus-session] Group membership lookup failed');
                return json({ error: 'Failed to verify focus group' }, { status: 500, headers });
            }
            if (!membership) {
                return json({ error: 'Not a member of this group' }, { status: 403, headers });
            }

        }

        const { data: focusSession, error: sessionError } = await supabase
            .from('blocking_sessions')
            .select('id, user_id, title, start_time, end_time')
            .eq('id', sessionId)
            .in('user_id', userIds)
            .maybeSingle();
        if (sessionError) {
            console.error('[notifications/send-focus-session] Session verification failed');
            return json({ error: 'Failed to verify focus session' }, { status: 500, headers });
        }
        if (!focusSession) {
            return json({ error: 'Focus session not found for this account or group' }, { status: 404, headers });
        }

        const parsedStart = new Date(focusSession.start_time);
        const parsedEnd = new Date(focusSession.end_time);
        if (!Number.isFinite(parsedEnd.getTime()) || !Number.isFinite(parsedStart.getTime()) || parsedEnd <= parsedStart) {
            console.error('[notifications/send-focus-session] Stored session has invalid time window');
            return json({ error: 'Invalid session time window' }, { status: 500, headers });
        }

        const { data: memberSessions, error: memberSessionsError } = groupId
            ? await supabase
                .from('blocking_sessions')
                .select('id, user_id, start_time, end_time')
                .in('user_id', userIds)
                .eq('title', focusSession.title)
                .eq('start_time', focusSession.start_time)
                .eq('end_time', focusSession.end_time)
            : { data: [focusSession], error: null };

        if (memberSessionsError || !memberSessions) {
            console.error('[notifications/send-focus-session] Member session lookup failed');
            return json({ error: 'Failed to verify focus sessions' }, { status: 500, headers });
        }
        const sessionsByUserId = new Map(memberSessions.map(session => [session.user_id, session]));

        // Get all active iOS device tokens for these users
        const { data: devices, error: devicesError } = await supabase
            .from('device_tokens')
            .select('token, user_id')
            .in('user_id', userIds)
            .eq('device_type', 'ios')
            .eq('is_active', true)
            .limit(MAX_PUSH_DEVICE_TOKENS + 1);

        if (devicesError || !devices) {
            console.error('[notifications/send-focus-session] Device lookup failed');
            return json({
                success: false,
                notificationsSent: 0,
                recoverable: true,
                error: 'Could not load device tokens. Session can continue, but protection may be waiting for device sync.'
            }, { status: 503, headers });
        }
        if (devices.length > MAX_PUSH_DEVICE_TOKENS) {
            return json({
                success: false,
                notificationsSent: 0,
                recoverable: true,
                error: 'Too many device tokens to notify at once.'
            }, { status: 413, headers });
        }

        // Send silent push notifications to all devices
        const targetDevices = groupId
            ? devices.filter(device => sessionsByUserId.has(device.user_id))
            : devices;

        const notifications = await Promise.allSettled(
            targetDevices.map(device => {
                const deviceSession = sessionsByUserId.get(device.user_id) ?? focusSession;
                return sendAPNSNotification(
                    device.token,
                    {
                        sessionId: deviceSession.id,
                        startTime: deviceSession.start_time,
                        endTime: deviceSession.end_time,
                        type: 'focus_session_start'
                    }
                );
            })
        );

        const permanentlyFailedTokens = notifications
            .filter((n): n is PromiseFulfilledResult<{ token: string; permanentFailure: boolean }> =>
                n.status === 'fulfilled' && n.value.permanentFailure
            )
            .map(n => n.value.token);
        if (permanentlyFailedTokens.length > 0) {
            await supabase
                .from('device_tokens')
                .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
                .in('token', permanentlyFailedTokens)
                .in('user_id', userIds);
        }

        const callerDeviceTokens = new Set(
            targetDevices
                .filter(device => device.user_id === userId)
                .map(device => device.token)
        );
        const successful = notifications.filter(n =>
            n.status === 'fulfilled' && !n.value.permanentFailure && (
                !groupId || callerDeviceTokens.has(n.value.token)
            )
        ).length;

        // Log notification attempt
        console.log('[Focus Session Push] Device wake attempted');

        return json({
            success: true,
            notificationsSent: successful
        }, { headers });
    } catch {
        console.error('[notifications/send-focus-session] Push dispatch failed');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);

/**
 * Send a silent push notification via Apple Push Notification service
 */
async function sendAPNSNotification(
    token: string,
    payload: {
        sessionId: string;
        startTime: string;
        endTime: string;
        type: string;
    }
): Promise<{ token: string; permanentFailure: boolean }> {
    const result = await sendPushWithResult(token, {
        title: 'Focus session',
        body: 'Focus session started',
        pushType: 'background',
        data: payload
    });

    if (!result.success) {
        if (isPermanentAPNsTokenFailure(result)) {
            return { token, permanentFailure: true };
        }
        throw new Error('APNs push failed');
    }

    return { token, permanentFailure: false };
}
