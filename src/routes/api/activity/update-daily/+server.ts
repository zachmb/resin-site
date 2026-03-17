import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

/**
 * Update or create daily activity record for a user
 * Merges the provided updates with existing data
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { userId, updates } = await request.json();

        if (!userId) {
            return json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

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
