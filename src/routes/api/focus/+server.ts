import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { sendPush } from '$lib/apns';
import type { RequestEvent } from '@sveltejs/kit';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

export const POST = async ({ request, locals }: RequestEvent) => {
    // 1. Auth: Get session from locals (set by hooks.server.ts)
    const session = await locals.getSession();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    // 2. Parse body
    let body: {
        title: string;
        durationMinutes: number;
        startTime?: string; // ISO string
        groupId?: string; // Optional for group focus sessions
    };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { title, durationMinutes, startTime, groupId } = body;

    if (!title || !durationMinutes) {
        return json({ error: 'title and durationMinutes are required' }, { status: 400 });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const sessionId = crypto.randomUUID();

    try {
        // 3. Insert into blocking_sessions
        // The iOS app polls this table or receives a push to sync.
        const { data, error } = await admin.from('blocking_sessions').insert({
            id: sessionId,
            user_id: user.id,
            title: title,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            device_scheduled: false
        }).select().single();

        if (error) throw error;

        // 4. Determine which users should receive notifications
        let userIds = [user.id];
        if (groupId) {
            // Get all members of the group
            const { data: groupMembers } = await admin
                .from('group_members')
                .select('user_id')
                .eq('group_id', groupId);
            if (groupMembers) {
                userIds = groupMembers.map(m => m.user_id);
            }
        }

        // 5. Query device tokens for these users
        const { data: devices } = await admin
            .from('device_tokens')
            .select('token, user_id')
            .in('user_id', userIds)
            .eq('device_type', 'ios')
            .eq('is_active', true);

        // 6. Send silent push notification to iOS devices
        // This will trigger the blocking session to activate on the device immediately
        let notificationsSent = 0;
        if (devices && devices.length > 0) {
            const pushPromises = devices.map(device =>
                sendPush(device.token, {
                    title: title,
                    body: 'Focus session started',
                    pushType: 'background',
                    data: {
                        type: 'focus_session_start',
                        sessionId: sessionId,
                        endTime: end.toISOString()
                    }
                })
            );

            const results = await Promise.allSettled(pushPromises);
            notificationsSent = results.filter(r => r.status === 'fulfilled' && r.value).length;
        }

        console.log(`[api/focus] Focus session created: ${sessionId}, notifications sent to ${notificationsSent} devices`);

        return json({ status: 'success', session: data, notificationsSent });

    } catch (err) {
        console.error('[api/focus] Error:', err);
        return json({ error: String(err) }, { status: 500 });
    }
};
