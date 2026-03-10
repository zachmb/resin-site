import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/amber');
    }

    const { data: notes } = await supabase
        .from('amber_sessions')
        .select(`
            *,
            amber_tasks (*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    const normalizedNotes = (notes || []).map((note: any) => ({
        ...note,
        title: note.display_title ?? note.title ?? '',
        content: note.raw_text ?? note.content ?? '',
        amber_tasks: (note.amber_tasks || []).sort((a: any, b: any) => {
            if (a.start_time && b.start_time) {
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }
            return 0;
        })
    }));

    // Load joint amber plans
    const { data: jointPlans } = await supabase
        .from('joint_amber_plans')
        .select('*')
        .or(`initiator_id.eq.${session.user.id},collaborator_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

    return {
        notes: normalizedNotes,
        jointPlans: jointPlans || []
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

        // Update session status to 'scheduled'
        const { error: sessionError } = await supabase
            .from('amber_sessions')
            .update({ status: 'scheduled' })
            .eq('id', sessionId)
            .eq('user_id', session.user.id);

        if (sessionError) {
            console.error('Error activating plan:', sessionError);
            return { success: false, error: 'Failed to update session' };
        }

        // Fetch tasks to update start_time and end_time if needed
        const { data: tasks } = await supabase
            .from('amber_tasks')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (tasks && tasks.length > 0) {
            let currentTime = new Date();

            for (const task of tasks) {
                const estMins = task.estimated_minutes || 30;
                const endTime = new Date(currentTime.getTime() + estMins * 60000);

                await supabase
                    .from('amber_tasks')
                    .update({
                        start_time: currentTime.toISOString(),
                        end_time: endTime.toISOString()
                    })
                    .eq('id', task.id);

                currentTime = endTime;
            }
        }

        return { success: true };
    },

    complete: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

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

        return { success: true };
    },

    cancel: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

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
    }
};
