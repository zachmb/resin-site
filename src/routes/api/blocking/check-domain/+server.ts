import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
    try {
        // Derive the user from the verified token/session — never trust a body userId.
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { domain } = await event.request.json();
        if (!domain) {
            return json(
                { error: 'Missing domain' },
                { status: 400 }
            );
        }

        // Fetch user's profile with blocked domains
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('blocked_domains')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return json(
                { error: 'Failed to check blocking status' },
                { status: 500 }
            );
        }

        const blockedDomains = profile?.blocked_domains || [];

        // Normalize domain for comparison
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
        const isBlocked = blockedDomains.some((blocked: string) => {
            const normalized = blocked.toLowerCase().replace(/^www\./, '');
            return normalized === normalizedDomain || domain.includes(normalized);
        });

        return json({
            isBlocked,
            blockedDomains: blockedDomains.length,
            domain: normalizedDomain
        });
    } catch (err) {
        console.error('Error checking domain blocking:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
