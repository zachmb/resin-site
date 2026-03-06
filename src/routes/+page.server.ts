import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.getSession();

    if (!session) {
        return {
            session: null,
            profile: null,
            recentNotes: [],
            todayTasks: []
        };
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    // 1. Fetch Profile
    const { data: profile } = await locals.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Fetch Recent Notes (amber_sessions)
    const { data: recentNotes } = await locals.supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

    // 3. Fetch Today's Tasks
    // We join with sessions to ensure they belong to the user
    const { data: todayTasks } = await locals.supabase
        .from('amber_tasks')
        .select(`
            *,
            amber_sessions!inner(user_id)
        `)
        .eq('amber_sessions.user_id', userId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

    return {
        session,
        profile,
        recentNotes: recentNotes || [],
        todayTasks: todayTasks || []
    };
};
