import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Register a device token for push notifications
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { token, deviceType, deviceName } = await event.request.json();

        if (!token || !deviceType) {
            return json(
                { error: 'Missing required fields: token, deviceType' },
                { status: 400 }
            );
        }

        // Check if token already exists for THIS user
        const { data: existing } = await supabase
            .from('device_tokens')
            .select('id')
            .eq('token', token)
            .eq('user_id', userId)
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
