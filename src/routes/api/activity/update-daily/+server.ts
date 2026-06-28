import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Update or create daily activity record for a user
 * Merges the provided updates with existing data
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const body = await event.request.json();
        // Strip identity/ownership columns so a caller can't override them via mass-assignment.
        const { user_id: _ignoredUserId, id: _ignoredId, ...updates } = body?.updates ?? {};

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check if record exists for today
        const { data: existing } = await supabase
            .from('daily_activity')
            .select('*')
            .eq('user_id', userId)
            .eq('activity_date', today)
            .single();

        let response;

        if (existing) {
            // Update existing record by merging with new updates
            const merged = {
                ...existing,
                ...updates,
                updated_at: new Date().toISOString()
            };

            response = await supabase
                .from('daily_activity')
                .update(merged)
                .eq('id', existing.id)
                .select()
                .single();
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
                .select()
                .single();
        }

        if (response.error) {
            console.error('Error updating activity:', response.error);
            return json(
                { error: 'Failed to update activity' },
                { status: 500 }
            );
        }

        return json({
            success: true,
            activity: response.data
        });
    } catch (err) {
        console.error('Error in activity update:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
