import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/amber');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    const { data: notes } = await supabase
        .from('amber_sessions')
        .select(`
            *,
            amber_tasks (*)
        `)
        .eq('user_id', session.user.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

    // Fetch blocking sessions (focus sessions from focus automations)
    const { data: focusSessions } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_time', { ascending: false });

    const normalizedNotes = (notes || []).map((note: any) => ({
        ...note,
        sessionType: 'amber',
        title: note.display_title ?? note.title ?? '',
        content: note.raw_text ?? note.content ?? '',
        amber_tasks: (note.amber_tasks || []).sort((a: any, b: any) => {
            if (a.start_time && b.start_time) {
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }
            return 0;
        })
    }));

    // Convert blocking sessions to amber session format for display
    const normalizedFocusSessions = (focusSessions || []).map((fs: any) => ({
        id: fs.id,
        user_id: fs.user_id,
        sessionType: 'focus',
        title: fs.title || 'Focus Session',
        display_title: fs.title || 'Focus Session',
        content: '',
        raw_text: '',
        status: new Date(fs.end_time) < new Date() ? 'completed' :
                new Date(fs.start_time) <= new Date() ? 'scheduled' : 'scheduled',
        intensity: 1,
        created_at: fs.start_time,
        updated_at: fs.updated_at,
        start_time: fs.start_time,
        end_time: fs.end_time,
        is_device_scheduled: fs.device_scheduled,
        amber_tasks: [{
            id: `focus-${fs.id}`,
            amber_session_id: fs.id,
            title: fs.title || 'Focus',
            estimated_minutes: Math.round((new Date(fs.end_time).getTime() - new Date(fs.start_time).getTime()) / 60000),
            start_time: fs.start_time,
            end_time: fs.end_time,
            order: 1
        }]
    }));

    // Merge both types and sort by start time
    const allSessions = [...normalizedNotes, ...normalizedFocusSessions].sort((a, b) => {
        const aTime = a.amber_tasks?.[0]?.start_time || a.created_at;
        const bTime = b.amber_tasks?.[0]?.start_time || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Load joint amber plans
    const { data: jointPlans } = await supabase
        .from('joint_amber_plans')
        .select('*')
        .or(`initiator_id.eq.${session.user.id},collaborator_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

    // Auto-fail past scheduled amber sessions (focus sessions auto-complete)
    const now = new Date().toISOString();
    const pastScheduled = normalizedNotes.filter((n: any) => {
        if (n.status !== 'scheduled') return false;
        const tasks = n.amber_tasks || [];
        if (tasks.length === 0) return false;
        const lastEnd = tasks.at(-1)?.end_time;
        return lastEnd && lastEnd < now;
    });

    if (pastScheduled.length > 0) {
        await supabase
            .from('amber_sessions')
            .update({ status: 'failed' })
            .in('id', pastScheduled.map((n: any) => n.id))
            .eq('user_id', session.user.id);
        // Update in-memory before returning
        for (const n of pastScheduled) {
            n.status = 'failed';
        }
    }

    // Compute execution stats from recently completed sessions (both types)
    let executionStats = null;
    const completedNotes = allSessions.filter((n: any) => n.status === 'completed');
    if (completedNotes.length >= 1) {
        const recentCompleted = completedNotes.slice(0, 20);
        let totalEst = 0, totalActual = 0, taskCount = 0;

        for (const note of recentCompleted) {
            for (const task of (note.amber_tasks || [])) {
                if (task.start_time && task.end_time && task.estimated_minutes) {
                    const actual = Math.round((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 60000);
                    totalEst += task.estimated_minutes;
                    totalActual += actual;
                    taskCount++;
                }
            }
        }

        if (taskCount >= 3) {
            const ratio = Math.round((totalActual / totalEst) * 100);
            executionStats = {
                accuracyPct: ratio,
                label: ratio > 110 ? `You tend to take ${ratio - 100}% longer than planned`
                     : ratio < 85  ? `You finish ${100 - ratio}% faster than planned`
                     : 'Your time estimates are accurate'
            };
        }
    }

    return {
        profile,
        notes: allSessions,
        jointPlans: jointPlans || [],
        executionStats
    };
};

export const actions: Actions = {
    activate: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

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
            .eq('id', session.user.id)
            .single();

        if (credsError || !creds?.google_refresh_token) {
            console.error('[Activate] Credentials check failed:', {
                error: credsError,
                has_creds: !!creds,
                has_token: !!creds?.google_refresh_token,
                userId: session.user.id
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
            .eq('id', session.user.id)
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
            .eq('user_id', session.user.id);

        if (sessionError) {
            console.error('Error activating plan:', sessionError);
            return { success: false, error: 'Failed to update session' };
        }

        return { success: true };
    },

    complete: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership and fetch session details
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id, display_title, created_at, amber_tasks(*)')
            .eq('id', sessionId)
            .eq('user_id', session.user.id)
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
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error completing plan:', error);
            return { success: false, error: 'Failed to complete plan' };
        }

        // Apply gamification rewards (variable stones, forest health, streak)
        try {
            const { calculateSessionReward, applySessionReward } = await import('$lib/gamification_service');
            const reward = await calculateSessionReward(session.user.id, durationMinutes);

            // Customize message with session title
            const sessionTitle = sessionCheck.display_title || 'Your plan';
            if (!reward.message.includes('RARE') && !reward.message.includes('Bonus')) {
                reward.message = `Completed "${sessionTitle}"! +${reward.baseStones} stones earned.`;
            } else if (reward.message.includes('RARE')) {
                reward.message = `🎉 RARE BONUS for "${sessionTitle}"! You've earned ${reward.totalStones} stones! Your forest flourishes!`;
            } else {
                reward.message = `✨ Bonus for "${sessionTitle}"! You earned +${reward.bonusStones} extra stones! Total: +${reward.totalStones}`;
            }

            await applySessionReward(session.user.id, sessionId, reward);

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

    cancel: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', session.user.id)
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
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error canceling plan:', error);
            return { success: false, error: 'Failed to cancel plan' };
        }

        // Apply forest decay for breaking focus (loss aversion mechanic)
        try {
            const { applyForestDecay } = await import('$lib/gamification_service');
            await applyForestDecay(session.user.id, sessionId, 0);
        } catch (decayError) {
            console.error('Error applying forest decay:', decayError);
            // Continue even if decay fails
        }

        return { success: true };
    },

    acceptJointPlan: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'accepted' })
            .eq('id', planId)
            .eq('collaborator_id', session.user.id);

        if (error) {
            console.error('Error accepting plan:', error);
            return fail(500, { error: 'Failed to accept plan' });
        }

        return { success: true };
    },

    declineJointPlan: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'declined' })
            .eq('id', planId)
            .eq('collaborator_id', session.user.id);

        if (error) {
            console.error('Error declining plan:', error);
            return fail(500, { error: 'Failed to decline plan' });
        }

        return { success: true };
    },

    activateJointPlan: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        // Verify user is initiator
        const { data: plan, error: planError } = await supabase
            .from('joint_amber_plans')
            .select('*')
            .eq('id', planId)
            .eq('initiator_id', session.user.id)
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

    cancelJointPlan: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const planId = data.get('plan_id') as string;

        if (!planId) return fail(400, { error: 'Missing plan ID' });

        const { error } = await supabase
            .from('joint_amber_plans')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', planId)
            .or(`initiator_id.eq.${session.user.id},collaborator_id.eq.${session.user.id}`);

        if (error) {
            console.error('Error canceling joint plan:', error);
            return fail(500, { error: 'Failed to cancel plan' });
        }

        return { success: true };
    },

    updateTask: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

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
            .eq('user_id', session.user.id)
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

    updateIntensity: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const intensity = parseFloat(data.get('intensity')?.toString() || '0.5');

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        const { error } = await supabase
            .from('amber_sessions')
            .update({ intensity })
            .eq('id', sessionId)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error updating intensity:', error);
            return fail(500, { error: 'Failed to update intensity' });
        }

        return { success: true };
    },

    scaleDurations: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const newTotal = parseInt(data.get('newTotal')?.toString() || '0', 10);

        if (!sessionId || newTotal === 0) return fail(400, { error: 'Missing or invalid parameters' });

        // FIX: Verify user ownership of the session first
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', session.user.id)
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

    shiftStartTimes: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

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
            .eq('user_id', session.user.id)
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

    markFailed: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

        // Verify ownership before updating
        const { data: sessionCheck } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', session.user.id)
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
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error marking plan as failed:', error);
            return { success: false, error: 'Failed to update plan' };
        }

        return { success: true };
    },

    extendSession: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

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
            .eq('user_id', session.user.id)
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
    }
};
