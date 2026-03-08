import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { sendPush } from '$lib/apns';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/focus');
    }

    // Fetch active sessions (started but not ended)
    const now = new Date().toISOString();
    const { data: activeSessions } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('start_time', { ascending: false });

    // Fetch scheduled sessions (upcoming)
    const { data: scheduledSessions } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .gt('start_time', now)
        .order('start_time', { ascending: true });

    // Fetch automations
    const { data: automations } = await supabase
        .from('focus_automations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    return {
        activeSessions: activeSessions || [],
        scheduledSessions: scheduledSessions || [],
        automations: automations || []
    };
};

export const actions: Actions = {
    scheduleSession: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const title = data.get('title')?.toString() || '';
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        // Combine date and time into ISO string
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        try {
            const { data: insertedSession, error } = await supabase
                .from('blocking_sessions')
                .insert({
                    user_id: session.user.id,
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    device_scheduled: false
                })
                .select()
                .single();

            if (error) throw error;

            // Send push notification to device
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', session.user.id)
                .eq('platform', 'apns');

            if (tokens && tokens.length > 0) {
                await Promise.all(tokens.map(({ device_token }) =>
                    sendPush(device_token, {
                        title: 'Scheduled Focus Session',
                        body: `"${title}" scheduled for ${startTime.toLocaleTimeString()}`,
                        data: { type: 'sync_blocking' }
                    })
                ));
            }

            return { success: true, session: insertedSession };
        } catch (err) {
            console.error('Error scheduling session:', err);
            return { success: false, error: String(err) };
        }
    },

    cancelSession: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        try {
            const { error } = await supabase
                .from('blocking_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', session.user.id);

            if (error) throw error;

            // Notify device to sync
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', session.user.id)
                .eq('platform', 'apns');

            if (tokens && tokens.length > 0) {
                await Promise.all(tokens.map(({ device_token }) =>
                    sendPush(device_token, {
                        title: 'Focus Session Cancelled',
                        body: 'A scheduled focus session was removed.',
                        data: { type: 'sync_blocking' }
                    })
                ));
            }

            return { success: true };
        } catch (err) {
            console.error('Error canceling session:', err);
            return { success: false, error: String(err) };
        }
    },

    createAutomation: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const title = data.get('title')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '25');
        const daysOfWeek = data.get('daysOfWeek')?.toString() || '';

        if (!title || !time || !daysOfWeek) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            const { data: automation, error } = await supabase
                .from('focus_automations')
                .insert({
                    user_id: session.user.id,
                    title: title,
                    time: time,
                    duration_minutes: duration,
                    days_of_week: daysOfWeek,
                    enabled: true
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, automation };
        } catch (err) {
            console.error('Error creating automation:', err);
            return { success: false, error: String(err) };
        }
    },

    deleteAutomation: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const automationId = data.get('automationId')?.toString();

        if (!automationId) return { success: false, error: 'Missing automation ID' };

        try {
            const { error } = await supabase
                .from('focus_automations')
                .delete()
                .eq('id', automationId)
                .eq('user_id', session.user.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            console.error('Error deleting automation:', err);
            return { success: false, error: String(err) };
        }
    }
};
