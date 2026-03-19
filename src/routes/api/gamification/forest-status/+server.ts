/**
 * GET /api/gamification/forest-status
 *
 * Get user's current forest status
 *
 * Response:
 * {
 *   forest_health: number (0-100)
 *   level: 'thriving' | 'healthy' | 'struggling' | 'dying'
 *   message: string
 *   color: string (hex)
 *   total_stones: number
 *   current_streak: number
 *   longest_streak: number
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getForestHealthStatus } from '@resin/core';
import { createSupabaseGamificationAdapter } from '$lib/gamification_adapter';

export const GET = async (event: RequestEvent) => {
    const user = await event.locals.getUser();
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = createSupabaseGamificationAdapter();
        const profile = await db.fetchUserProfile(user.id);

        if (!profile) {
            return json({ error: 'User profile not found' }, { status: 404 });
        }

        const forestStatus = getForestHealthStatus(profile.forestHealth);

        return json({
            forest_health: profile.forestHealth,
            level: forestStatus.level,
            message: forestStatus.message,
            color: forestStatus.color,
            total_stones: profile.totalStones,
            current_streak: profile.currentStreak,
            longest_streak: profile.longestStreak
        });
    } catch (error) {
        console.error('[/api/gamification/forest-status]', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
