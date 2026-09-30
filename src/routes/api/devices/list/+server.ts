import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MAX_RETURNED_DEVICES = 20;
const MAX_DEVICE_NAME_LENGTH = 80;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

function fallbackDeviceName(deviceType: string | null): string {
    if (deviceType === 'ios') return 'iPhone';
    if (deviceType === 'extension') return 'Chrome extension';
    return 'Web Browser';
}

function safeDeviceName(deviceName: string | null, deviceType: string | null): string {
    const normalized = (deviceName ?? '')
        .replace(CONTROL_CHARS_RE, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_DEVICE_NAME_LENGTH);
    return normalized || fallbackDeviceName(deviceType);
}

/**
 * Get list of connected devices for the current user
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

        // Get active devices (updated in last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: devices, error } = await supabase
            .from('device_tokens')
            .select('id, device_type, device_name, is_active, last_used_at, created_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .gte('last_used_at', oneDayAgo)
            .order('last_used_at', { ascending: false })
            .limit(MAX_RETURNED_DEVICES);

        if (error) {
            console.error('[devices/list] Device lookup failed');
            return json(
                { error: 'Failed to fetch devices' },
                { status: 500, headers }
            );
        }

        // Format devices with human-readable info
        const formattedDevices = (devices || []).map(d => ({
            id: d.id,
            type: d.device_type,
            name: safeDeviceName(d.device_name, d.device_type),
            lastUsed: d.last_used_at,
            isActive: d.is_active,
            isRecent: new Date(d.last_used_at).getTime() > Date.now() - 15 * 60 * 1000 // Last 15 mins
        }));

        return json({
            success: true,
            devices: formattedDevices,
            count: formattedDevices.length
        }, { headers });
    } catch {
        console.error('[devices/list] Unexpected error');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
