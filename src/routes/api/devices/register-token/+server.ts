import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';

const VALID_DEVICE_TYPES = new Set(['ios', 'web', 'extension']);
const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 4096;

function normalizeToken(token: string, deviceType: string): string {
    const trimmed = token.trim();
    return deviceType === 'ios' ? trimmed.toLowerCase() : trimmed;
}

function isValidTokenForDevice(token: string, deviceType: string): boolean {
    if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) return false;
    if (deviceType !== 'ios') return true;
    return token.length % 2 === 0 && /^[a-f0-9]+$/.test(token);
}

/**
 * Register a device token for push notifications
 */
export const POST: RequestHandler = async (event) => {
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

        const { token, deviceType, deviceName } = await event.request.json();

        if (!token || !deviceType) {
            return json(
                { error: 'Missing required fields: token, deviceType' },
                { status: 400 }
            );
        }

        if (typeof token !== 'string') {
            return json({ error: 'Invalid device token' }, { status: 400 });
        }

        if (typeof deviceType !== 'string' || !VALID_DEVICE_TYPES.has(deviceType)) {
            return json({ error: 'Invalid device type' }, { status: 400 });
        }

        const normalizedToken = normalizeToken(token, deviceType);
        if (!isValidTokenForDevice(normalizedToken, deviceType)) {
            return json({ error: 'Invalid device token' }, { status: 400 });
        }

        const normalizedDeviceName =
            typeof deviceName === 'string' ? deviceName.trim().slice(0, 120) || null : null;

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
                { status: 500 }
            );
        }

        // Check if token already exists for THIS user
        const { data: existing } = await supabase
            .from('device_tokens')
            .select('id')
            .eq('token', normalizedToken)
            .eq('user_id', userId)
            .maybeSingle();

        let result;

        if (existing) {
            // Update existing token
            result = await supabase
                .from('device_tokens')
                .update({
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select('id, device_type, device_name, is_active, last_used_at, created_at, updated_at');
        } else {
            // Insert new token
            result = await supabase
                .from('device_tokens')
                .insert({
                    user_id: userId,
                    token: normalizedToken,
                    device_type: deviceType,
                    device_name: normalizedDeviceName,
                    is_active: true,
                    last_used_at: new Date().toISOString()
                })
                .select('id, device_type, device_name, is_active, last_used_at, created_at, updated_at');
        }

        if (result.error) {
            console.error('Error registering device token');
            return json(
                { error: 'Failed to register device token' },
                { status: 500 }
            );
        }

        return json({
            success: true,
            device: result.data?.[0]
        });
    } catch {
        console.error('Error in register device token');
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
