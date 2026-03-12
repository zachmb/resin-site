import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

export interface RewardOutcome {
    baseStones: number;
    bonusStones: number;
    totalStones: number;
    forestHealthGain: number;
    isBonusTriggered: boolean;
    celebrationLevel: 'standard' | 'bonus' | 'rare';
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

    // Update profile with stones, streak, forest health
    const newForestHealth = Math.min(100, (profile.forest_health || 0) + reward.forestHealthGain);

    await admin
        .from('profiles')
        .update({
            total_stones: profile.total_stones + reward.totalStones,
            sessions_completed_streak: newStreak,
            last_session_date: now.toISOString(),
            forest_health: newForestHealth,
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
