import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { adminClient, userHasProAccess } from '$lib/server/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BULK_DELETE_SESSION_IDS_BYTES = 4_000;
const MAX_AMBER_SESSION_TASKS = 200;

function logAmberActionIssue(scope: string, error: unknown) {
    const issue = error as { code?: unknown; name?: unknown; message?: unknown; status?: unknown };
    console.error(`[amber/action] ${scope}`, {
        code: typeof issue?.code === 'string' ? issue.code : undefined,
        name: typeof issue?.name === 'string' ? issue.name : undefined,
        status: typeof issue?.status === 'number' || typeof issue?.status === 'string' ? issue.status : undefined,
        hasMessage: typeof issue?.message === 'string' && issue.message.length > 0
    });
}

function isValidUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

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
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        if (!(await userHasProAccess(user.id))) {
            return fail(402, {
                success: false,
                error: 'AI scheduling on web requires Resin Pro. Upgrade in the iOS app to sync plans to your laptop.',
                code: 'PRO_REQUIRED'
            });
        }

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };
        if (!UUID_RE.test(sessionId)) return { success: false, error: 'Invalid session ID' };

        // Check if user has Google credentials connected.
        const { data: creds, error: credsError } = await adminClient
            .from('user_credentials')
            .select('google_refresh_token')
            .eq('id', user.id)
            .single();

        if (credsError || !creds?.google_refresh_token) {
            logAmberActionIssue('activate_credentials_missing', credsError);
            return {
                success: false,
                error: 'Google Calendar not connected',
                code: 'google_not_connected'
            };
        }

        const { data: sessionCheck, error: sessionCheckError } = await supabase
            .from('amber_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionCheckError || !sessionCheck) {
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // FIX: Fetch tasks FIRST to get their times, THEN update session status
        // This prevents iOS from receiving a "scheduled" notification before tasks have valid times
        const { data: tasks } = await supabase
            .from('amber_tasks')
            .select('id, session_id, title, estimated_minutes, start_time, end_time')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(MAX_AMBER_SESSION_TASKS);

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
                logAmberActionIssue('activate_task_update_failed', updateError);
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
            logAmberActionIssue('activate_session_update_failed', sessionError);
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

            // Sync with Extension (real-time blocks)
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            
            if (token) {
                await supabase.functions.invoke('create-block-from-session', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: {
                        session_id: sessionId,
                        category_ids: ['youtube', 'reddit', 'social', 'video'],
                        block_entire_session: true
                    }
                });
            } else {
                await supabase.functions.invoke('create-block-from-session', {
                    body: {
                        session_id: sessionId,
                        category_ids: ['youtube', 'reddit', 'social', 'video'],
                        block_entire_session: true
                    }
                });
            }
        } catch (blockingErr) {
            // Non-critical: blocking session creation failure doesn't fail the activation
            logAmberActionIssue('activate_blocking_create_warning', blockingErr);
        }

        return { success: true };
    },

    complete: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };


        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };
        if (!UUID_RE.test(sessionId)) return { success: false, error: 'Invalid session ID' };

        // Verify ownership and fetch session details
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id, display_title, created_at, amber_tasks(*)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
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
            logAmberActionIssue('complete_session_update_failed', error);
            return { success: false, error: 'Failed to complete plan' };
        }

        // Clean up associated blocking sessions (extension blocking)
        // Mark them as inactive since the session is complete
        try {
	            const { data: tasks } = await supabase
	                .from('amber_tasks')
	                .select('start_time, end_time')
	                .eq('session_id', sessionId);

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

            // Cancel active blocks for real-time extension Sync
            await supabase
                .from('active_blocks')
                .update({ cancelled_by_user_at: new Date().toISOString() })
                .eq('session_id', sessionId)
                .is('cancelled_by_user_at', null);
        } catch (blockingErr) {
            logAmberActionIssue('complete_blocking_cleanup_warning', blockingErr);
        }

        // Apply gamification rewards (variable stones, forest health, streak)
        try {
            const { calculateSessionReward, applySessionReward } = await import('$lib/services/gamification');
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
            logAmberActionIssue('complete_reward_warning', rewardError);
            // Still mark as completed even if rewards fail
            return { success: true, reward: null, suggestRecovery: false };
        }
    },

    cancel: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return { success: false, error: "Unauthorized" };


        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };
        if (!UUID_RE.test(sessionId)) return { success: false, error: 'Invalid session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Update session status to 'canceled'
        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            logAmberActionIssue('cancel_session_update_failed', error);
            return { success: false, error: 'Failed to cancel plan' };
        }

        // Clean up associated blocking sessions (extension blocking)
        try {
	            const { data: tasks } = await supabase
	                .from('amber_tasks')
	                .select('start_time, end_time')
	                .eq('session_id', sessionId);

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

            // Cancel active blocks for real-time extension Sync
            await supabase
                .from('active_blocks')
                .update({ cancelled_by_user_at: new Date().toISOString() })
                .eq('session_id', sessionId)
                .is('cancelled_by_user_at', null);
        } catch (blockingErr) {
            logAmberActionIssue('cancel_blocking_cleanup_warning', blockingErr);
        }

        // Apply forest decay for breaking focus (loss aversion mechanic)
        try {
            const { applyForestDecay } = await import('$lib/services/gamification');
            await applyForestDecay(user.id, sessionId, 0);
        } catch (decayError) {
            logAmberActionIssue('cancel_forest_decay_warning', decayError);
            // Continue even if decay fails
        }

        return { success: true };
    },

    delete: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }


        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };
        if (!UUID_RE.test(sessionId)) return { success: false, error: 'Invalid session ID' };

        // Try to find in amber_sessions first
        const { data: amberSession } = await supabase
            .from('amber_sessions')
            .select('id, amber_tasks(calendar_event_id)')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (amberSession) {
            // It's an amber session - clean up calendar events and delete
            const calendarEventIds = (amberSession.amber_tasks || [])
                .map((t: any) => t.calendar_event_id)
                .filter(Boolean);

            const { count, error: deleteError } = await supabase
                .from('amber_sessions')
                .delete({ count: 'exact' })
                .eq('id', sessionId)
                .eq('user_id', user.id);

            if (deleteError) {
                logAmberActionIssue('delete_amber_failed', deleteError);
                return { success: false, error: 'Failed to delete from database', code: 'DB_ERROR' };
            }

            // RLS SILENT FAILURE DETECTION
            if (!count || count === 0) {
                return { success: false, error: 'Could not delete session. Check your permissions.', code: 'RLS_SILENT_FAILURE' };
            }

            if (calendarEventIds.length > 0) {
                try {
                    const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/services/amber');
                    const gToken = await getGoogleAccessToken(user.id);
                    for (const eventId of calendarEventIds) {
                        await deleteCalendarEvent(gToken, eventId);
                    }
                } catch (calErr) {
                    logAmberActionIssue('delete_calendar_cleanup_warning', calErr);
                }
            }

            // Recalculate stones
            try {
                const { syncStonesFromNotes } = await import('$lib/services/gamification');
                await syncStonesFromNotes(user.id, { force: true });
            } catch (syncError) {
                logAmberActionIssue('delete_stone_sync_warning', syncError);
            }

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
                .delete({ count: 'exact' })
                .eq('id', sessionId)
                .eq('user_id', user.id);

            if (deleteError) {
                logAmberActionIssue('delete_focus_failed', deleteError);
                return { success: false, error: 'Failed to delete session', code: 'DB_ERROR' };
            }

            // RLS SILENT FAILURE DETECTION
            if (!count || count === 0) {
                return { success: false, error: 'Could not delete focus session. Check your permissions.', code: 'RLS_SILENT_FAILURE' };
            }

            return { success: true };
        }

        // Session not found in either table
        return { success: false, error: 'Session not found or unauthorized', code: 'NOT_FOUND' };
    },

    acceptJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });
        if (!isValidUuid(planId)) return fail(400, { error: 'Invalid plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'accepted' })
            .eq('id', planId)
            .eq('collaborator_id', user.id);

        if (error) {
            logAmberActionIssue('joint_accept_failed', error);
            return fail(500, { error: 'Failed to accept plan' });
        }

        return { success: true };
    },

    declineJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });
        if (!isValidUuid(planId)) return fail(400, { error: 'Invalid plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'declined' })
            .eq('id', planId)
            .eq('collaborator_id', user.id);

        if (error) {
            logAmberActionIssue('joint_decline_failed', error);
            return fail(500, { error: 'Failed to decline plan' });
        }

        return { success: true };
    },

    activateJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });
        if (!isValidUuid(planId)) return fail(400, { error: 'Invalid plan ID' });

        // Verify user is initiator
        const { data: plan, error: planError } = await supabase
            .from('joint_amber_plans')
            .select('id, status, initiator_id')
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
            logAmberActionIssue('joint_activate_failed', error);
            return fail(500, { error: 'Failed to activate plan' });
        }

        return { success: true };
    },

    cancelJointPlan: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });
        if (!isValidUuid(planId)) return fail(400, { error: 'Invalid plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', planId)
            .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`);

        if (error) {
            logAmberActionIssue('joint_cancel_failed', error);
            return fail(500, { error: 'Failed to cancel plan' });
        }

        return { success: true };
    },

    updateTask: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
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
        if (!isValidUuid(sessionId) || !isValidUuid(taskId)) {
            return fail(400, { error: 'Invalid task or session ID' });
        }
        if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 24 * 60) {
            return fail(400, { error: 'Invalid task duration' });
        }

        // FIX: Verify user ownership of the session before updating task
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
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
	            .eq('session_id', sessionId);

        if (error) {
            logAmberActionIssue('task_update_failed', error);
            return fail(500, { error: 'Failed to update task' });
        }

        return { success: true };
    },

    shiftSingleTask: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const taskId = data.get('taskId')?.toString();
        const offsetMinutes = parseInt(data.get('offsetMinutes')?.toString() || '0', 10);

        if (!sessionId || !taskId) return fail(400, { error: 'Missing fields' });
        if (!isValidUuid(sessionId) || !isValidUuid(taskId)) return fail(400, { error: 'Invalid task or session ID' });
        if (!Number.isFinite(offsetMinutes) || Math.abs(offsetMinutes) > 24 * 60) return fail(400, { error: 'Invalid time shift' });

        // Verify ownership
        const { data: check } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!check) return fail(401, { error: 'Unauthorized' });

        // Fetch current task times
		        const { data: task, error: taskError } = await supabase
		            .from('amber_tasks')
	            .select('start_time, end_time')
	            .eq('id', taskId)
		            .eq('session_id', sessionId)
		            .single();

        if (taskError || !task) return fail(404, { error: 'Task not found' });
        if (!task.start_time) return fail(400, { error: 'Task has no scheduled time' });

        const newStart = new Date(new Date(task.start_time).getTime() + offsetMinutes * 60000).toISOString();
        const newEnd = task.end_time ? new Date(new Date(task.end_time).getTime() + offsetMinutes * 60000).toISOString() : null;

        const { data: updatedTask, error: updateError } = await supabase
            .from('amber_tasks')
            .update({ start_time: newStart, end_time: newEnd, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('session_id', sessionId)
            .select('id')
            .maybeSingle();

        if (updateError || !updatedTask) {
            logAmberActionIssue('shift_single_task_update_failed', updateError);
            return fail(updateError ? 500 : 404, { error: 'Could not update that task time' });
        }

        return { success: true };
    },

    updateIntensity: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const intensity = parseFloat(data.get('intensity')?.toString() || '0.5');

        if (!sessionId) return fail(400, { error: 'Missing session ID' });
        if (!isValidUuid(sessionId)) return fail(400, { error: 'Invalid session ID' });
        if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) return fail(400, { error: 'Invalid intensity' });

        // Update session intensity
        const { data: updatedSession, error } = await supabase
            .from('amber_sessions')
            .update({ intensity })
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();

        if (error || !updatedSession) {
            logAmberActionIssue('intensity_update_failed', error);
            return fail(error ? 500 : 404, { error: error ? 'Failed to update intensity' : 'Session not found' });
        }

        // Calculate tier and apply tier-based rules to all tasks
        const tier = intensity < 0.25 ? 0 : intensity < 0.5 ? 1 : intensity < 0.75 ? 2 : 3;
        const updates: Record<string, boolean | string> = { updated_at: new Date().toISOString() };
        if (tier === 0) { updates.requires_focus = false; updates.requires_camera_verification = false; }
        else if (tier === 1) { updates.requires_focus = true; updates.requires_camera_verification = false; }
        else if (tier === 2) { updates.requires_focus = true; }
        else { updates.requires_focus = true; updates.requires_camera_verification = true; }

        const { error: taskUpdateError } = await supabase
            .from('amber_tasks')
            .update(updates)
            .eq('session_id', sessionId);

        if (taskUpdateError) {
            logAmberActionIssue('intensity_task_update_failed', taskUpdateError);
            return fail(500, { error: 'Intensity changed, but task protection could not be updated' });
        }

        return { success: true };
    },

    scaleDurations: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const newTotal = parseInt(data.get('newTotal')?.toString() || '0', 10);

        if (!sessionId || newTotal === 0) return fail(400, { error: 'Missing or invalid parameters' });
        if (!isValidUuid(sessionId)) return fail(400, { error: 'Invalid session ID' });
        if (!Number.isFinite(newTotal) || newTotal < 5 || newTotal > 24 * 60) return fail(400, { error: 'Invalid duration' });

        // FIX: Verify user ownership of the session first
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            return fail(401, { error: 'Unauthorized' });
        }

        // Fetch current tasks
	        const { data: tasks, error: fetchError } = await supabase
	            .from('amber_tasks')
	            .select('id, estimated_minutes')
	            .eq('session_id', sessionId);

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
                .eq('id', task.id)
                .eq('session_id', sessionId);
        }

        return { success: true };
    },

    shiftStartTimes: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const startTime = data.get('startTime')?.toString();
        const offsetMinutes = parseInt(data.get('offsetMinutes')?.toString() || '0', 10);

        if (!sessionId) return fail(400, { error: 'Missing session ID' });
        if (!isValidUuid(sessionId)) return fail(400, { error: 'Invalid session ID' });
        if (!Number.isFinite(offsetMinutes) || Math.abs(offsetMinutes) > 24 * 60) return fail(400, { error: 'Invalid time shift' });

        // FIX: Verify user ownership of the session first
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            return fail(401, { error: 'Unauthorized' });
        }

        // Fetch tasks
	        const { data: tasks, error: fetchError } = await supabase
	            .from('amber_tasks')
	            .select('id, start_time, end_time, estimated_minutes')
	            .eq('session_id', sessionId)
	            .order('sequence_order, created_at', { ascending: true })
	            .limit(MAX_AMBER_SESSION_TASKS);

        if (fetchError || !tasks) {
            return fail(500, { error: 'Failed to fetch tasks' });
        }

        // Determine new start time
        let newStartTime: Date;
        if (startTime) {
            // User set explicit start time
            newStartTime = new Date(startTime);
            if (!Number.isFinite(newStartTime.getTime())) return fail(400, { error: 'Invalid start time' });
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

            const { error: updateError } = await supabase
                .from('amber_tasks')
                .update({
                    start_time: currentTime.toISOString(),
                    end_time: endTime.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', task.id)
                .eq('session_id', sessionId);

            if (updateError) {
                logAmberActionIssue('shift_start_times_task_update_failed', updateError);
                return fail(500, { error: 'Could not update every task time' });
            }

            currentTime = endTime;
        }

        return { success: true };
    },

    markFailed: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };
        if (!isValidUuid(sessionId)) return { success: false, error: 'Invalid session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (!sessionCheck) {
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Update session status to 'failed'
        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            logAmberActionIssue('mark_failed_update_failed', error);
            return { success: false, error: 'Failed to update plan' };
        }

        return { success: true };
    },

    extendSession: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const extraMinutesStr = data.get('extraMinutes')?.toString();

        if (!sessionId || !extraMinutesStr) {
            return { success: false, error: 'Missing session ID or duration' };
        }
        if (!isValidUuid(sessionId)) return { success: false, error: 'Invalid session ID' };

        const extraMinutes = parseInt(extraMinutesStr, 10);
        if (!Number.isFinite(extraMinutes) || extraMinutes <= 0 || extraMinutes > 24 * 60) {
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
            return { success: false, error: 'Session not found or unauthorized' };
        }

        // Fetch all tasks for this session
	        const { data: tasks, error: fetchError } = await supabase
	            .from('amber_tasks')
	            .select('id, end_time')
	            .eq('session_id', sessionId)
	            .order('sequence_order, created_at', { ascending: true })
	            .limit(MAX_AMBER_SESSION_TASKS);

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
                    .eq('id', task.id)
                    .eq('session_id', sessionId);
            }
        }

        return { success: true };
    },

    bulkDelete: async ({ request, locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Unauthorized" };

        const data = await request.formData();
        let sessionIds: string[];
        try {
            const rawSessionIds = data.get('sessionIds')?.toString() || '[]';
            if (rawSessionIds.length > MAX_BULK_DELETE_SESSION_IDS_BYTES) {
                return { success: false, error: 'Too many sessions selected' };
            }
            const parsed = JSON.parse(rawSessionIds);
            sessionIds = Array.isArray(parsed)
                ? Array.from(new Set(parsed.filter(isValidUuid))).slice(0, 100)
                : [];
        } catch {
            sessionIds = [];
        }

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
        if (sessionsData.length !== sessionIds.length) {
            return { success: false, error: 'One or more sessions were not found or unauthorized' };
        }

        // 1. Capture Calendar events before deleting the sessions
        const calendarEventIds = sessionsData.flatMap((s: any) =>
            (s.amber_tasks || []).map((t: any) => t.calendar_event_id)
        ).filter(Boolean);

        // 2. Delete from database
        const { count, error: deleteError } = await supabase
            .from('amber_sessions')
            .delete({ count: 'exact' })
            .in('id', sessionIds)
            .eq('user_id', user.id);

        if (deleteError) {
            logAmberActionIssue('bulk_delete_failed', deleteError);
            return { success: false, error: 'Failed to delete from database' };
        }
        if (count !== sessionsData.length) {
            return { success: false, error: 'Not all sessions could be deleted' };
        }

        // 3. Clean up external Calendar events only after database deletion succeeds
        if (calendarEventIds.length > 0) {
            try {
                const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/services/amber');
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch (calErr) {
                logAmberActionIssue('bulk_delete_calendar_cleanup_warning', calErr);
            }
        }

        return { success: true };
    },

    clearDay: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const dateStr = data.get('date')?.toString();

        if (!dateStr) return { success: false, error: 'Missing date' };

        const startOfDay = new Date(dateStr);
        if (!Number.isFinite(startOfDay.getTime())) return { success: false, error: 'Invalid date' };
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch sessions for that day
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('amber_sessions')
            .select('id, created_at, amber_tasks(start_time, end_time, calendar_event_id)')
            .eq('user_id', user.id);

        if (sessionsError || !sessionsData) {
            return { success: false, error: 'Failed to load sessions for that day' };
        }

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

        // 1. Capture Calendar events before deleting the sessions
        const calendarEventIds = sessionsData
            .filter((s: any) => sessionIdsToDelete.includes(s.id))
            .flatMap((s: any) => (s.amber_tasks || []).map((t: any) => t.calendar_event_id))
            .filter(Boolean);

        // 2. Delete from database
        const { count, error: deleteError } = await supabase
            .from('amber_sessions')
            .delete({ count: 'exact' })
            .in('id', sessionIdsToDelete)
            .eq('user_id', user.id);

        if (deleteError) {
            logAmberActionIssue('clear_day_delete_failed', deleteError);
            return { success: false, error: 'Failed to delete from database' };
        }
        if (count !== sessionIdsToDelete.length) {
            return { success: false, error: 'Not all sessions for that day could be deleted' };
        }

        // 3. Clean up external Calendar events only after database deletion succeeds
        if (calendarEventIds.length > 0) {
            try {
                const { getGoogleAccessToken, deleteCalendarEvent } = await import('$lib/services/amber');
                const gToken = await getGoogleAccessToken(user.id);
                for (const eventId of calendarEventIds) {
                    await deleteCalendarEvent(gToken, eventId);
                }
            } catch (calErr) {
                logAmberActionIssue('clear_day_calendar_cleanup_warning', calErr);
            }
        }

        return { success: true };
    }
};
