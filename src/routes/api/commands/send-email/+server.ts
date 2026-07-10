import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Email sending is intentionally disabled until a transactional email provider is configured.
 */
export const POST = async (event: RequestEvent) => {
    try {
        // Require auth so this can never become an open email relay.
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return error(401, 'Unauthorized');

        const body = await event.request.json();
        const { to, content, subject } = body;

        if (!to || !content) {
            return error(400, 'Missing required fields: to, content');
        }

        return json({
            success: false,
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'Email commands are not enabled yet. Your note was saved, but no email was sent.',
            to,
            subject
        }, { status: 501 });

    } catch (err) {
        console.error('[email] Error:', err);
        return error(500, 'Failed to send email');
    }
};
