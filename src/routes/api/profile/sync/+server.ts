import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { syncStonesFromNotes } from '$lib/gamification_service';
import { recordDailyActivity } from '$lib/gamification_service';
import type { RequestEvent } from '@sveltejs/kit';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

/**
 * POST /api/profile/sync
 * 
 * Re-calculates and returns the user's total stones and streak.
 * Called by iOS/Web to ensure cloud consistency.
 */
export const POST = async ({ request }: RequestEvent) => {
    const authHeader = request.headers.get('authorization') ?? '';
    let jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        // Optional: allow callers to force stones to match server sessions count
        // (i.e. allow decreasing total_stones). Default is protective.
        let force = false;
        try {
            const body = await request.json();
            force = body?.force === true;
        } catch {
            // No JSON body (or invalid) is fine.
        }

        // 1. Recalculate stones (1 note = 1 stone)
        const totalStones = await syncStonesFromNotes(user.id, { force });

        // 2. Record daily activity (streak)
        const { currentStreak, longestStreak, longestStreakAt } = await recordDailyActivity(user.id);

        // 3. Return latest profile stats
        return json({
            total_stones: totalStones,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            longest_streak_at: longestStreakAt,
            last_active_date: new Date().toISOString()
        });
    } catch (err) {
        console.error('[api/profile/sync] Error:', err);
        return json({ error: String(err) }, { status: 500 });
    }
}

export const OPTIONS = async () => new Response(null, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
});
