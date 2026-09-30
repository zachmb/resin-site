import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedUserId, userHasProAccess } from '$lib/server/auth';
import { getUserBlockedDomains, normalizeBlockedDomain } from '$lib/server/blockingDomains';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MAX_REQUEST_BODY_LENGTH = 4_000;

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        // Derive the user from the verified token/session — never trust a body userId.
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });
        if (!(await userHasProAccess(userId))) {
            return json({
                error: 'Pro required',
                code: 'PRO_REQUIRED',
                message: 'Web and extension blocking require Resin Pro.'
            }, { status: 402, headers });
        }

        let body: { domain?: unknown };
        try {
            body = await readBoundedJsonBody<{ domain?: unknown }>(event.request, MAX_REQUEST_BODY_LENGTH);
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({
                error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status, headers });
        }
        const { domain } = body;
        const normalizedDomain = normalizeBlockedDomain(domain);
        if (!normalizedDomain) {
            return json(
                { error: 'Use a plain domain or URL with a valid hostname' },
                { status: 400, headers }
            );
        }

        const blockedDomains = await getUserBlockedDomains(userId);

        const isBlocked = blockedDomains.some((blocked: string) => {
            const normalized = normalizeBlockedDomain(blocked);
            if (!normalized) return false;
            // Exact or subdomain match only — a substring check would make
            // blocking x.com also report netflix.com as blocked.
            return normalizedDomain === normalized || normalizedDomain.endsWith('.' + normalized);
        });

        return json({
            isBlocked,
            blockedDomains: blockedDomains.length,
            domain: normalizedDomain
        }, { headers });
    } catch {
        console.error('[blocking/check-domain] Error');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
