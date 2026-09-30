import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUserId, userHasProAccess } from '$lib/server/auth';
import { getUserBlockedDomains } from '$lib/server/blockingDomains';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });
        if (!(await userHasProAccess(userId))) {
            return json({
                error: 'Pro required',
                code: 'PRO_REQUIRED',
                message: 'Web and extension blocking require Resin Pro.'
            }, { status: 402, headers });
        }

        const blockedDomains = await getUserBlockedDomains(userId);

        return json({
            blockedDomains,
            count: blockedDomains.length,
            timestamp: new Date().toISOString()
        }, { headers });
    } catch {
        console.error('Error fetching blocked domains');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
