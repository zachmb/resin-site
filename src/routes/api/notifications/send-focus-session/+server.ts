import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { isPermanentAPNsTokenFailure, sendPushWithResult } from '$lib/services/apns';

/**
 * Send silent push notification to iOS devices when focus session starts
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId, sessionTitle, startTime, endTime, groupId } = await event.request.json();

        if (!sessionId || !endTime) {
            return json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const parsedEnd = new Date(endTime);
        const parsedStart = startTime ? new Date(startTime) : new Date();
        if (!Number.isFinite(parsedEnd.getTime()) || !Number.isFinite(parsedStart.getTime()) || parsedEnd <= parsedStart) {
            return json({ error: 'Invalid session time window' }, { status: 400 });
        }

        // Get all active device tokens for the user and their group members (if group session)
        let userIds = [userId];

        if (groupId) {
            // Only allow broadcasting to a group the caller actually belongs to.
            const { data: membership } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .maybeSingle();
            if (!membership) {
                return json({ error: 'Not a member of this group' }, { status: 403 });
            }

            // Fan out to all members of the group.
            const { data: groupMembers } = await supabase
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId);

            if (groupMembers) {
                userIds = groupMembers.map(m => m.user_id);
            }
        }

        const { data: focusSession, error: sessionError } = await supabase
            .from('blocking_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .in('user_id', userIds)
            .maybeSingle();
        if (sessionError) {
            console.error('Error verifying focus session before push:', sessionError.message);
            return json({ error: 'Failed to verify focus session' }, { status: 500 });
        }
        if (!focusSession) {
            return json({ error: 'Focus session not found for this account or group' }, { status: 404 });
        }

        // Get all active iOS device tokens for these users
        const { data: devices, error: devicesError } = await supabase
            .from('device_tokens')
            .select('token, user_id')
            .in('user_id', userIds)
            .eq('device_type', 'ios')
            .eq('is_active', true);

        if (devicesError || !devices) {
            console.error('Error fetching device tokens:', devicesError);
            return json({
                success: false,
                notificationsSent: 0,
                recoverable: true,
                error: 'Could not load device tokens. Session can continue, but protection may be waiting for device sync.'
            }, { status: 503 });
        }

        // Send silent push notifications to all devices
        const notifications = await Promise.allSettled(
            devices.map(device =>
                sendAPNSNotification(
                    device.token,
                    {
                        sessionId,
                        sessionTitle: sessionTitle || 'Focus Session',
                        startTime: parsedStart.toISOString(),
                        endTime: parsedEnd.toISOString(),
                        type: 'focus_session_start'
                    }
                )
            )
        );

        const permanentlyFailedTokens = notifications
            .filter((n): n is PromiseFulfilledResult<{ token: string; permanentFailure: boolean }> =>
                n.status === 'fulfilled' && n.value.permanentFailure
            )
            .map(n => n.value.token);
        if (permanentlyFailedTokens.length > 0) {
            await supabase
                .from('device_tokens')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .in('token', permanentlyFailedTokens)
                .in('user_id', userIds);
        }

        const successful = notifications.filter(n => n.status === 'fulfilled' && !n.value.permanentFailure).length;

        // Log notification attempt
        console.log(`[Focus Session Push] Sent ${successful} notification(s)`);

        return json({
            success: true,
            notificationsSent: successful,
            totalDevices: devices.length
        });
    } catch (err) {
        console.error('Error sending focus session notification:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};

/**
 * Send a silent push notification via Apple Push Notification service
 */
async function sendAPNSNotification(
    token: string,
    payload: {
        sessionId: string;
        sessionTitle: string;
        startTime: string;
        endTime: string;
        type: string;
    }
): Promise<{ token: string; permanentFailure: boolean }> {
    const result = await sendPushWithResult(token, {
        title: payload.sessionTitle,
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
