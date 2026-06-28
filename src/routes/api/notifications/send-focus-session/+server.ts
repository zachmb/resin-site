import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID!;
const APNS_KEY = process.env.APNS_KEY!;

/**
 * Send silent push notification to iOS devices when focus session starts
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId, sessionTitle, endTime, groupId } = await event.request.json();

        if (!sessionId) {
            return json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
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
                success: true,
                notificationsSent: 0
            });
        }

        // Send silent push notifications to all devices
        const notifications = await Promise.allSettled(
            devices.map(device =>
                sendAPNSNotification(
                    device.token,
                    {
                        sessionId,
                        sessionTitle: sessionTitle || 'Focus Session',
                        endTime,
                        type: 'focus_session_start'
                    }
                )
            )
        );

        const successful = notifications.filter(n => n.status === 'fulfilled').length;

        // Log notification attempt
        console.log(`[Focus Session Push] Sent ${successful} notifications for session ${sessionId}`);

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
        endTime: string;
        type: string;
    }
): Promise<void> {
    // Note: This is a placeholder for actual APNs implementation
    // In production, you would use:
    // 1. Apple's native APNs API with JWT authentication
    // 2. Or a service like Firebase Cloud Messaging
    // 3. Or a third-party service like OneSignal, Pusher, etc.

    // For now, we'll log the intent
    console.log('[APNs] Sending silent notification to device:', {
        token: token.substring(0, 10) + '...',
        payload
    });

    // TODO: Implement actual APNs notification sending
    // Steps:
    // 1. Generate JWT token signed with APNs private key
    // 2. Make HTTP/2 POST request to api.push.apple.com
    // 3. Include the notification payload

    return Promise.resolve();
}
