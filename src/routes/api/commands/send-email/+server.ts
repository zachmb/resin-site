import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,254}$/i;
const MAX_REQUEST_BODY_LENGTH = 8_000;
function cleanString(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : '';
}

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

/**
 * Email sending is intentionally disabled until a transactional email provider is configured.
 */
export const POST = async (event: RequestEvent) => {
    const headers = responseHeaders(event.request);
    try {
        // Require auth so this can never become an open email relay.
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        const body = await readBoundedJsonBody<{ to?: unknown; content?: unknown }>(
            event.request,
            MAX_REQUEST_BODY_LENGTH
        );
        const to = cleanString(body?.to, 254);
        const content = cleanString(body?.content, 6000);

        if (!EMAIL_RE.test(to) || !content) {
            return json({ error: 'Missing required fields: to, content' }, { status: 400, headers });
        }

        return json({
            success: false,
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'Email commands are not enabled yet. Your note was saved, but no email was sent.'
        }, { status: 501, headers });

    } catch (error) {
        if (error instanceof RequestBodyError) {
            return json({
                error: error.status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status: error.status, headers });
        }
        console.error('[email] Error');
        return json({ error: 'Failed to send email' }, { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }: RequestEvent) => browserCorsOptions(request);
