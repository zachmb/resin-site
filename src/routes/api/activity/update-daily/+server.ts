import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MAX_REQUEST_BODY_LENGTH = 16_000;
const MAX_DAILY_FOCUS_MINUTES = 24 * 60;
const MAX_DAILY_COUNT = 10_000;

function safeNonNegativeInteger(value: unknown, max: number): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.min(Math.max(Math.trunc(value), 0), max);
}

function sanitizeActivityUpdates(updates: Record<string, unknown> | undefined) {
    const safe: Record<string, number> = {};
    const focusMinutes = safeNonNegativeInteger(updates?.focus_minutes, MAX_DAILY_FOCUS_MINUTES);
    const amberPlansCompleted = safeNonNegativeInteger(updates?.amber_plans_completed, MAX_DAILY_COUNT);
    const notesCreated = safeNonNegativeInteger(updates?.notes_created, MAX_DAILY_COUNT);
    const stonesEarned = safeNonNegativeInteger(updates?.stones_earned, MAX_DAILY_COUNT);

    if (focusMinutes !== undefined) safe.focus_minutes = focusMinutes;
    if (amberPlansCompleted !== undefined) safe.amber_plans_completed = amberPlansCompleted;
    if (notesCreated !== undefined) safe.notes_created = notesCreated;
    if (stonesEarned !== undefined) safe.stones_earned = stonesEarned;
    return safe;
}

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

/**
 * Update or create daily activity record for a user
 * Merges the provided updates with existing data
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        let body: { updates?: Record<string, unknown> };
        try {
            body = await readBoundedJsonBody<{ updates?: Record<string, unknown> }>(
                event.request,
                MAX_REQUEST_BODY_LENGTH
            );
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({
                error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status, headers });
        }
        const updates = sanitizeActivityUpdates(body?.updates);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check if record exists for today
        const { data: existing, error: existingError } = await supabase
            .from('daily_activity')
            .select('id')
            .eq('user_id', userId)
            .eq('activity_date', today)
            .maybeSingle();

        if (existingError) {
            console.error('Error fetching activity');
            return json(
                { error: 'Failed to update activity' },
                { status: 500, headers }
            );
        }

        let response;

        if (existing) {
            // Update existing record by merging with new updates
            const merged = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            response = await supabase
                .from('daily_activity')
                .update(merged)
                .eq('id', existing.id)
                .eq('user_id', userId)
                .eq('activity_date', today)
                .select('id, activity_date, focus_minutes, amber_plans_completed, notes_created, stones_earned, updated_at')
                .maybeSingle();
        } else {
            // Create new record
            const newRecord = {
                user_id: userId,
                activity_date: today,
                ...updates,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            response = await supabase
                .from('daily_activity')
                .insert([newRecord])
                .select('id, activity_date, focus_minutes, amber_plans_completed, notes_created, stones_earned, updated_at')
                .single();
        }

        if (response.error) {
            console.error('Error updating activity');
            return json(
                { error: 'Failed to update activity' },
                { status: 500, headers }
            );
        }
        if (!response.data) {
            return json(
                { error: 'Activity record changed before it could be updated' },
                { status: 409, headers }
            );
        }

        return json({
            success: true,
            activity: response.data
        }, { headers });
    } catch {
        console.error('Error in activity update');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
