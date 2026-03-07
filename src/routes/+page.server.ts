import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.getSession();

    if (!session) {
        return {
            session: null,
            profile: null,
            recentNotes: [],
            todayTasks: [],
            weeklyStats: null,
        };
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    // Week boundaries for heatmap
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    // 1. Profile
    const { data: profile } = await locals.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Recent Notes (amber_sessions)
    const { data: recentNotes } = await locals.supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

    // 3. Today's Tasks
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

    // 4. All sessions this week (for heatmap + stats)
    const { data: weekSessions } = await locals.supabase
        .from('amber_sessions')
        .select('id, display_title, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfWeek.toISOString())
        .order('created_at', { ascending: true });

    // 5. All tasks this week (for focus minutes)
    const { data: weekTasks } = await locals.supabase
        .from('amber_tasks')
        .select('id, title, estimated_minutes, requires_focus, start_time, end_time, amber_sessions!inner(user_id)')
        .eq('amber_sessions.user_id', userId)
        .gte('start_time', startOfWeek.toISOString())
        .order('start_time', { ascending: true });

    // 6. Recent feedback (for taste insights)
    const { data: feedback } = await locals.supabase
        .from('amber_task_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    // Build weekly stats
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap: { day: string; date: string; sessions: number; focusMinutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySessions = (weekSessions || []).filter((s: any) => s.created_at?.startsWith(dateStr));
        const dayTasks = (weekTasks || []).filter((t: any) => t.start_time?.startsWith(dateStr));
        const focusMins = dayTasks.reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0);
        heatmap.push({
            day: dayNames[d.getDay()],
            date: dateStr,
            sessions: daySessions.length,
            focusMinutes: focusMins,
        });
    }

    const totalFocusMinutes = heatmap.reduce((s, d) => s + d.focusMinutes, 0);
    const totalSessions = (weekSessions || []).length;
    const scheduledPlans = (weekSessions || []).filter((s: any) => s.status === 'scheduled').length;

    // Extract taste signals from feedback
    const feelingCounts: Record<string, number> = {};
    const enjoyedThings: string[] = [];
    for (const fb of (feedback || [])) {
        const comments = fb.comments || '';
        const feelingMatch = comments.match(/feeling:(\S+)/);
        if (feelingMatch) {
            feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
        }
        const enjoyedMatch = comments.match(/enjoyed:(.+)/);
        if (enjoyedMatch) {
            enjoyedThings.push(enjoyedMatch[1].trim());
        }
    }

    const avgRating = (feedback || []).length > 0
        ? (feedback || []).reduce((s: number, f: any) => s + (f.rating || 0), 0) / (feedback || []).length
        : 0;

    const weeklyStats = {
        heatmap,
        totalFocusMinutes,
        totalSessions,
        scheduledPlans,
        avgRating: Math.round(avgRating * 10) / 10,
        topFeeling: Object.entries(feelingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        feelingCounts,
        enjoyedThings: enjoyedThings.slice(0, 5),
        feedbackCount: (feedback || []).length,
    };

    return {
        session,
        profile,
        recentNotes: recentNotes || [],
        todayTasks: todayTasks || [],
        weeklyStats,
    };
};
