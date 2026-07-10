import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId, userHasProAccess } from '$lib/server/auth';

function normalizeDomain(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    let domain = raw.trim().toLowerCase();
    domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
    domain = domain.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
    domain = domain.replace(/^www\./, '');
    if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return null;
    return domain;
}

export const POST: RequestHandler = async (event) => {
    try {
        // Derive the user from the verified token/session — never trust a body userId.
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });
        if (!(await userHasProAccess(userId))) {
            return json({
                error: 'Pro required',
                code: 'PRO_REQUIRED',
                message: 'Web and extension blocking require Resin Pro.'
            }, { status: 402 });
        }

        const { domain } = await event.request.json();
        const normalizedDomain = normalizeDomain(domain);
        if (!normalizedDomain) {
            return json(
                { error: 'Use a plain domain or URL with a valid hostname' },
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

        const isBlocked = blockedDomains.some((blocked: string) => {
            const normalized = normalizeDomain(blocked);
            if (!normalized) return false;
            // Exact or subdomain match only — a substring check would make
            // blocking x.com also report netflix.com as blocked.
            return normalizedDomain === normalized || normalizedDomain.endsWith('.' + normalized);
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
