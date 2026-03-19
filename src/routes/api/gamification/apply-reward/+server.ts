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
import { createSupabaseGamificationAdapter } from '$lib/gamification_adapter';

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

        // Update profile
        const now = new Date();
        await db.updateProfile(user.id, {
            currentStreak: newStreak,
            forestHealth: newForestHealth,
            lastSessionDate: now,
            lastActiveDate: now
        });

        // Update session
        await db.updateSession(session_id, {
            bonus_stones_awarded: reward.bonusStones,
            was_celebrated: true
        });

        // Insert forest event
        await db.insertForestEvent(
            user.id,
            reward.isBonusTriggered ? 'forest_flourished' : 'tree_grown',
            reward.forestHealthGain,
            session_id
        );

        // Get forest status for response
        const forestStatus = getForestHealthStatus(newForestHealth);

        return json({
            status: 'success',
            total_stones: profile.totalStones + bonusStones,
            forest_health_gain: totalHealthGain,
            new_forest_health: newForestHealth,
            forest_status: forestStatus,
            celebration_level: reward.celebrationLevel,
            message: reward.message,
            bonus_breakdown: bonuses,
            new_streak: newStreak
        });
    } catch (error) {
        console.error('[/api/gamification/apply-reward]', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
