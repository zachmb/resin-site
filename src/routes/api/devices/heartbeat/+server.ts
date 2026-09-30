import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 4096;
const MAX_REQUEST_BODY_LENGTH = 8_000;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

function heartbeatTokenCandidates(token: string): string[] {
    const trimmed = token.trim();
    const candidates = new Set([trimmed]);

    if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        candidates.add(trimmed.toLowerCase());
    }

    return Array.from(candidates);
}

/**
 * Update device heartbeat to mark it as active
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        let body: { token?: unknown };
        try {
            body = await readBoundedJsonBody(event.request, MAX_REQUEST_BODY_LENGTH);
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({ error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, { status, headers });
        }

        const token = typeof body.token === 'string' ? body.token.trim() : '';

        if (
            token.length < MIN_TOKEN_LENGTH ||
            token.length > MAX_TOKEN_LENGTH ||
            CONTROL_CHARS_RE.test(token)
        ) {
            return json(
                { error: 'Invalid device token' },
                { status: 400, headers }
            );
        }

        const tokenCandidates = heartbeatTokenCandidates(token);
        const { data: devices, error: lookupError } = await supabase
            .from('device_tokens')
            .select('id')
            .eq('user_id', userId)
            .in('token', tokenCandidates)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .order('last_used_at', { ascending: false, nullsFirst: false })
            .limit(1);

        if (lookupError) {
            console.error('Error finding device heartbeat target');
            return json(
                { error: 'Failed to update heartbeat' },
                { status: 500, headers }
            );
        }

        const device = devices?.[0];
        if (!device) {
            return json(
                { error: 'Device token is not registered for this account' },
                { status: 404, headers }
            );
        }

        // Update device heartbeat by row id so normalized APNs tokens and exact
        // extension ids both resolve to the same registered device.
        const { data: updatedDevice, error } = await supabase
            .from('device_tokens')
            .update({
                last_used_at: new Date().toISOString(),
                is_active: true
            })
            .eq('id', device.id)
            .eq('user_id', userId)
            .in('token', tokenCandidates)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Error updating device heartbeat');
            return json(
                { error: 'Failed to update heartbeat' },
                { status: 500, headers }
            );
        }
        if (!updatedDevice) {
            return json(
                { error: 'Device token is not registered for this account' },
                { status: 404, headers }
            );
        }

        return json({
            success: true,
            message: 'Heartbeat updated'
        }, { headers });
    } catch {
        console.error('Error in heartbeat');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
