import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 4096;
const MAX_DEVICE_NAME_LENGTH = 120;
const MAX_REQUEST_BODY_LENGTH = 12_000;
const EXTENSION_DEVICE_ID_RE =
    /^ext-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

function normalizeDeviceName(deviceName: unknown): string | null {
    if (typeof deviceName !== 'string') return null;
    const normalized = deviceName
        .replace(CONTROL_CHARS_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_DEVICE_NAME_LENGTH);

    return normalized || null;
}

/**
 * Register a device token for push notifications
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        let body: {
            token?: unknown;
            deviceType?: unknown;
            platform?: unknown;
            deviceName?: unknown;
            device_name?: unknown;
        };
        try {
            body = await readBoundedJsonBody(event.request, MAX_REQUEST_BODY_LENGTH);
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({ error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, { status, headers });
        }

        const { token, deviceType, platform, deviceName, device_name } = body;
        const requestedDeviceType = deviceType ?? platform;

        if (!token || !requestedDeviceType) {
            return json(
                { error: 'Missing required fields: token and deviceType/platform' },
                { status: 400, headers }
            );
        }

        if (typeof token !== 'string') {
            return json({ error: 'Invalid device token' }, { status: 400, headers });
        }

        if (requestedDeviceType !== 'extension') {
            return json({ error: 'Invalid device type' }, { status: 400, headers });
        }

        const normalizedToken = token.trim();
        if (
            normalizedToken.length < MIN_TOKEN_LENGTH ||
            normalizedToken.length > MAX_TOKEN_LENGTH ||
            !EXTENSION_DEVICE_ID_RE.test(normalizedToken)
        ) {
            return json({ error: 'Invalid device token' }, { status: 400, headers });
        }

        const normalizedDeviceName = normalizeDeviceName(deviceName ?? device_name);

        const { error: cleanupError } = await supabase
            .from('device_tokens')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('token', normalizedToken)
            .neq('user_id', userId);

        if (cleanupError) {
            console.error('Error clearing previous device token owner');
            return json(
                { error: 'Failed to register device token' },
                { status: 500, headers }
            );
        }

        // Check if token already exists. If it belongs to a previous account,
        // reassign the same row so unique token indexes don't break
        // re-registration after logout/account switching.
	        const { data: existing, error: lookupError } = await supabase
	            .from('device_tokens')
	            .select('id')
	            .eq('token', normalizedToken)
	            .maybeSingle();

        if (lookupError) {
            console.error('Error looking up existing device token');
            return json(
                { error: 'Failed to register device token' },
                { status: 500, headers }
            );
        }

        let result;

        if (existing) {
            // Update existing token
            result = await supabase
                .from('device_tokens')
                .update({
                    user_id: userId,
                    device_type: requestedDeviceType,
                    device_name: normalizedDeviceName,
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
	                })
	                .eq('id', existing.id)
	                .eq('token', normalizedToken)
	                .select('id, device_type, device_name, is_active, last_used_at')
	                .single();
	        } else {
            // Insert new token
            result = await supabase
                .from('device_tokens')
                .insert({
                    user_id: userId,
                    token: normalizedToken,
                    device_type: requestedDeviceType,
                    device_name: normalizedDeviceName,
	                    is_active: true,
	                    last_used_at: new Date().toISOString()
	                })
	                .select('id, device_type, device_name, is_active, last_used_at')
	                .single();
	        }

        if (result.error) {
            console.error('Error registering device token');
            return json(
                { error: 'Failed to register device token' },
                { status: 500, headers }
            );
        }

	        return json({
	            success: true,
	            device_id: result.data?.id,
	            device: result.data
	        }, { headers });
    } catch {
        console.error('Error in register device token');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
