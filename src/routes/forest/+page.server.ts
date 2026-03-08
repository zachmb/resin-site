import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/forest');
    }

    // 1. Fetch user profile for stats
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // 2. Fetch amber sessions for trees/stones, including tasks for total time
    const { data: rawSessions } = await supabase
        .from('amber_sessions')
        .select(`
            *,
            amber_tasks (
                estimated_minutes
            )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    const sessions = (rawSessions || []).map((s: any) => {
        const focusMinutes = (s.amber_tasks || []).reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0);
        return {
            ...s,
            focusMinutes
        };
    });

    // Analytics: session status breakdown
    const statusCounts = { completed: 0, scheduled: 0, canceled: 0, draft: 0, failed: 0 };
    sessions.forEach((s: any) => {
        if (s.status in statusCounts) {
            statusCounts[s.status as keyof typeof statusCounts]++;
        }
    });

    // Analytics: focus minutes by day of week (0=Mon ... 6=Sun)
    const minutesByDay = Array(7).fill(0);
    sessions.forEach((s: any) => {
        if (s.status === 'completed' || s.status === 'scheduled') {
            const day = (new Date(s.created_at).getDay() + 6) % 7; // convert Sun=0 -> Mon=0
            minutesByDay[day] += s.focusMinutes;
        }
    });

    // Analytics: total focused time + longest session
    const totalFocusMinutes = sessions.reduce((acc: number, s: any) => acc + s.focusMinutes, 0);
    const longestSession = sessions.reduce((max: number, s: any) => s.focusMinutes > max ? s.focusMinutes : max, 0);

    return {
        profile,
        sessions: sessions || [],
        statusCounts,
        minutesByDay,
        totalFocusMinutes,
        longestSession
    };
};
