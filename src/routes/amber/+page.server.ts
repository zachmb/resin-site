import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { getUser } }) => {
    const user = await getUser();

    if (!user) {
        throw redirect(303, '/login?next=/amber');
    }

    // Return minimal data immediately - full data fetched in background on client
    return {
        profile: null,
        notes: [],
        jointPlans: [],
        executionStats: null,
        externalEvents: [],
        shouldFetchData: true
    };
};

export const actions: Actions = {
    activate: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Check if user has Google credentials connected
        // Use service role to bypass any RLS issues
        const { createClient } = await import('@supabase/supabase-js');
        const { PUBLIC_SUPABASE_URL } = await import('$env/static/public');
        const { SUPABASE_SERVICE_ROLE_KEY } = await import('$env/static/private');

        const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });

        const { data: creds, error: credsError } = await admin
            .from('user_credentials')
            .select('google_refresh_token')
            .eq('id', user.id)
            .single();

        if (credsError || !creds?.google_refresh_token) {
            console.error('[Activate] Credentials check failed:', {
                error: credsError,
                has_creds: !!creds,
                has_token: !!creds?.google_refresh_token,
                userId: user.id
            });
            return {
                success: false,
                error: 'Google Calendar not connected',
                code: 'google_not_connected'
            };
        }

        // FIX: Fetch tasks FIRST to get their times, THEN update session status
        // This prevents iOS from receiving a "scheduled" notification before tasks have valid times
        const { data: tasks } = await supabase
            .from('amber_tasks')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (!tasks || tasks.length === 0) {
            return { success: false, error: 'No tasks found for session' };
        }

        // FIX: Get user's timezone preference to calculate correct task times
        const { data: profile } = await supabase
            .from('profiles')
            .select('timezone')
            .eq('id', user.id)
            .single();

        const userTimezone = profile?.timezone || 'UTC';

        // Calculate task times respecting user's timezone
        // Start from now in user's timezone
        const now = new Date();
        let currentTime = now;

        // Update all tasks with correct times BEFORE changing session status
        const taskUpdates = [];
        for (const task of tasks) {
            const estMins = task.estimated_minutes || 30;
            const endTime = new Date(currentTime.getTime() + estMins * 60000);

            taskUpdates.push({
                taskId: task.id,
                startTime: currentTime.toISOString(),
                endTime: endTime.toISOString()
            });

            currentTime = endTime;
        }

        // Execute all task updates with user_id verification
        // FIX: Add user_id check to prevent unauthorized modifications
        for (const update of taskUpdates) {
            const { error: updateError } = await supabase
                .from('amber_tasks')
                .update({
                    start_time: update.startTime,
                    end_time: update.endTime
                })
                .eq('id', update.taskId)
                .eq('session_id', sessionId);  // Verify session ownership

            if (updateError) {
                console.error('Error updating task:', updateError);
                return { success: false, error: 'Failed to update task times' };
            }
        }

        // FIX: NOW update session status only after all tasks have been updated
        // This ensures iOS receives "scheduled" notification only when tasks are ready
        const { error: sessionError } = await supabase
            .from('amber_sessions')
            .update({ status: 'scheduled', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (sessionError) {
            console.error('Error activating plan:', sessionError);
            return { success: false, error: 'Failed to update session' };
        }

        // Create blocking session entry to trigger extension blocking during task times
        // This allows the extension to block distracting sites during the amber session
        try {
            const firstTask = tasks[0];
            const lastTask = tasks[tasks.length - 1];

            if (firstTask && lastTask) {
                const sessionStartTime = firstTask.start_time || taskUpdates[0]?.startTime;
                const sessionEndTime = lastTask.end_time || taskUpdates[taskUpdates.length - 1]?.endTime;

                if (sessionStartTime && sessionEndTime) {
                    await supabase.from('blocking_sessions').insert({
                        user_id: user.id,
                        start_time: sessionStartTime,
                        end_time: sessionEndTime,
                        is_active: true,
                        title: `Amber Session: ${tasks[0]?.title || 'Focus'}`
                    });
                }
            }
        } catch (blockingErr) {
            // Non-critical: blocking session creation failure doesn't fail the activation
            console.warn('[Activate] Warning: blocking session creation failed', blockingErr);
        }

        return { success: true };
    },

    complete: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership and fetch session details
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id, display_title, created_at, amber_tasks(*)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized session access attempt');
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Calculate session duration in minutes
        const sessionStart = sessionCheck.created_at;
        const sessionEnd = new Date().toISOString();
        const durationMinutes = Math.round((new Date(sessionEnd).getTime() - new Date(sessionStart).getTime()) / (1000 * 60));

        // Update session status to 'completed'
        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error completing plan:', error);
            return { success: false, error: 'Failed to complete plan' };
        }

        // Clean up associated blocking sessions (extension blocking)
        // Mark them as inactive since the session is complete
        try {
            const { data: tasks } = await supabase
                .from('amber_tasks')
                .select('start_time, end_time')
                .eq('amber_session_id', sessionId);

            if (tasks && tasks.length > 0) {
                const firstTask = tasks[0];
                const lastTask = tasks[tasks.length - 1];

                if (firstTask?.start_time && lastTask?.end_time) {
                    await supabase
                        .from('blocking_sessions')
                        .update({ is_active: false })
                        .eq('user_id', user.id)
                        .gte('start_time', new Date(firstTask.start_time).toISOString())
                        .lte('end_time', new Date(lastTask.end_time).toISOString())
                        .eq('is_active', true);
                }
            }
        } catch (blockingErr) {
            console.warn('[Complete] Warning: blocking session update failed', blockingErr);
        }

        // Apply gamification rewards (variable stones, forest health, streak)
        try {
            const { calculateSessionReward, applySessionReward } = await import('$lib/gamification_service');
            const reward = await calculateSessionReward(user.id, durationMinutes);

            // Customize message with session title
            const sessionTitle = sessionCheck.display_title || 'Your plan';
            if (!reward.message.includes('RARE') && !reward.message.includes('Bonus')) {
                reward.message = `Completed "${sessionTitle}"! +${reward.baseStones} stones earned.`;
            } else if (reward.message.includes('RARE')) {
                reward.message = `🎉 RARE BONUS for "${sessionTitle}"! You've earned ${reward.totalStones} stones! Your forest flourishes!`;
            } else {
                reward.message = `✨ Bonus for "${sessionTitle}"! You earned +${reward.bonusStones} extra stones! Total: +${reward.totalStones}`;
            }

            await applySessionReward(user.id, sessionId, reward);

            // Suggest recovery if session was long and no bonus triggered
            const totalTaskDuration = (sessionCheck.amber_tasks || []).reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0);
            const suggestRecovery = totalTaskDuration > 60 && reward.celebrationLevel === 'standard';

            return { success: true, reward, suggestRecovery };
        } catch (rewardError) {
            console.error('Error applying rewards:', rewardError);
            // Still mark as completed even if rewards fail
            return { success: true, reward: null, suggestRecovery: false };
        }
    },

    cancel: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized session access attempt');
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Update session status to 'canceled'
        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error canceling plan:', error);
            return { success: false, error: 'Failed to cancel plan' };
        }

        // Clean up associated blocking sessions (extension blocking)
        try {
            const { data: tasks } = await supabase
                .from('amber_tasks')
                .select('start_time, end_time')
                .eq('amber_session_id', sessionId);

            if (tasks && tasks.length > 0) {
                const firstTask = tasks[0];
                const lastTask = tasks[tasks.length - 1];

                if (firstTask?.start_time && lastTask?.end_time) {
                    await supabase
                        .from('blocking_sessions')
                        .delete()
                        .eq('user_id', user.id)
                        .gte('start_time', new Date(firstTask.start_time).toISOString())
                        .lte('end_time', new Date(lastTask.end_time).toISOString())
                        .eq('is_active', true);
                }
            }
        } catch (blockingErr) {
            console.warn('[Cancel] Warning: blocking session cleanup failed', blockingErr);
        }

        // Apply forest decay for breaking focus (loss aversion mechanic)
        try {
            const { applyForestDecay } = await import('$lib/gamification_service');
            await applyForestDecay(user.id, sessionId, 0);
        } catch (decayError) {
            console.error('Error applying forest decay:', decayError);
            // Continue even if decay fails
        }

        return { success: true };
    },

    delete: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) {
            console.error('[Delete] Auth error: User not authenticated');
            return { success: false, error: "Unauthorized" };
        }

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        console.log('[Delete] Attempting to delete session:', sessionId, 'for user:', user.id);

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Try to find in amber_sessions first
        const { data: amberSession, error: fetchError } = await supabase
            .from('amber_sessions')
            .select('id, amber_tasks(calendar_event_id)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        console.log('[Delete] Fetch result - session found:', !!amberSession, 'error:', fetchError);

        if (amberSession) {
            // It's an amber session - clean up calendar events and delete
            const calendarEventIds = (amberSession.amber_tasks || [])
                .map((t: any) => t.calendar_event_id)
                .filter(Boolean);

            if (calendarEventIds.length > 0) {
                try {
                    const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/amber_service');
                    const gToken = await getGoogleAccessToken(user.id);
                    for (const eventId of calendarEventIds) {
                        await deleteCalendarEvent(gToken, eventId);
                    }
                } catch (calErr) {
                    console.warn('[Action: delete] Calendar cleanup warning:', calErr);
                }
            }

            const { count, error: deleteError } = await supabase
                .from('amber_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', user.id);

            console.log('[Delete] Delete result - count:', count, 'error:', deleteError);

            if (deleteError) {
                console.error('[Delete] Database delete error:', deleteError);
                return { success: false, error: 'Failed to delete from database', code: 'DB_ERROR' };
            }

            // RLS SILENT FAILURE DETECTION
            if (!count || count === 0) {
                console.error('[Delete] RLS silent failure - no rows affected');
                return { success: false, error: 'Could not delete session. Check your permissions.', code: 'RLS_SILENT_FAILURE' };
            }

            console.log('[Delete] Successfully deleted session from database');

            // Recalculate stones
            try {
                const { syncStonesFromNotes } = await import('$lib/gamification_service');
                await syncStonesFromNotes(user.id, { force: true });
            } catch (syncError) {
                console.error('[Delete] Stone sync error:', syncError);
            }

            console.log('[Delete] Action completed successfully');
            return { success: true };
        }

        // Not in amber_sessions, try blocking_sessions (focus sessions)
        const { data: focusSession } = await supabase
            .from('blocking_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (focusSession) {
            // It's a focus session - just delete it
            const { count, error: deleteError } = await supabase
                .from('blocking_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', user.id);

            console.log('[Delete] Focus session delete - count:', count, 'error:', deleteError);

            if (deleteError) {
                console.error('[Delete] Database delete error:', deleteError);
                return { success: false, error: 'Failed to delete session', code: 'DB_ERROR' };
            }

            // RLS SILENT FAILURE DETECTION
            if (!count || count === 0) {
                console.error('[Delete] RLS silent failure on focus session - no rows affected');
                return { success: false, error: 'Could not delete focus session. Check your permissions.', code: 'RLS_SILENT_FAILURE' };
            }

            console.log('[Delete] Focus session deleted successfully');
            return { success: true };
        }

        // Session not found in either table
        console.warn('[Delete] Session not found in either table');
        return { success: false, error: 'Session not found or unauthorized', code: 'NOT_FOUND' };
    },

    acceptJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'accepted' })
            .eq('id', planId)
            .eq('collaborator_id', user.id);

        if (error) {
            console.error('Error accepting plan:', error);
            return fail(500, { error: 'Failed to accept plan' });
        }

        return { success: true };
    },

    declineJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'declined' })
            .eq('id', planId)
            .eq('collaborator_id', user.id);

        if (error) {
            console.error('Error declining plan:', error);
            return fail(500, { error: 'Failed to decline plan' });
        }

        return { success: true };
    },

    activateJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        // Verify user is initiator
        const { data: plan, error: planError } = await supabase
            .from('joint_amber_plans')
            .select('*')
            .eq('id', planId)
            .eq('initiator_id', user.id)
            .single();

        if (planError || !plan) {
            return fail(403, { error: 'Only initiator can activate the plan' });
        }

        if (plan.status !== 'accepted') {
            return fail(400, { error: 'Plan must be accepted by both users first' });
        }

        // Update status to processing
        await supabase
            .from('joint_amber_plans')
            .update({ status: 'processing' })
            .eq('id', planId);

        // For now, just mark as scheduled (full pipeline requires DeepSeek integration)
        // In a full implementation, this would call runJointActivationPipeline
        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'scheduled', updated_at: new Date().toISOString() })
            .eq('id', planId);

        if (error) {
            console.error('Error activating joint plan:', error);
            return fail(500, { error: 'Failed to activate plan' });
        }

        return { success: true };
    },

    cancelJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', planId)
            .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`);

        if (error) {
            console.error('Error canceling joint plan:', error);
            return fail(500, { error: 'Failed to cancel plan' });
        }

        return { success: true };
    },

    updateTask: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const taskId = data.get('taskId')?.toString();
        const title = data.get('title')?.toString();
        const description = data.get('description')?.toString();
        const estimatedMinutes = parseInt(data.get('estimatedMinutes')?.toString() || '0', 10);

        if (!sessionId || !taskId || !title) {
            return fail(400, { error: 'Missing required fields' });
        }

        // FIX: Verify user ownership of the session before updating task
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized task update attempt');
            return fail(401, { error: 'Unauthorized' });
        }

        // Update the amber task (session_id check ensures it belongs to this session)
        const { error } = await supabase
            .from('amber_tasks')
            .update({
                title,
                description: description || null,
                estimated_minutes: estimatedMinutes,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .eq('amber_session_id', sessionId);

        if (error) {
            console.error('Error updating task:', error);
            return fail(500, { error: 'Failed to update task' });
        }

        return { success: true };
    },

    shiftSingleTask: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const taskId = data.get('taskId')?.toString();
        const offsetMinutes = parseInt(data.get('offsetMinutes')?.toString() || '0', 10);

        if (!sessionId || !taskId) return fail(400, { error: 'Missing fields' });

        // Verify ownership
        const { data: check } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!check) return fail(401, { error: 'Unauthorized' });

        // Fetch current task times
        const { data: task } = await supabase
            .from('amber_tasks')
            .select('start_time, end_time')
            .eq('id', taskId)
            .eq('amber_session_id', sessionId)
            .single();

        if (!task?.start_time) return { success: true }; // no-op if no times

        const newStart = new Date(new Date(task.start_time).getTime() + offsetMinutes * 60000).toISOString();
        const newEnd = task.end_time ? new Date(new Date(task.end_time).getTime() + offsetMinutes * 60000).toISOString() : null;

        await supabase
            .from('amber_tasks')
            .update({ start_time: newStart, end_time: newEnd, updated_at: new Date().toISOString() })
            .eq('id', taskId);

        return { success: true };
    },

    updateIntensity: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const intensity = parseFloat(data.get('intensity')?.toString() || '0.5');

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        // Update session intensity
        const { error } = await supabase
            .from('amber_sessions')
            .update({ intensity })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating intensity:', error);
            return fail(500, { error: 'Failed to update intensity' });
        }

        // Calculate tier and apply tier-based rules to all tasks
        const tier = intensity < 0.25 ? 0 : intensity < 0.5 ? 1 : intensity < 0.75 ? 2 : 3;
        const { data: tasks } = await supabase
            .from('amber_tasks')
            .select('id')
            .eq('amber_session_id', sessionId);

        for (const task of tasks || []) {
            const updates: any = { updated_at: new Date().toISOString() };
            if (tier === 0) { updates.requires_focus = false; updates.requires_camera_verification = false; }
            else if (tier === 1) { updates.requires_focus = true; updates.requires_camera_verification = false; }
            else if (tier === 2) { updates.requires_focus = true; /* keep existing camera */ }
            else { updates.requires_focus = true; updates.requires_camera_verification = true; }

            await supabase
                .from('amber_tasks')
                .update(updates)
                .eq('id', task.id);
        }

        return { success: true };
    },

    scaleDurations: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const newTotal = parseInt(data.get('newTotal')?.toString() || '0', 10);

        if (!sessionId || newTotal === 0) return fail(400, { error: 'Missing or invalid parameters' });

        // FIX: Verify user ownership of the session first
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized duration scaling attempt');
            return fail(401, { error: 'Unauthorized' });
        }

        // Fetch current tasks
        const { data: tasks, error: fetchError } = await supabase
            .from('amber_tasks')
            .select('id, estimated_minutes')
            .eq('amber_session_id', sessionId);

        if (fetchError || !tasks || tasks.length === 0) {
            return fail(500, { error: 'Failed to fetch tasks' });
        }

        const currentTotal = tasks.reduce((s: number, t: any) => s + (t.estimated_minutes || 0), 0);
        if (currentTotal === 0) return fail(400, { error: 'No tasks to scale' });

        const ratio = newTotal / currentTotal;

        // Update each task's duration proportionally
        for (const task of tasks) {
            const newMins = Math.max(5, Math.round((task.estimated_minutes * ratio) / 5) * 5);
            await supabase
                .from('amber_tasks')
                .update({ estimated_minutes: newMins, updated_at: new Date().toISOString() })
                .eq('id', task.id);
        }

        return { success: true };
    },

    shiftStartTimes: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const startTime = data.get('startTime')?.toString();
        const offsetMinutes = parseInt(data.get('offsetMinutes')?.toString() || '0', 10);

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        // FIX: Verify user ownership of the session first
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized time shift attempt');
            return fail(401, { error: 'Unauthorized' });
        }

        // Fetch tasks
        const { data: tasks, error: fetchError } = await supabase
            .from('amber_tasks')
            .select('id, start_time, end_time, estimated_minutes')
            .eq('amber_session_id', sessionId)
            .order('sequence_order, created_at', { ascending: true });

        if (fetchError || !tasks) {
            return fail(500, { error: 'Failed to fetch tasks' });
        }

        // Determine new start time
        let newStartTime: Date;
        if (startTime) {
            // User set explicit start time
            newStartTime = new Date(startTime);
        } else if (tasks.length > 0 && tasks[0].start_time && offsetMinutes !== 0) {
            // Apply offset to existing start time
            newStartTime = new Date(tasks[0].start_time);
            newStartTime.setMinutes(newStartTime.getMinutes() + offsetMinutes);
        } else {
            return fail(400, { error: 'No valid start time to shift' });
        }

        // Update all task times based on new start
        let currentTime = newStartTime;
        for (const task of tasks) {
            const estMins = task.estimated_minutes || 30;
            const endTime = new Date(currentTime.getTime() + estMins * 60000);

            await supabase
                .from('amber_tasks')
                .update({
                    start_time: currentTime.toISOString(),
                    end_time: endTime.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', task.id);

            currentTime = endTime;
        }

        return { success: true };
    },

    markFailed: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized session access attempt');
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Update session status to 'failed'
        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error marking plan as failed:', error);
            return { success: false, error: 'Failed to update plan' };
        }

        return { success: true };
    },

    extendSession: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const extraMinutesStr = data.get('extraMinutes')?.toString();

        if (!sessionId || !extraMinutesStr) {
            return { success: false, error: 'Missing session ID or duration' };
        }

        const extraMinutes = parseInt(extraMinutesStr, 10);
        if (isNaN(extraMinutes) || extraMinutes <= 0) {
            return { success: false, error: 'Invalid duration' };
        }

        // Verify ownership
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            console.error('Unauthorized session access attempt');
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Fetch all tasks for this session
        const { data: tasks, error: fetchError } = await supabase
            .from('amber_tasks')
            .select('id, end_time')
            .eq('amber_session_id', sessionId)
            .order('sequence_order, created_at', { ascending: true });

        if (fetchError || !tasks || tasks.length === 0) {
            return { success: false, error: 'Failed to fetch tasks' };
        }

        // Get the shift amount in milliseconds
        const shiftMs = extraMinutes * 60000;

        // Update all task end times
        for (const task of tasks) {
            if (task.end_time) {
                const newEndTime = new Date(new Date(task.end_time).getTime() + shiftMs);
                await supabase
                    .from('amber_tasks')
                    .update({
                        end_time: newEndTime.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', task.id);
            }
        }

        return { success: true };
    },

    bulkDelete: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionIds = JSON.parse(data.get('sessionIds')?.toString() || '[]');

        if (!sessionIds.length) return { success: false, error: 'No sessions selected' };

        // Verify ownership and fetch tasks for calendar cleanup
        const { data: sessionsData, error: fetchError } = await supabase
            .from('amber_sessions')
            .select('id, amber_tasks(calendar_event_id)')
            .in('id', sessionIds)
            .eq('user_id', user.id);

        if (fetchError || !sessionsData) {
            return { success: false, error: 'Sessions not found or unauthorized' };
        }

        // 1. Clean up Calendar events
        const calendarEventIds = sessionsData.flatMap((s: any) =>
            (s.amber_tasks || []).map((t: any) => t.calendar_event_id)
        ).filter(Boolean);

        if (calendarEventIds.length > 0) {
            try {
                const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/amber_service');
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch (calErr) {
                console.warn('[Action: bulkDelete] Calendar cleanup warning:', calErr);
            }
        }

        // 2. Delete from database
        const { error: deleteError } = await supabase
            .from('amber_sessions')
            .delete()
            .in('id', sessionIds)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[Action: bulkDelete] Database delete error:', deleteError);
            return { success: false, error: 'Failed to delete from database' };
        }

        return { success: true };
    },

    clearDay: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const dateStr = data.get('date')?.toString();

        if (!dateStr) return { success: false, error: 'Missing date' };

        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch sessions for that day
        const { data: sessionsData } = await supabase
            .from('amber_sessions')
            .select('id, created_at, amber_tasks(start_time, end_time, calendar_event_id)')
            .eq('user_id', user.id);

        const sessionIdsToDelete = (sessionsData || []).filter((s: any) => {
            const tasks = s.amber_tasks || [];
            if (tasks.length > 0) {
                const firstTaskStart = new Date(tasks[0].start_time);
                return firstTaskStart >= startOfDay && firstTaskStart <= endOfDay;
            }
            const createdAt = new Date(s.created_at);
            return createdAt >= startOfDay && createdAt <= endOfDay;
        }).map((s: any) => s.id);

        if (sessionIdsToDelete.length === 0) return { success: true };

        // 1. Clean up Calendar events
        const calendarEventIds = (sessionsData || [])
            .filter((s: any) => sessionIdsToDelete.includes(s.id))
            .flatMap((s: any) => (s.amber_tasks || []).map((t: any) => t.calendar_event_id))
            .filter(Boolean);

        if (calendarEventIds.length > 0) {
            try {
                const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/amber_service');
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch (calErr) {
                console.warn('[Action: clearDay] Calendar cleanup warning:', calErr);
            }
        }

        // 2. Delete from database
        const { error: deleteError } = await supabase
            .from('amber_sessions')
            .delete()
            .in('id', sessionIdsToDelete)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[Action: clearDay] Database delete error:', deleteError);
            return { success: false, error: 'Failed to delete from database' };
        }

        return { success: true };
    }
};
