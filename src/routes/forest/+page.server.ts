import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { generateForestTrees } from '$lib/forestGenerator';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    try {
        const session = await getSession();
        if (!session) {
            throw redirect(303, '/login?next=/forest');
        }

        const userId = session.user?.id;
        if (!userId) {
            throw redirect(303, '/login?next=/forest');
        }

        // Run all independent queries in parallel
        const [profileResult, sessionsResult, feedbackResult, achievementsResult] = await Promise.all([
            // Fetch profile
            supabase.from('profiles').select('*').eq('id', userId).single(),
            // Fetch sessions with tasks
            supabase
                .from('amber_sessions')
                .select(`
                    *,
                    amber_tasks (
                        estimated_minutes,
                        start_time,
                        end_time
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false }),
            // Fetch task feedback
            supabase
                .from('amber_task_feedback')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }),
            // Fetch achievements
            supabase
                .from('user_achievements')
                .select('achievement_id, unlocked_at, notified')
                .eq('user_id', userId)
                .order('unlocked_at', { ascending: false })
        ]);

        const { data: profile, error: profileError } = profileResult;
        if (profileError) {
            console.error('[Forest Load] Profile fetch error:', profileError);
            throw error(500, `Profile fetch failed: ${profileError.message}`);
        }
        if (!profile) {
            console.error('[Forest Load] Profile is null');
            throw error(404, 'User profile not found');
        }

        const { data: rawSessions } = sessionsResult;
        const { data: feedback } = feedbackResult;
        const { data: userAchievements } = achievementsResult;

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

    // Insights: Calculate execution metrics from already-loaded sessions
    const completedSessions = sessions.filter((s: any) => s.status === 'completed');
    let totalEstimated = 0;
    let totalActual = 0;
    let validTaskCount = 0;
    const hourCounts: Record<number, number> = {};

    // Use tasks already loaded from the sessions join
    for (const session of completedSessions) {
        for (const task of (session.amber_tasks || [])) {
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
        }
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

    // Recent estimation trend (use already-loaded tasks)
    const recentSessions = completedSessions.slice(0, 5);
    let recentEstimateVariance = 0;
    if (recentSessions.length > 0) {
        let recentEstimated = 0;
        let recentActual = 0;
        let recentCount = 0;

        for (const session of recentSessions) {
            for (const task of (session.amber_tasks || [])) {
                if (task.start_time && task.end_time) {
                    recentEstimated += task.estimated_minutes;
                    const startTime = new Date(task.start_time);
                    const endTime = new Date(task.end_time);
                    recentActual += Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                    recentCount++;
                }
            }
        }
        if (recentCount > 0) {
            recentEstimateVariance = Math.round((recentActual / recentEstimated) * 100);
        }
    }

    const estimationTrend = recentSessions.length > 0
        ? `Recent tasks ${recentEstimateVariance > 110 ? 'take' : 'finish'} ${Math.abs(recentEstimateVariance - 100)}% ${recentEstimateVariance > 110 ? 'longer' : 'faster'}`
        : 'Not enough data';

    // Generate actual forest trees from sessions (synced with iOS app)
    const forestTrees = generateForestTrees(sessions, profile.forest_health || 100);

    // Taste Profile: Process feedback for emotional landscape (already fetched)
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

    // Mark unnotified achievements as notified (toast fires once per page load)
    const unnotified = (userAchievements || []).filter((a: any) => !a.notified).map((a: any) => a.achievement_id);
    if (unnotified.length > 0) {
        await supabase
            .from('user_achievements')
            .update({ notified: true })
            .eq('user_id', userId)
            .in('achievement_id', unnotified);
    }

        return {
            profile,
            sessions: sessions || [],
            forestTrees,
            statusCounts,
            minutesByDay,
            totalFocusMinutes,
            longestSession,
            insights,
            userAchievements: userAchievements || [],
            newlyNotifiedAchievements: unnotified
        };
    } catch (err) {
        console.error('[Forest Load Error]', err);
        throw error(500, 'Failed to load forest page. Please try again.');
    }
};

export const actions: Actions = {
    unlockTree: async ({ request, locals: { supabase, getSession } }) => {
        try {
            const session = await getSession();
            if (!session) return fail(401, { error: 'Unauthorized' });

            const userId = session.user?.id;
            if (!userId) return fail(401, { error: 'Unauthorized' });

            const formData = await request.formData();
            const speciesId = formData.get('speciesId')?.toString();

            if (!speciesId) {
                return fail(400, { error: 'Missing species ID' });
            }

            // Fetch current profile data
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('total_stones, unlocked_tree_ids')
                .eq('id', userId)
                .single();

            if (fetchError || !profile) {
                return fail(500, { error: 'Failed to fetch profile' });
            }

            // Parse unlocked trees
            let unlockedTrees = Array.isArray(profile.unlocked_tree_ids)
                ? profile.unlocked_tree_ids
                : (profile.unlocked_tree_ids ? JSON.parse(profile.unlocked_tree_ids as any) : []);

            if (!Array.isArray(unlockedTrees)) {
                unlockedTrees = [];
            }

            // Check if already unlocked
            if (unlockedTrees.includes(speciesId)) {
                return fail(400, { error: 'Tree already unlocked' });
            }

            // Get tree cost from treeSpecies
            const treeCosts: Record<string, number> = {
                amber: 0, stone: 0, sprout: 0,
                pine: 5, oak: 10, cherry: 20, maple: 25, birch: 30, willow: 35, jasmine: 40, lavender: 45,
                redwood: 50, bamboo: 60, palm: 70, baobab: 80, sunflower: 90, iris: 100, sakura: 110, cypress: 130,
                moonlight: 150, starry: 170, aurora: 180, ancient: 200,
                crystalline: 250, phoenix: 300, eternal: 350,
                rockStack: 0
            };

            const cost = treeCosts[speciesId] || 0;

            // Free trees don't need stones
            if (cost === 0) {
                unlockedTrees.push(speciesId);
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        unlocked_tree_ids: unlockedTrees,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (updateError) {
                    return fail(500, { error: 'Failed to unlock tree' });
                }

                return { success: true, message: `${speciesId} unlocked!` };
            }

            // Check if user has enough stones
            if ((profile.total_stones || 0) < cost) {
                return fail(400, {
                    error: `Not enough stones. Need ${cost}, have ${profile.total_stones || 0}`
                });
            }

            // Deduct stones and add tree to unlocked list
            unlockedTrees.push(speciesId);
            const newStoneCount = (profile.total_stones || 0) - cost;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    total_stones: newStoneCount,
                    unlocked_tree_ids: unlockedTrees,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                return fail(500, { error: 'Failed to unlock tree' });
            }

            return {
                success: true,
                message: `Tree unlocked! -${cost} 🪨`,
                newStoneCount,
                unlockedTrees
            };
        } catch (err) {
            console.error('[Unlock Tree Error]:', err);
            return fail(500, { error: 'An unexpected error occurred' });
        }
    }
};
