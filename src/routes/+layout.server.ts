export const load = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        return {
            session: null,
            notes: [],
            profile: null
        };
    }

    const { data: notes } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    const normalizedNotes = (notes || []).map((note: any) => ({
        ...note,
        title: note.display_title ?? note.title ?? '',
        content: note.raw_text ?? note.content ?? ''
    }));

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    const normalizedProfile = profile ? {
        ...profile,
        sync_notes: profile.sync_notes ?? true
    } : null;

    // Check for active focus sessions (manual or planned)
    const now = new Date().toISOString();

    // 1. Check for manual "Block Now" sessions
    const { data: manualSessions } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .lte('start_time', Date.now() / 1000)
        .gte('end_time', Date.now() / 1000)
        .limit(1);

    // 2. Check for Amber Plan focus tasks
    const { data: plannedTasks } = await supabase
        .from('amber_tasks')
        .select('*, amber_sessions!inner(user_id)')
        .eq('amber_sessions.user_id', session.user.id)
        .eq('requires_focus', true)
        .lte('start_time', now)
        .gte('end_time', now)
        .limit(1);

    const activeSession = (manualSessions && manualSessions.length > 0)
        ? { type: 'manual', ...manualSessions[0] }
        : (plannedTasks && plannedTasks.length > 0)
            ? { type: 'planned', ...plannedTasks[0] }
            : null;

    // Get friend counts for nav badge
    const { data: friendRequests } = await supabase
        .from('friendships')
        .select('id')
        .eq('addressee_id', session.user.id)
        .eq('status', 'pending');

    const pendingFriendCount = (friendRequests || []).length;

    return {
        session,
        notes: normalizedNotes,
        profile: normalizedProfile,
        activeSession,
        pendingFriendCount
    };
}
