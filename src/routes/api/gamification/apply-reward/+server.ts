/**
 * POST /api/gamification/apply-reward
 *
 * Apply session completion rewards using @resin/core gamification logic
 *
 * Request body:
 * {
 *   session_id: string (UUID)
 *   duration_minutes: number
 * }
 *
 * Response:
 * {
 *   total_stones: number
 *   forest_health_gain: number
 *   celebration_level: 'standard' | 'bonus' | 'rare'
 *   message: string
 *   achievements: string[]
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
    calculateSessionReward,
    detectEngagementBonuses,
    calculateNewStreak,
    calculateTotalReward,
    calculateNewForestHealth,
    getForestHealthStatus
} from '@resin/core';
import { createSupabaseGamificationAdapter } from '$lib/services/gamificationAdapter';

export const POST = async (event: RequestEvent) => {
    const user = await event.locals.getUser();
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await event.request.json();
    const { session_id, duration_minutes } = body;

    if (!session_id) {
        return json({ error: 'Missing session_id' }, { status: 400 });
    }

    try {
        const db = createSupabaseGamificationAdapter();

        // Fetch user profile
        const profile = await db.fetchUserProfile(user.id);
        if (!profile) {
            return json({ error: 'User profile not found' }, { status: 404 });
        }

        // Calculate new streak
        const newStreak = calculateNewStreak(profile.lastSessionDate, profile.currentStreak);

        // Calculate base reward
        const reward = calculateSessionReward(newStreak);

        // Detect bonuses
        const bonuses = detectEngagementBonuses(newStreak, profile.lastSessionDate);

        // Calculate totals
        const { totalStones: bonusStones, totalHealthGain } = calculateTotalReward(reward, bonuses);

        // Calculate new forest health
        const newForestHealth = calculateNewForestHealth(profile.forestHealth, totalHealthGain);

        // FORTRESS: Use atomic RPC to apply reward (prevents Ghost Rewards)
        // This single function atomically updates profile + marks session complete + logs event
        const { data: rpcResult, error: rpcError } = await event.locals.supabase.rpc(
            'apply_reward_atomic',
            {
                p_user_id: user.id,
                p_session_id: session_id,
                p_new_streak: newStreak,
                p_total_stones: profile.totalStones + bonusStones,
                p_forest_health_gain: totalHealthGain,
                p_new_forest_health: newForestHealth,
                p_celebration_level: reward.celebrationLevel,
                p_message: reward.message
            }
        );

        if (rpcError || !rpcResult?.success) {
            const errorMsg = rpcError?.message || rpcResult?.error_message || 'Transaction failed';
            console.error('[/api/gamification/apply-reward] Atomic RPC failed:', errorMsg);
            return json({ error: errorMsg }, { status: 500 });
        }

        // Get forest status for response
        const forestStatus = getForestHealthStatus(newForestHealth);

        // Build response from atomic transaction result
        const rewardSummary = rpcResult.reward_summary || {};

        console.log('[/api/gamification/apply-reward] ✅ Atomic reward applied:', {
            session: session_id,
            streak: newStreak,
            stones: profile.totalStones + bonusStones,
            forestHealth: newForestHealth
        });

        return json({
            status: 'success',
            total_stones: profile.totalStones + bonusStones,
            forest_health_gain: totalHealthGain,
            new_forest_health: newForestHealth,
            forest_status: forestStatus,
            celebration_level: reward.celebrationLevel,
            message: reward.message,
            bonus_breakdown: bonuses,
            new_streak: newStreak,
            _reward_summary: rewardSummary  // For debugging
        });
    } catch (error) {
        console.error('[/api/gamification/apply-reward]', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
