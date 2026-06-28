import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getAuthenticatedUserId } from '$lib/server/auth';

/**
 * Send email via configured email service
 * This is a simple implementation that would send emails
 * In production, integrate with SendGrid, AWS SES, Mailgun, etc.
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

        // TODO: Implement actual email sending
        // Example with nodemailer, SendGrid, AWS SES, etc.
        // For now, we'll just log it
        console.log(`[email] Would send email to ${to}`, { subject, content });

        // Placeholder response
        return json({
            success: true,
            message: `Email would be sent to ${to}`,
            // In production, return actual email service response
        });

    } catch (err) {
        console.error('[email] Error:', err);
        return error(500, 'Failed to send email');
    }
};
