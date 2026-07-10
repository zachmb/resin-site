import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Get list of connected devices for the current user
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        // Get active devices (updated in last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: devices, error } = await supabase
            .from('device_tokens')
            .select('id, device_type, device_name, is_active, last_used_at, created_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('last_used_at', oneDayAgo)
            .order('last_used_at', { ascending: false });

        if (error) {
            console.error('Error fetching devices:', error);
            return json(
                { error: 'Failed to fetch devices' },
                { status: 500 }
            );
        }

        // Format devices with human-readable info
        const formattedDevices = (devices || []).map(d => ({
            id: d.id,
            type: d.device_type,
            name: d.device_name || (d.device_type === 'ios' ? 'iPhone' : 'Web Browser'),
            lastUsed: d.last_used_at,
            isActive: d.is_active,
            isRecent: new Date(d.last_used_at).getTime() > Date.now() - 15 * 60 * 1000 // Last 15 mins
        }));

        return json({
            success: true,
            devices: formattedDevices,
            count: formattedDevices.length
        });
    } catch (err) {
        console.error('Error in list devices:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
