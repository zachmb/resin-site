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
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MAX_REQUEST_BODY_LENGTH = 4_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};

export const POST = async (event: RequestEvent) => {
    const user = await event.locals.getUser();
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    let body: { session_id?: unknown; duration_minutes?: unknown };
    try {
        body = await readBoundedJsonBody<{ session_id?: unknown; duration_minutes?: unknown }>(
            event.request,
            MAX_REQUEST_BODY_LENGTH
        );
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400;
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers: NO_STORE_HEADERS });
    }
    const { session_id } = body;
    const sessionId = typeof session_id === 'string' ? session_id.trim() : '';

    if (!sessionId) {
        return json({ error: 'Missing session_id' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!UUID_RE.test(sessionId)) {
        return json({ error: 'Invalid session_id' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    try {
        const { data: ownedSession, error: sessionLookupError } = await event.locals.supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (sessionLookupError) {
            console.error('[/api/gamification/apply-reward] Session lookup failed');
            return json({ error: 'Could not verify session' }, { status: 500, headers: NO_STORE_HEADERS });
        }
        if (!ownedSession) {
            return json({ error: 'Session not found' }, { status: 404, headers: NO_STORE_HEADERS });
        }

        const db = createSupabaseGamificationAdapter();

        // Fetch user profile
        const profile = await db.fetchUserProfile(user.id);
        if (!profile) {
            return json({ error: 'User profile not found' }, { status: 404, headers: NO_STORE_HEADERS });
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
                p_session_id: sessionId,
                p_new_streak: newStreak,
                p_total_stones: profile.totalStones + bonusStones,
                p_forest_health_gain: totalHealthGain,
                p_new_forest_health: newForestHealth,
                p_celebration_level: reward.celebrationLevel,
                p_message: reward.message
            }
        );

        if (rpcError || !rpcResult?.success) {
            console.error('[/api/gamification/apply-reward] Atomic RPC failed');
            return json({ error: 'Could not apply reward' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // Get forest status for response
        const forestStatus = getForestHealthStatus(newForestHealth);

        console.log('[/api/gamification/apply-reward] Atomic reward applied:', {
            session: sessionId.slice(0, 8),
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
            new_streak: newStreak
        }, { headers: NO_STORE_HEADERS });
    } catch {
        console.error('[/api/gamification/apply-reward]');
        return json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
    }
};
