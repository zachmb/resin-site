import { recordDailyActivity, syncStonesFromNotes } from '$lib/services/gamification';

export const load = async ({ locals: { supabase, getSession }, depends }) => {
    depends('supabase:auth');
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

    // Avoid forcing stones/streak recalculation on every page load. Use stored profile data
    // and only initialize if the profile is missing key stats (new/empty profile).
    let initTotalStones: number | null = null;
    let initCurrentStreak: number | null = null;
    let initLongestStreak: number | null = null;
    let initLongestStreakAt: string | null = null;
    if (profile) {
        const hasAnySessions = normalizedNotes.length > 0;
        const needsStonesInit =
            profile.total_stones == null ||
            // Some older profiles defaulted to 0 even after the user had sessions.
            (profile.total_stones === 0 && hasAnySessions);
        const needsStreakInit =
            profile.current_streak == null ||
            profile.longest_streak == null ||
            profile.longest_streak_at == null ||
            // Backfill streaks for older profiles that never wrote these fields.
            ((profile.current_streak === 0 || profile.longest_streak === 0) && hasAnySessions);

        if (needsStonesInit) {
            initTotalStones = await syncStonesFromNotes(session.user.id);
        }
        if (needsStreakInit) {
            const stats = await recordDailyActivity(session.user.id);
            initCurrentStreak = stats.currentStreak;
            initLongestStreak = stats.longestStreak;
            initLongestStreakAt = stats.longestStreakAt;
        }
    }

    const normalizedProfile = profile ? {
        ...profile,
        total_stones: initTotalStones ?? profile.total_stones,
        current_streak: initCurrentStreak ?? profile.current_streak,
        longest_streak: initLongestStreak ?? profile.longest_streak,
        longest_streak_at: initLongestStreakAt ?? profile.longest_streak_at,
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
