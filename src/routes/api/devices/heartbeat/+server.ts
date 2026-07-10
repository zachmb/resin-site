import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Update device heartbeat to mark it as active
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { token } = await event.request.json();

        if (!token || typeof token !== 'string') {
            return json(
                { error: 'Missing required field: token' },
                { status: 400 }
            );
        }

        // Update device heartbeat
        const { data, error } = await supabase
            .from('device_tokens')
            .update({
                last_used_at: new Date().toISOString(),
                is_active: true
            })
            .eq('token', token)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Error updating device heartbeat:', error);
            return json(
                { error: 'Failed to update heartbeat' },
                { status: 500 }
            );
        }

        if (!data) {
            return json(
                { error: 'Device token is not registered for this account' },
                { status: 404 }
            );
        }

        return json({
            success: true,
            message: 'Heartbeat updated'
        });
    } catch (err) {
        console.error('Error in heartbeat:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
