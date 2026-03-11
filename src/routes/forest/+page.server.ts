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

    // Insights: Calculate execution metrics
    const completedSessions = sessions.filter((s: any) => s.status === 'completed');
    let totalEstimated = 0;
    let totalActual = 0;
    let validTaskCount = 0;
    const hourCounts: Record<number, number> = {};

    // Fetch task details for completed sessions
    const { data: tasksData } = await supabase
        .from('amber_tasks')
        .select('estimated_minutes, start_time, end_time')
        .in('amber_session_id', completedSessions.map((s: any) => s.id));

    if (tasksData) {
        tasksData.forEach((task: any) => {
            if (task.start_time && task.end_time) {
                const estimated = task.estimated_minutes;
                const startTime = new Date(task.start_time);
                const endTime = new Date(task.end_time);
                const actual = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

                totalEstimated += estimated;
                totalActual += actual;
                validTaskCount++;

                const hour = startTime.getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });
    }

    // Calculate estimates accuracy
    let estimateAccuracy = 'Not enough data';
    if (validTaskCount > 0) {
        const accuracy = Math.round((totalActual / totalEstimated) * 100);
        if (accuracy > 110) {
            estimateAccuracy = `Tasks take ${accuracy - 100}% longer than estimated`;
        } else if (accuracy > 95) {
            estimateAccuracy = 'Estimates are spot on';
        } else if (accuracy > 80) {
            estimateAccuracy = `Tasks finish ${100 - accuracy}% faster than expected`;
        } else {
            estimateAccuracy = `Tasks finish ${100 - accuracy}% faster than expected`;
        }
    }

    // Find most active hour
    const mostActiveHour = Object.entries(hourCounts).length > 0
        ? parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
        : null;

    // Recent estimation trend
    const recentSessions = completedSessions.slice(0, 5);
    let recentEstimateVariance = 0;
    if (recentSessions.length > 0) {
        let recentEstimated = 0;
        let recentActual = 0;
        let recentCount = 0;

        const { data: recentTasks } = await supabase
            .from('amber_tasks')
            .select('estimated_minutes, start_time, end_time')
            .in('amber_session_id', recentSessions.map((s: any) => s.id));

        if (recentTasks) {
            recentTasks.forEach((task: any) => {
                if (task.start_time && task.end_time) {
                    recentEstimated += task.estimated_minutes;
                    const startTime = new Date(task.start_time);
                    const endTime = new Date(task.end_time);
                    recentActual += Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                    recentCount++;
                }
            });
            if (recentCount > 0) {
                recentEstimateVariance = Math.round((recentActual / recentEstimated) * 100);
            }
        }
    }

    const estimationTrend = recentSessions.length > 0
        ? `Recent tasks ${recentEstimateVariance > 110 ? 'take' : 'finish'} ${Math.abs(recentEstimateVariance - 100)}% ${recentEstimateVariance > 110 ? 'longer' : 'faster'}`
        : 'Not enough data';

    // Taste Profile: Load feedback for emotional landscape
    const { data: feedback } = await supabase
        .from('amber_task_feedback')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    const feelingCounts: Record<string, number> = {};
    const enjoyedThings: { text: string; date: string }[] = [];

    for (const fb of (feedback || [])) {
        const comments = fb.comments || '';
        const feelingMatch = comments.match(/feeling:(\S+)/);
        if (feelingMatch) {
            feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
        }
        const enjoyedMatch = comments.match(/enjoyed:(.+)/);
        if (enjoyedMatch) {
            enjoyedThings.push({
                text: enjoyedMatch[1].trim(),
                date: new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });
        }
    }

    const insights = {
        totalCompleted: completedSessions.length,
        averageCompletionTime: Math.round(totalActual / Math.max(validTaskCount, 1)),
        estimateAccuracy,
        mostActiveHour,
        estimationTrend,
        feelingCounts,
        enjoyedThings: enjoyedThings.slice(0, 5),
        hasInsights: completedSessions.length > 0
    };

    return {
        profile,
        sessions: sessions || [],
        statusCounts,
        minutesByDay,
        totalFocusMinutes,
        longestSession,
        insights
    };
};
