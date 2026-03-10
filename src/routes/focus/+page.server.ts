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

    // Fetch accepted friends (for invite dropdown)
    const { data: friendships } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`)
        .eq('status', 'accepted');

    const friendIds = friendships?.map(f =>
        f.requester_id === session.user.id ? f.addressee_id : f.requester_id
    ) || [];

    let friends: any[] = [];
    if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', friendIds);

        friends = friendProfiles?.map(p => ({
            id: p.id,
            email: p.email
        })) || [];
    }

    // Fetch shared focus sessions
    const { data: sharedSessions } = await supabase
        .from('shared_focus_sessions')
        .select('*')
        .or(`initiator_id.eq.${session.user.id},collaborator_id.eq.${session.user.id}`)
        .neq('status', 'declined')
        .order('created_at', { ascending: false });

    return {
        activeSessions: activeSessions || [],
        scheduledSessions: scheduledSessions || [],
        automations: automations || [],
        friends: friends || [],
        sharedSessions: sharedSessions || []
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
    },

    updateSession: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const title = data.get('title')?.toString() || '';
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!sessionId || !title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        // Combine date and time into ISO string
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        try {
            const { data: updatedSession, error } = await supabase
                .from('blocking_sessions')
                .update({
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                })
                .eq('id', sessionId)
                .eq('user_id', session.user.id)
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
                        title: 'Focus Session Updated',
                        body: `"${title}" updated for ${startTime.toLocaleTimeString()}`,
                        data: { type: 'sync_blocking' }
                    })
                ));
            }

            return { success: true, session: updatedSession };
        } catch (err) {
            console.error('Error updating session:', err);
            return { success: false, error: String(err) };
        }
    },

    makeRecurring: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const daysOfWeek = data.get('daysOfWeek')?.toString() || '';

        if (!sessionId || !daysOfWeek) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            // Fetch the session to get its details
            const { data: blockingSession, error: fetchError } = await supabase
                .from('blocking_sessions')
                .select('*')
                .eq('id', sessionId)
                .eq('user_id', session.user.id)
                .single();

            if (fetchError || !blockingSession) throw fetchError || new Error('Session not found');

            // Extract time from start_time
            const startDate = new Date(blockingSession.start_time);
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            // Calculate duration in minutes
            const durationMinutes = Math.round(
                (new Date(blockingSession.end_time).getTime() - new Date(blockingSession.start_time).getTime()) / 60000
            );

            // Create automation
            const { data: automation, error } = await supabase
                .from('focus_automations')
                .insert({
                    user_id: session.user.id,
                    title: blockingSession.title,
                    time: timeStr,
                    duration_minutes: durationMinutes,
                    days_of_week: daysOfWeek,
                    enabled: true
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
                        title: 'Focus Routine Created',
                        body: `"${blockingSession.title}" will repeat on ${daysOfWeek.split(',').map(d => d.trim().slice(0, 3)).join(', ')}`,
                        data: { type: 'sync_blocking' }
                    })
                ));
            }

            return { success: true, automation };
        } catch (err) {
            console.error('Error creating recurring session:', err);
            return { success: false, error: String(err) };
        }
    },

    inviteFriendToFocus: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const collaboratorId = data.get('collaboratorId')?.toString();
        const title = data.get('title')?.toString() || '';
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!collaboratorId || !title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            // Verify friendship exists
            const { data: friendship, error: friendError } = await supabase
                .from('friendships')
                .select('id')
                .or(`and(requester_id.eq.${session.user.id},addressee_id.eq.${collaboratorId}),and(requester_id.eq.${collaboratorId},addressee_id.eq.${session.user.id})`)
                .eq('status', 'accepted')
                .single();

            if (friendError || !friendship) {
                return { success: false, error: 'Friendship not found or not accepted' };
            }

            // Create shared focus session
            const startTime = new Date(`${date}T${time}`);
            const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

            const { data: sharedSession, error } = await supabase
                .from('shared_focus_sessions')
                .insert({
                    initiator_id: session.user.id,
                    collaborator_id: collaboratorId,
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Send push notification to collaborator
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', collaboratorId)
                .eq('platform', 'apns');

            if (tokens && tokens.length > 0) {
                const { data: initiatorProfile } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', session.user.id)
                    .single();

                await Promise.all(tokens.map(({ device_token }) =>
                    sendPush(device_token, {
                        title: 'Focus Session Invite',
                        body: `${initiatorProfile?.email?.split('@')[0]} invited you to focus at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        data: { type: 'focus_invite' }
                    })
                ));
            }

            return { success: true, session: sharedSession };
        } catch (err) {
            console.error('Error inviting friend to focus:', err);
            return { success: false, error: String(err) };
        }
    },

    acceptSharedFocus: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch shared session
            const { data: sharedSession, error: fetchError } = await supabase
                .from('shared_focus_sessions')
                .select('*')
                .eq('id', sharedSessionId)
                .single();

            if (fetchError || !sharedSession) throw fetchError || new Error('Session not found');

            if (sharedSession.collaborator_id !== session.user.id) {
                return { success: false, error: 'Unauthorized' };
            }

            // Create blocking sessions for both users
            const { data: initiatorSession, error: initiatorError } = await supabase
                .from('blocking_sessions')
                .insert({
                    user_id: sharedSession.initiator_id,
                    title: sharedSession.title,
                    start_time: sharedSession.start_time,
                    end_time: sharedSession.end_time,
                    device_scheduled: false
                })
                .select()
                .single();

            if (initiatorError) throw initiatorError;

            const { data: collaboratorSession, error: collaboratorError } = await supabase
                .from('blocking_sessions')
                .insert({
                    user_id: sharedSession.collaborator_id,
                    title: sharedSession.title,
                    start_time: sharedSession.start_time,
                    end_time: sharedSession.end_time,
                    device_scheduled: false
                })
                .select()
                .single();

            if (collaboratorError) throw collaboratorError;

            // Update shared session with session IDs and status
            const { error: updateError } = await supabase
                .from('shared_focus_sessions')
                .update({
                    status: 'scheduled',
                    initiator_blocking_session_id: initiatorSession.id,
                    collaborator_blocking_session_id: collaboratorSession.id
                })
                .eq('id', sharedSessionId);

            if (updateError) throw updateError;

            // Send push notification to initiator
            const { data: initiatorTokens } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', sharedSession.initiator_id)
                .eq('platform', 'apns');

            if (initiatorTokens && initiatorTokens.length > 0) {
                await Promise.all(initiatorTokens.map(({ device_token }) =>
                    sendPush(device_token, {
                        title: 'Focus Session Accepted',
                        body: `Your friend accepted the focus session at ${new Date(sharedSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        data: { type: 'focus_accepted' }
                    })
                ));
            }

            return { success: true };
        } catch (err) {
            console.error('Error accepting shared focus:', err);
            return { success: false, error: String(err) };
        }
    },

    declineSharedFocus: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            const { data: sharedSession } = await supabase
                .from('shared_focus_sessions')
                .select('collaborator_id')
                .eq('id', sharedSessionId)
                .single();

            if (sharedSession?.collaborator_id !== session.user.id) {
                return { success: false, error: 'Unauthorized' };
            }

            const { error } = await supabase
                .from('shared_focus_sessions')
                .update({ status: 'declined' })
                .eq('id', sharedSessionId);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            console.error('Error declining shared focus:', err);
            return { success: false, error: String(err) };
        }
    },

    completeSharedFocus: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch current shared session
            const { data: sharedSession } = await supabase
                .from('shared_focus_sessions')
                .select('*')
                .eq('id', sharedSessionId)
                .single();

            if (!sharedSession) throw new Error('Session not found');

            const isInitiator = session.user.id === sharedSession.initiator_id;
            if (!isInitiator && session.user.id !== sharedSession.collaborator_id) {
                return { success: false, error: 'Unauthorized' };
            }

            // Update completion status
            const updateData = isInitiator
                ? { initiator_completed: true }
                : { collaborator_completed: true };

            const { data: updatedSession, error: updateError } = await supabase
                .from('shared_focus_sessions')
                .update(updateData)
                .eq('id', sharedSessionId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Check if both completed
            const bothCompleted = (isInitiator ? true : updatedSession.initiator_completed) &&
                                 (!isInitiator ? true : updatedSession.collaborator_completed);

            if (bothCompleted) {
                // Update status and award stones to both users
                const { error: statusError } = await supabase
                    .from('shared_focus_sessions')
                    .update({ status: 'completed' })
                    .eq('id', sharedSessionId);

                if (statusError) throw statusError;

                // Award +5 stones to initiator
                const { data: initiatorProfile } = await supabase
                    .from('profiles')
                    .select('total_stones')
                    .eq('id', sharedSession.initiator_id)
                    .single();

                if (initiatorProfile) {
                    await supabase
                        .from('profiles')
                        .update({ total_stones: (initiatorProfile.total_stones || 0) + 5 })
                        .eq('id', sharedSession.initiator_id);
                }

                // Award +5 stones to collaborator
                const { data: collaboratorProfile } = await supabase
                    .from('profiles')
                    .select('total_stones')
                    .eq('id', sharedSession.collaborator_id)
                    .single();

                if (collaboratorProfile) {
                    await supabase
                        .from('profiles')
                        .update({ total_stones: (collaboratorProfile.total_stones || 0) + 5 })
                        .eq('id', sharedSession.collaborator_id);
                }
            }

            return { success: true, bothCompleted };
        } catch (err) {
            console.error('Error completing shared focus:', err);
            return { success: false, error: String(err) };
        }
    },

    cancelSharedFocus: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch shared session
            const { data: sharedSession, error: fetchError } = await supabase
                .from('shared_focus_sessions')
                .select('*')
                .eq('id', sharedSessionId)
                .single();

            if (fetchError || !sharedSession) throw fetchError || new Error('Session not found');

            if (session.user.id !== sharedSession.initiator_id && session.user.id !== sharedSession.collaborator_id) {
                return { success: false, error: 'Unauthorized' };
            }

            // Delete blocking sessions
            if (sharedSession.initiator_blocking_session_id) {
                await supabase
                    .from('blocking_sessions')
                    .delete()
                    .eq('id', sharedSession.initiator_blocking_session_id);
            }

            if (sharedSession.collaborator_blocking_session_id) {
                await supabase
                    .from('blocking_sessions')
                    .delete()
                    .eq('id', sharedSession.collaborator_blocking_session_id);
            }

            // Update status to canceled
            const { error: updateError } = await supabase
                .from('shared_focus_sessions')
                .update({ status: 'canceled' })
                .eq('id', sharedSessionId);

            if (updateError) throw updateError;

            // Notify other participant
            const otherUserId = session.user.id === sharedSession.initiator_id
                ? sharedSession.collaborator_id
                : sharedSession.initiator_id;

            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('device_token')
                .eq('user_id', otherUserId)
                .eq('platform', 'apns');

            if (tokens && tokens.length > 0) {
                await Promise.all(tokens.map(({ device_token }) =>
                    sendPush(device_token, {
                        title: 'Focus Session Canceled',
                        body: `${sharedSession.title} was canceled by your friend`,
                        data: { type: 'focus_canceled' }
                    })
                ));
            }

            return { success: true };
        } catch (err) {
            console.error('Error canceling shared focus:', err);
            return { success: false, error: String(err) };
        }
    }
};
