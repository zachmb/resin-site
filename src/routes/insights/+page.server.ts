import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/insights');
    }

    // Fetch completed amber sessions with their tasks
    const { data: completedSessions } = await supabase
        .from('amber_sessions')
        .select(`
            id,
            display_title,
            status,
            created_at,
            amber_tasks(
                estimated_minutes,
                start_time,
                end_time
            )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

    // Fetch user profile for streak and stone info
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // Calculate insights from completed sessions
    const insights = calculateInsights(completedSessions || []);

    return {
        profile,
        completedSessions: completedSessions || [],
        insights,
    };
};

interface Task {
    estimated_minutes: number;
    start_time: string | null;
    end_time: string | null;
}

interface Session {
    created_at: string;
    amber_tasks: Task[];
}

interface Insights {
    totalCompleted: number;
    averageCompletionTime: number;
    estimateAccuracy: string;
    mostActiveHour: number | null;
    completionStreak: number;
    estimationTrend: string;
}

function calculateInsights(sessions: Session[]): Insights {
    if (sessions.length === 0) {
        return {
            totalCompleted: 0,
            averageCompletionTime: 0,
            estimateAccuracy: 'No data',
            mostActiveHour: null,
            completionStreak: 0,
            estimationTrend: 'Not enough data',
        };
    }

    let totalEstimated = 0;
    let totalActual = 0;
    let validTaskCount = 0;
    const hourCounts: Record<number, number> = {};

    sessions.forEach((session) => {
        session.amber_tasks.forEach((task) => {
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
    });

    const averageEstimated = validTaskCount > 0 ? totalEstimated / validTaskCount : 0;
    const averageActual = validTaskCount > 0 ? totalActual / validTaskCount : 0;

    // Calculate estimation accuracy
    let estimateAccuracy = 'Not enough data';
    if (validTaskCount > 0) {
        const accuracy = Math.round((averageActual / averageEstimated) * 100);
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

    // Calculate completion streak (consecutive days with completed tasks)
    const completionsByDay = new Map<string, number>();
    sessions.forEach((session) => {
        const day = new Date(session.created_at).toISOString().split('T')[0];
        completionsByDay.set(day, (completionsByDay.get(day) || 0) + 1);
    });

    const sortedDays = Array.from(completionsByDay.keys()).sort().reverse();
    let completionStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const day of sortedDays) {
        const dayDate = new Date(day);
        const daysDiff = Math.floor((currentDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === completionStreak) {
            completionStreak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    // Estimation trend
    const recentSessions = sessions.slice(0, 5);
    let recentEstimateVariance = 0;
    if (recentSessions.length > 0) {
        let recentEstimated = 0;
        let recentActual = 0;
        let recentCount = 0;

        recentSessions.forEach((session) => {
            session.amber_tasks.forEach((task) => {
                if (task.start_time && task.end_time) {
                    recentEstimated += task.estimated_minutes;
                    const startTime = new Date(task.start_time);
                    const endTime = new Date(task.end_time);
                    recentActual += Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                    recentCount++;
                }
            });
        });

        if (recentCount > 0) {
            recentEstimateVariance = Math.round((recentActual / recentEstimated) * 100);
        }
    }

    const estimationTrend = recentSessions.length > 0
        ? `Recent tasks ${recentEstimateVariance > 110 ? 'take' : 'finish'} ${Math.abs(recentEstimateVariance - 100)}% ${recentEstimateVariance > 110 ? 'longer' : 'faster'}`
        : 'Not enough data';

    return {
        totalCompleted: sessions.length,
        averageCompletionTime: Math.round(averageActual),
        estimateAccuracy,
        mostActiveHour,
        completionStreak,
        estimationTrend,
    };
}
