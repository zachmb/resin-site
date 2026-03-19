import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

/**
 * Update device heartbeat to mark it as active
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

        const { token } = await request.json();

        if (!token) {
            return json(
                { error: 'Missing required field: token' },
                { status: 400 }
            );
        }

        // Update device heartbeat
        const { error } = await supabase
            .from('device_tokens')
            .update({
                last_used_at: new Date().toISOString(),
                is_active: true
            })
            .eq('token', token)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating device heartbeat:', error);
            return json(
                { error: 'Failed to update heartbeat' },
                { status: 500 }
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
