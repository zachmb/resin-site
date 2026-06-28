import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

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
