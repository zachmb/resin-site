import { redirect } from '@sveltejs/kit';
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

    return {
        notes: normalizedNotes
    };
};

export const actions: Actions = {
    activate: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return { success: false, error: 'Missing session ID' };

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
    }
};
