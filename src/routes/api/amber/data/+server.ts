import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { getUser, getAuthenticatedSupabase } }) => {
    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await getAuthenticatedSupabase();

        // Fetch user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Fetch amber sessions (non-draft)
        const { data: notes } = await supabase
            .from('amber_sessions')
            .select(`
                *,
                amber_tasks (*)
            `)
            .eq('user_id', user.id)
            .neq('status', 'draft')
            .order('created_at', { ascending: false });

        // Fetch blocking sessions (focus sessions)
        const { data: focusSessions } = await supabase
            .from('blocking_sessions')
            .select('*')
            .eq('user_id', user.id)
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

        // Convert blocking sessions to amber format
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

        // Merge and sort
        const allSessions = [...normalizedNotes, ...normalizedFocusSessions].sort((a, b) => {
            const aTime = a.amber_tasks?.[0]?.start_time || a.created_at;
            const bTime = b.amber_tasks?.[0]?.start_time || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        // Fetch joint plans
        const { data: jointPlans } = await supabase
            .from('joint_amber_plans')
            .select('*')
            .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

        return json({
            sessions: allSessions,
            jointPlans: jointPlans || [],
            profile,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[api/amber/data] Error:', error);
        return json(
            { error: 'Failed to fetch amber data' },
            { status: 500 }
        );
    }
};
