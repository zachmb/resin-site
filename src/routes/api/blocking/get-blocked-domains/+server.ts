import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { userId } = await request.json();

        if (!userId) {
            return json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        // Fetch user's blocked domains
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('blocked_domains')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return json(
                { error: 'Failed to fetch blocked domains' },
                { status: 500 }
            );
        }

        const blockedDomains = profile?.blocked_domains || [];

        return json({
            blockedDomains,
            count: blockedDomains.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error fetching blocked domains:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
