import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

function dateStringInTimeZone(date: Date, timeZone: string): string {
    // Produces YYYY-MM-DD for the provided timezone.
    // Using Intl avoids relying on server timezone offsets.
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
    return parts; // en-CA formats as YYYY-MM-DD
}

export interface RewardOutcome {
    baseStones: number;
    bonusStones: number;
    totalStones: number;
    forestHealthGain: number;
    isBonusTriggered: boolean;
    celebrationLevel: 'standard' | 'bonus' | 'rare';
    message: string;
    rewardSources?: string[]; // Track which bonuses were applied
    achievements?: string[]; // Newly unlocked achievements
}

export interface EngagementBonus {
    type: 'daily_first' | 'streak_milestone' | 'weekly_challenge' | 'consistency' | 'long_session';
    stones: number;
    healthGain: number;
    message: string;
}

/**
 * Calculate variable-ratio reward based on session history and randomness
 * Uses unpredictable bonuses to create dopamine engagement (variable ratio schedule)
 */
export async function calculateSessionReward(userId: string, sessionDurationMinutes: number): Promise<RewardOutcome> {
    const baseStones = 3; // Base award for every completion

    // Fetch user's recent session history for streak calculation
    const { data: recentSessions } = await admin
        .from('amber_sessions')
        .select('status, bonus_stones_awarded, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('created_at', { ascending: false });

    const completedCount = (recentSessions || []).filter((s: any) => s.status === 'completed').length;

    // Get current profile for streak tracking
    const { data: profile } = await admin
        .from('profiles')
        .select('sessions_completed_streak, last_session_date, forest_health')
        .eq('id', userId)
        .single();

    // Variable ratio: ~20% chance of bonus, increasing slightly with streak
    const bonusChance = 0.2 + (Math.min(profile?.sessions_completed_streak || 0, 10) * 0.01);
    const triggerBonus = Math.random() < bonusChance;

    // If bonus triggered, award 2-5 extra stones (unpredictable)
    const bonusStones = triggerBonus ? Math.floor(Math.random() * 4) + 2 : 0;
    const totalStones = baseStones + bonusStones;

    // Forest health improves with successful sessions
    // More bonus = more forest growth
    const forestHealthGain = triggerBonus ? Math.floor(Math.random() * 8) + 5 : 3;

    // Determine celebration level (visual/audio feedback intensity)
    let celebrationLevel: 'standard' | 'bonus' | 'rare' = 'standard';
    let message = `Great focus session! +${baseStones} stones earned.`;

    if (bonusStones >= 4) {
        celebrationLevel = 'rare';
        message = `🎉 RARE BONUS! You've earned ${totalStones} stones! Your forest flourishes!`;
    } else if (bonusStones > 0) {
        celebrationLevel = 'bonus';
        message = `✨ Bonus! You earned +${bonusStones} extra stones! Total: +${totalStones} stones`;
    }

    return {
        baseStones,
        bonusStones,
        totalStones,
        forestHealthGain,
        isBonusTriggered: triggerBonus,
        celebrationLevel,
        message
    };
}

/**
 * Detect engagement bonuses like daily streaks, milestone bonuses, etc.
 */
export async function detectEngagementBonuses(userId: string, newStreak: number, lastSessionDate: Date | null): Promise<EngagementBonus[]> {
    const bonuses: EngagementBonus[] = [];
    const now = new Date();

    // Detect "Daily First" bonus - first session of the day
    const isFirstOfDay = !lastSessionDate ||
        (now.getTime() - new Date(lastSessionDate).getTime()) > 18 * 60 * 60 * 1000;

    if (isFirstOfDay) {
        bonuses.push({
            type: 'daily_first',
            stones: 1,
            healthGain: 2,
            message: '🌅 Daily First! Consistency matters.'
        });
    }

    // Detect milestone bonuses at streak multiples
    if (newStreak > 1 && newStreak % 5 === 0) {
        const milestoneBonus = Math.floor(newStreak / 5) * 2; // 2 stones per 5-day milestone
        bonuses.push({
            type: 'streak_milestone',
            stones: milestoneBonus,
            healthGain: 5,
            message: `🔥 ${newStreak}-Day Streak! +${milestoneBonus} stones`
        });
    }

    // Detect weekly challenge bonus (7, 14, 21 day streaks)
    if ([7, 14, 21, 30].includes(newStreak)) {
        bonuses.push({
            type: 'weekly_challenge',
            stones: 3 + (newStreak / 7),
            healthGain: 8,
            message: `🏆 ${newStreak}-Day Milestone! Your forest celebrates!`
        });
    }

    // Consistency bonus: 3+ sessions in a row (no missed days)
    if (newStreak >= 3 && newStreak % 3 === 0) {
        bonuses.push({
            type: 'consistency',
            stones: 1,
            healthGain: 3,
            message: '⭐ Consistency unlocked! Keep the rhythm.'
        });
    }

    return bonuses;
}

/**
 * Sync the total_stones count in profiles based on the count of amber_sessions.
 * This ensures the 1 note = 1 stone rule.
 * FIX: Only update if the count has actually changed to avoid redundant writes.
 */
export async function syncStonesFromNotes(
    userId: string,
    opts?: { force?: boolean }
): Promise<number> {
    const force = opts?.force === true;
    const { count, error } = await admin
        .from('amber_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error('[Gamification] Error counting sessions:', error);
        return 0;
    }

    const totalStones = count || 0;

    // Fetch existing stones to avoid overwriting a higher count (e.g. from local iOS notes not yet synced)
    const { data: profile } = await admin
        .from('profiles')
        .select('total_stones')
        .eq('id', userId)
        .single();

    if (!force && profile && profile.total_stones > totalStones) {
        console.log(`[Gamification] Skipping stone sync for ${userId}: Profile has ${profile.total_stones}, DB sessions only has ${totalStones}`);
        return profile.total_stones;
    }

    await admin
        .from('profiles')
        .update({
            total_stones: totalStones,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    console.log(`[Gamification] Stones synced for ${userId}: ${totalStones}`);
    return totalStones;
}

/**
 * Calculate the longest streak and the date it was achieved from historical amber_sessions.
 */
export async function calculateLongestStreakFromHistory(
    userId: string,
    timeZone: string = 'UTC'
): Promise<{ longestStreak: number; longestStreakAt: string | null }> {
    const { data: sessions, error } = await admin
        .from('amber_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error || !sessions || sessions.length === 0) {
        return { longestStreak: 0, longestStreakAt: null };
    }

    const uniqueDates = Array.from(
        new Set(
            sessions
                .map((s: any) => {
                    const d = new Date(s.created_at);
                    if (Number.isNaN(d.getTime())) return null;
                    return dateStringInTimeZone(d, timeZone);
                })
                .filter(Boolean) as string[]
        )
    ).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let longestStreakAt: string | null = null;
    let lastDate: Date | null = null;

    for (const dateStr of uniqueDates) {
        const currentDate = new Date(dateStr);
        
        if (lastDate) {
            const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak += 1;
            } else {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }

        // Only update the "at" date when we truly exceed the previous max to avoid
        // shifting `longest_streak_at` forward on ties during recalculation.
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            longestStreakAt = dateStr;
        }
        
        lastDate = currentDate;
    }

    return { longestStreak, longestStreakAt };
}

/**
 * Log a daily visit and update the usage streak.
 * Safe to call multiple times per day.
 */
export async function recordDailyActivity(userId: string): Promise<{ currentStreak: number; longestStreak: number; longestStreakAt: string | null }> {
    const now = new Date();

    const { data: profile } = await admin
        .from('profiles')
        .select('current_streak, longest_streak, longest_streak_at, last_active_date, timezone')
        .eq('id', userId)
        .single();

    if (!profile) {
        // Profile doesn't exist yet (new user) - return defaults
        return { currentStreak: 0, longestStreak: 0, longestStreakAt: null };
    }

    const timeZone = (profile as any)?.timezone || 'UTC';
    const todayStr = dateStringInTimeZone(now, timeZone);

    const history = await calculateLongestStreakFromHistory(userId, timeZone);
    const existingLongest = profile.longest_streak || 0;
    const historyLongest = history.longestStreak || 0;

    // Never decrease `longest_streak` during recalculation; preserve the matching date.
    let newLongest = existingLongest >= historyLongest ? existingLongest : historyLongest;
    let longestStreakAt: string | null = profile.longest_streak_at ?? null;

    if (historyLongest > existingLongest) {
        longestStreakAt = history.longestStreakAt ?? longestStreakAt;
    } else if (!longestStreakAt) {
        // If we don't have a date stored, fall back to history without changing the streak value.
        longestStreakAt = history.longestStreakAt ?? null;
    }

    const lastActive = profile.last_active_date ? new Date(profile.last_active_date) : null;
    const lastActiveStr = lastActive ? dateStringInTimeZone(lastActive, timeZone) : null;

    let newStreak = profile.current_streak || 0;

    if (lastActiveStr === todayStr) {
        // Already recorded today: don't change current streak, but still persist any
        // historical longest-streak correction we computed above.
        if (
            newLongest !== existingLongest ||
            (longestStreakAt && longestStreakAt !== (profile.longest_streak_at ?? null))
        ) {
            await admin
                .from('profiles')
                .update({
                    longest_streak: newLongest,
                    longest_streak_at: longestStreakAt,
                    updated_at: now.toISOString()
                })
                .eq('id', userId);
        }
        return { currentStreak: newStreak, longestStreak: newLongest, longestStreakAt };
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = dateStringInTimeZone(yesterday, timeZone);

    if (lastActiveStr === yesterdayStr) {
        newStreak += 1;
    } else {
        newStreak = 1;
    }

    if (newStreak > newLongest) {
        newLongest = newStreak;
        longestStreakAt = todayStr;
    }

    await admin
        .from('profiles')
        .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            longest_streak_at: longestStreakAt,
            last_active_date: now.toISOString(),
            updated_at: now.toISOString()
        })
        .eq('id', userId);

    console.log(`[Gamification] Activity recorded for ${userId}: Streak ${newStreak}, Longest ${newLongest} at ${longestStreakAt}`);
    return { currentStreak: newStreak, longestStreak: newLongest, longestStreakAt: longestStreakAt };
}

/**
 * Apply session completion rewards and update user profiles
 */
export async function applySessionReward(
    userId: string,
    sessionId: string,
    reward: RewardOutcome
): Promise<void> {
    const now = new Date();

    // Get current profile
    const { data: profile } = await admin
        .from('profiles')
        .select('total_stones, sessions_completed_streak, last_session_date, forest_health')
        .eq('id', userId)
        .single();

    if (!profile) throw new Error('Profile not found');

    // Calculate streak: reset if more than 24 hours since last session
    const lastSession = profile.last_session_date ? new Date(profile.last_session_date) : null;
    const hoursSinceLastSession = lastSession ? (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60) : 25;
    const newStreak = hoursSinceLastSession > 24 ? 1 : (profile.sessions_completed_streak || 0) + 1;

    // Detect and apply engagement bonuses
    const engagementBonuses = await detectEngagementBonuses(userId, newStreak, lastSession);
    let totalBonusStones = reward.totalStones;
    let totalHealthGain = reward.forestHealthGain;
    const bonusMessages: string[] = [];

    for (const bonus of engagementBonuses) {
        totalBonusStones += bonus.stones;
        totalHealthGain += bonus.healthGain;
        bonusMessages.push(bonus.message);
    }

    // Update profile with stones, streak, forest health
    const newForestHealth = Math.min(100, (profile.forest_health || 0) + totalHealthGain);

    // Standardize daily streak tracking alongside session streak
    const { currentStreak, longestStreak } = await recordDailyActivity(userId);

    // Sync stones based on note count (1 note = 1 stone)
    const stonesCount = await syncStonesFromNotes(userId);

    await admin
        .from('profiles')
        .update({
            sessions_completed_streak: newStreak,
            last_session_date: now.toISOString(),
            forest_health: newForestHealth,
            total_stones: stonesCount,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            updated_at: now.toISOString()
        })
        .eq('id', userId);

    // Update session with reward info
    await admin
        .from('amber_sessions')
        .update({
            bonus_stones_awarded: reward.bonusStones,
            was_celebrated: true,
            updated_at: now.toISOString()
        })
        .eq('id', sessionId);

    // Log forest event for history
    await admin
        .from('forest_events')
        .insert({
            user_id: userId,
            event_type: reward.isBonusTriggered ? 'forest_flourished' : 'tree_grown',
            amount: reward.forestHealthGain,
            related_session_id: sessionId
        });

    // Bonus: if streak is a multiple of 5, award streak bonus
    if (newStreak > 1 && newStreak % 5 === 0) {
        const streakBonus = 5;
        await admin
            .from('profiles')
            .update({
                total_stones: profile.total_stones + reward.totalStones + streakBonus,
                updated_at: now.toISOString()
            })
            .eq('id', userId);
    }
}

/**
 * Apply forest decay when a session is broken/canceled
 */
export async function applyForestDecay(userId: string, sessionId: string, stakeAmount: number = 0): Promise<void> {
    const { data: profile } = await admin
        .from('profiles')
        .select('forest_health, total_stones')
        .eq('id', userId)
        .single();

    if (!profile) return;

    // Decay: lose 10-20% of forest health + lose staked stones
    const decayAmount = Math.floor(Math.random() * 10) + 10;
    const newForestHealth = Math.max(0, profile.forest_health - decayAmount);
    const stonesPenalty = Math.min(stakeAmount, Math.floor(stakeAmount * 0.5)); // Lose 50% of stake

    await admin
        .from('profiles')
        .update({
            forest_health: newForestHealth,
            total_stones: Math.max(0, profile.total_stones - stonesPenalty),
            sessions_completed_streak: 0, // Reset streak on failure
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    // Log decay event
    await admin
        .from('forest_events')
        .insert({
            user_id: userId,
            event_type: 'tree_petrified',
            amount: decayAmount,
            related_session_id: sessionId
        });
}

/**
 * Get user's forest health status with narrative message
 */
export function getForestHealthStatus(forestHealth: number): {
    level: 'thriving' | 'healthy' | 'struggling' | 'dying';
    percentage: number;
    message: string;
    color: string;
} {
    if (forestHealth >= 80) {
        return {
            level: 'thriving',
            percentage: forestHealth,
            message: '🌳 Your forest is thriving! Keep up the focus.',
            color: '#22c55e' // green
        };
    } else if (forestHealth >= 60) {
        return {
            level: 'healthy',
            percentage: forestHealth,
            message: '🌲 Your forest is healthy. Continue your ritual.',
            color: '#84cc16' // lime
        };
    } else if (forestHealth >= 30) {
        return {
            level: 'struggling',
            percentage: forestHealth,
            message: '⚠️ Your forest is struggling. A focus session will help it recover.',
            color: '#f97316' // orange
        };
    } else {
        return {
            level: 'dying',
            percentage: forestHealth,
            message: '🪨 Your forest is turning to stone. Focus now to save it!',
            color: '#ef4444' // red
        };
    }
}

/**
 * Check if user should receive daily ritual reminder
 */
export async function shouldPromptDailyRitual(userId: string): Promise<boolean> {
    const { data: profile } = await admin
        .from('profiles')
        .select('last_session_date, daily_ritual_time')
        .eq('id', userId)
        .single();

    if (!profile) return false;

    const lastSession = profile.last_session_date ? new Date(profile.last_session_date) : null;
    const now = new Date();

    // Prompt if it's been >18 hours since last session and within ritual time window
    if (!lastSession || (now.getTime() - new Date(lastSession).getTime()) > 18 * 60 * 60 * 1000) {
        // Parse ritual time (HH:MM)
        const [ritualHour, ritualMin] = (profile.daily_ritual_time || '09:00').split(':').map(Number);
        const ritualDate = new Date(now);
        ritualDate.setHours(ritualHour, ritualMin, 0, 0);

        // Prompt within 1 hour of ritual time
        const timeTillRitual = Math.abs(now.getTime() - ritualDate.getTime());
        return timeTillRitual < 60 * 60 * 1000;
    }

    return false;
}
