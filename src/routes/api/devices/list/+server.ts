import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

/**
 * Get list of connected devices for the current user
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('authorization') ?? '';
        const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!jwt) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Authenticate user
        const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
        if (userError || !user) {
            return json({ error: 'Invalid token' }, { status: 401 });
        }

        // Get active devices (updated in last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: devices, error } = await supabase
            .from('device_tokens')
            .select('id, device_type, device_name, is_active, last_used_at, created_at')
            .eq('user_id', user.id)
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
