import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

/**
 * Register a device token for push notifications
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { userId, token, deviceType, deviceName } = await request.json();

        if (!userId || !token || !deviceType) {
            return json(
                { error: 'Missing required fields: userId, token, deviceType' },
                { status: 400 }
            );
        }

        // Check if token already exists
        const { data: existing } = await supabase
            .from('device_tokens')
            .select('id')
            .eq('token', token)
            .single();

        let result;

        if (existing) {
            // Update existing token
            result = await supabase
                .from('device_tokens')
                .update({
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();
        } else {
            // Insert new token
            result = await supabase
                .from('device_tokens')
                .insert({
                    user_id: userId,
                    token,
                    device_type: deviceType,
                    device_name: deviceName || null,
                    is_active: true
                })
                .select();
        }

        if (result.error) {
            console.error('Error registering device token:', result.error);
            return json(
                { error: 'Failed to register device token' },
                { status: 500 }
            );
        }

        return json({
            success: true,
            device: result.data?.[0]
        });
    } catch (err) {
        console.error('Error in register device token:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
