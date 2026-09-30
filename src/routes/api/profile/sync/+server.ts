import { json } from '@sveltejs/kit';
import { syncStonesFromNotes } from '$lib/services/gamification';
import { recordDailyActivity } from '$lib/services/gamification';
import type { RequestEvent } from '@sveltejs/kit';
import { readOptionalBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { adminClient } from '$lib/server/auth';

const MAX_JWT_LENGTH = 8192;
const MAX_REQUEST_BODY_LENGTH = 4_000;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};
const ALLOWED_BROWSER_ORIGINS = new Set([
    'https://noteresin.com',
    'https://www.noteresin.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]);

function responseHeaders(request: Request): HeadersInit {
    const origin = request.headers.get('origin') ?? '';
    const headers: Record<string, string> = {
        ...NO_STORE_HEADERS,
        Vary: 'Origin, Authorization'
    };
    if (ALLOWED_BROWSER_ORIGINS.has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

/**
 * POST /api/profile/sync
 * 
 * Re-calculates and returns the user's total stones and streak.
 * Called by iOS/Web to ensure cloud consistency.
 */
export const POST = async ({ request }: RequestEvent) => {
    const headers = responseHeaders(request);
    const authHeader = request.headers.get('authorization') ?? '';
    let jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers });
    }

    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401, headers });
    }

    try {
        // Optional: allow callers to force stones to match server sessions count
        // (i.e. allow decreasing total_stones). Default is protective.
        let force = false;
        try {
            const body = await readOptionalBoundedJsonBody<{ force?: boolean }>(request, MAX_REQUEST_BODY_LENGTH);
            force = body?.force === true;
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({
                error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status, headers });
        }

        // 1. Recalculate stones (1 note = 1 stone)
        const totalStones = await syncStonesFromNotes(user.id, { force });

        // 2. Record daily activity (streak)
        const { currentStreak, longestStreak, longestStreakAt } = await recordDailyActivity(user.id);

        // 3. Fetch forest health and other profile data
        const { data: profile, error: profileError } = await adminClient.from('profiles')
            .select('forest_health, widget_enabled, unlocked_tree_ids, hardened_mode_enabled, account_type')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[api/profile/sync] Profile lookup failed');
            return json({ error: 'Failed to sync profile' }, { status: 500, headers });
        }

        // 4. Return latest profile stats
        return json({
            total_stones: totalStones,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            longest_streak_at: longestStreakAt,
            last_active_date: new Date().toISOString(),
            forest_health: profile?.forest_health ?? 100,
            widget_enabled: profile?.widget_enabled ?? true,
            unlocked_tree_ids: profile?.unlocked_tree_ids ?? [],
            hardened_mode_enabled: profile?.hardened_mode_enabled ?? false,
            account_type: profile?.account_type ?? 'free'
        }, { headers });
    } catch {
        console.error('[api/profile/sync] Error');
        return json({ error: 'Failed to sync profile' }, { status: 500, headers });
    }
}

export const OPTIONS = async ({ request }: RequestEvent) => new Response(null, {
    headers: {
        ...responseHeaders(request),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
});
