import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // Get the request body
        const { domain, userId } = await request.json();

        if (!domain || !userId) {
            return json(
                { error: 'Missing domain or userId' },
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
