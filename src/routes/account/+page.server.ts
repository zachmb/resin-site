import { fail, redirect } from '@sveltejs/kit';
import { deleteUserAccount } from '$lib/server/accountDeletion';
import type { Actions, PageServerLoad } from './$types';
import { createHash } from 'crypto';

const COMMAND_SECRET_FIELDS = new Set([
    'api_key',
    'api_secret',
    'access_token',
    'access_token_secret',
    'bot_token',
    'url',
    'webhook_url'
]);
const DEVICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_DEVICE_NAME_LENGTH = 80;
const MAX_RETURNED_DEVICES = 20;
const MAX_RETURNED_FEEDBACK = 200;
const MAX_RETURNED_COMMAND_CONFIGS = 20;
const MAX_RETURNED_FRIENDS = 200;
const MAX_RETURNED_FRIEND_REQUESTS = 100;
const MAX_COMMAND_CONFIG_BYTES = 6_000;
const MAX_COMMAND_FIELD_LENGTH = 2_000;
const MAX_FRIEND_EMAIL_LENGTH = 254;
const MAX_DISPLAY_NAME_LENGTH = 80;
const COMMAND_FIELDS: Record<string, Set<string>> = {
    'send-email': new Set(['email_address']),
    webhook: new Set(['url']),
    slack: new Set(['webhook_url', 'channel']),
    telegram: new Set(['bot_token', 'chat_id']),
    discord: new Set(['webhook_url']),
    notion: new Set(['api_key', 'database_id'])
};
const URL_COMMAND_FIELDS = new Set(['url', 'webhook_url']);
const BLOCKED_OUTBOUND_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1$|::$|fc|fd|fe80:)/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;
const OPENCLAW_TOKEN_BYTES = 32;
const OPENCLAW_TOKEN_PREFIX = 'resin_oclaw_';

function generateOpenclawToken(): string {
    const bytes = new Uint8Array(OPENCLAW_TOKEN_BYTES);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${OPENCLAW_TOKEN_PREFIX}${token}`;
}

function hashOpenclawToken(token: string): string {
    return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

function fallbackDeviceName(platform: string | null): string {
	if (platform === 'ios') return 'iOS App';
	if (platform === 'extension') return 'Browser Extension';
	if (platform === 'web') return 'Web App';
	return 'Connected Device';
}

function safeDeviceName(value: unknown, platform: string | null): string {
	if (typeof value !== 'string') return fallbackDeviceName(platform);
	const safe = value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DEVICE_NAME_LENGTH);
	return safe || fallbackDeviceName(platform);
}

function cleanDisplayName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const displayName = value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME_LENGTH);
    return displayName || null;
}

function normalizeCommandField(key: string, value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (!trimmed || trimmed.length > MAX_COMMAND_FIELD_LENGTH) return null;

    if (URL_COMMAND_FIELDS.has(key)) {
        try {
            const url = new URL(trimmed);
            if (url.protocol !== 'https:' || isBlockedOutboundHostname(url.hostname)) return null;
            url.username = '';
            url.password = '';
            return url.toString();
        } catch {
            return null;
        }
    }

    return trimmed;
}

function isBlockedOutboundHostname(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    return BLOCKED_OUTBOUND_HOST_RE.test(host);
}

function normalizeExternalHttpsUrl(value: FormDataEntryValue | null): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'https:' || isBlockedOutboundHostname(url.hostname)) return null;
        url.username = '';
        url.password = '';
        return url.toString();
    } catch {
        return null;
    }
}

function hourFromTime(value: FormDataEntryValue | null, fallback: number): number {
    if (typeof value !== 'string' || !TIME_RE.test(value)) return fallback;
    return Number(value.slice(0, 2));
}

function sanitizeCommandConfig(config: Record<string, unknown> | null | undefined) {
    const visibleConfig: Record<string, unknown> = {};
    const configuredFields: string[] = [];

    for (const [key, value] of Object.entries(config ?? {})) {
        if (COMMAND_SECRET_FIELDS.has(key)) {
            if (value) configuredFields.push(key);
        } else {
            visibleConfig[key] = value;
        }
    }

    return { visibleConfig, configuredFields };
}

export const load: PageServerLoad = async ({ url, locals: { supabase, getUser }, setHeaders }) => {
	const user = await getUser();
	if (!user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}

    setHeaders({
        'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    // Fetch profile - resilient to missing optional columns in production
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('id, username, full_name, avatar_url, total_stones, current_streak, hardened_mode_enabled, openclaw_url, widget_enabled, sync_notes, availability_schedule')
		.eq('id', user.id)
		.single();

    let finalProfile = profile;
    if (profileError) {
        console.warn('[account:load] Initial profile fetch failed, retrying with minimal columns');
        const { data: minimalProfile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, total_stones, current_streak')
            .eq('id', user.id)
            .single();
        finalProfile = minimalProfile ? { 
            ...minimalProfile,
            hardened_mode_enabled: false,
            openclaw_url: null,
            widget_enabled: true,
            sync_notes: false,
            availability_schedule: null
        } as any : null;
    }

	const { data: feedback } = await supabase
		.from('amber_task_feedback')
		.select('rating, comments, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(MAX_RETURNED_FEEDBACK);

	// Process feedback (same as taste page)
	const feelingCounts: Record<string, number> = {};
	const enjoyedThings: { text: string; date: string }[] = [];
	const ratingHistory: { date: string; rating: number }[] = [];

	for (const fb of (feedback || [])) {
		if (fb.rating) {
			ratingHistory.push({
				date: new Date(fb.created_at).toISOString().split('T')[0],
				rating: fb.rating
			});
		}

		const comments = fb.comments || '';
		const feelingMatch = comments.match(/feeling:(\S+)/);
		if (feelingMatch) {
			feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
		}

		const enjoyedMatch = comments.match(/enjoyed:(.+)/);
		if (enjoyedMatch) {
			enjoyedThings.push({
				text: enjoyedMatch[1].trim(),
				date: new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			});
		}
	}

	// Load device tokens
		const { data: deviceTokens, error: deviceTokensError } = await supabase
			.from('device_tokens')
			.select('id, platform:device_type, device_name, is_active, last_used_at')
		.eq('user_id', user.id)
		.order('last_used_at', { ascending: false, nullsFirst: false })
		.limit(MAX_RETURNED_DEVICES);

	// Load command integrations
	const { data: commandConfigs, error: commandConfigsError } = await supabase
		.from('command_integrations')
		.select('id, command_type, config, enabled')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true })
		.limit(MAX_RETURNED_COMMAND_CONFIGS);

    const safeCommandConfigs = (commandConfigs || []).map((configRow) => {
        const { visibleConfig, configuredFields } = sanitizeCommandConfig(configRow.config);
        return {
            ...configRow,
            config: visibleConfig,
            configured_fields: configuredFields
        };
    });

	// Load friends and friend requests
	const { data: friends, error: friendsError } = await supabase
		.from('friends')
		.select(`
			id,
			user_id_1,
			user_id_2,
			user1:profiles!friends_user_id_1_fkey(username, full_name),
			user2:profiles!friends_user_id_2_fkey(username, full_name),
			created_at
		`)
		.or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
		.limit(MAX_RETURNED_FRIENDS);

	// Load incoming friend requests
	const { data: incomingRequests, error: incomingRequestsError } = await supabase
		.from('friend_requests')
		.select(`
			id,
			fromProfile:profiles!friend_requests_from_user_id_fkey(username, full_name),
			created_at
		`)
		.eq('to_user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(MAX_RETURNED_FRIEND_REQUESTS);

	// Load outgoing friend requests
	const { data: outgoingRequests, error: outgoingRequestsError } = await supabase
		.from('friend_requests')
		.select(`
			id,
			toProfile:profiles!friend_requests_to_user_id_fkey(username, full_name),
			created_at
		`)
		.eq('from_user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(MAX_RETURNED_FRIEND_REQUESTS);

	// Transform friends data - Supabase joins with FK aliases return array or single object
	const friendsList = (friends || []).map((friendship: any) => {
		const isFriend1 = friendship.user_id_1 === user.id;
		const p1 = Array.isArray(friendship.user1) ? friendship.user1[0] : friendship.user1;
		const p2 = Array.isArray(friendship.user2) ? friendship.user2[0] : friendship.user2;
		const friendProfile = isFriend1 ? p2 : p1;
		return {
			id: friendship.id,
			displayName: cleanDisplayName(friendProfile?.full_name)
				|| cleanDisplayName(friendProfile?.username)
				|| 'Resin user',
			createdAt: friendship.created_at
		};
	});

		return {
			profile: finalProfile,
			profileSettingsLoadFailed: Boolean(profileError),
			deviceTokensLoadFailed: Boolean(deviceTokensError),
			deviceTokens: (deviceTokens || []).map((device) => ({
			id: device.id,
			platform: device.platform,
			device_name: safeDeviceName(device.device_name, device.platform),
			is_active: device.is_active,
			last_used_at: device.last_used_at
			})),
			commandConfigsLoadFailed: Boolean(commandConfigsError),
			commandConfigs: safeCommandConfigs,
			friendsLoadFailed: Boolean(friendsError || incomingRequestsError || outgoingRequestsError),
			tasteData: {
			feelingCounts,
			enjoyedThings,
			ratingHistory: ratingHistory.reverse() // chronological
		},
		friends: friendsList,
		incomingRequests: (incomingRequests || []).map((req: any) => {
			const fromProfile = Array.isArray(req.fromProfile) ? req.fromProfile[0] : req.fromProfile;
			return {
				id: req.id,
				fromDisplayName: cleanDisplayName(fromProfile?.full_name)
					|| cleanDisplayName(fromProfile?.username)
					|| 'Resin user',
				createdAt: req.created_at
			};
		}),
		outgoingRequests: (outgoingRequests || []).map((req: any) => {
			const toProfile = Array.isArray(req.toProfile) ? req.toProfile[0] : req.toProfile;
			return {
				id: req.id,
				toDisplayName: cleanDisplayName(toProfile?.full_name)
					|| cleanDisplayName(toProfile?.username)
					|| 'Resin user',
				createdAt: req.created_at
			};
		})
	};
};

export const actions: Actions = {
    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=/account`,
                scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

	        if (error) {
	            console.error('Google OAuth sign-in failed')
	            return fail(500, { error: 'Could not authenticate with Google' })
	        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },

    updateProfile: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const openclaw_url = normalizeExternalHttpsUrl(formData.get('openclaw_url'));
        const widget_enabled = formData.get('widget_enabled') === 'on';
        const sync_notes = formData.get('sync_notes') === 'on';

        // Build per-day availability schedule
        const availabilitySchedule = [];
        for (let i = 0; i < 7; i++) {
            const startHour = hourFromTime(formData.get(`availability_start_${i}`), 16);
            const rawEndHour = hourFromTime(formData.get(`availability_end_${i}`), 22);
            const endHour = rawEndHour > startHour ? rawEndHour : Math.min(startHour + 1, 23);

            availabilitySchedule.push({
                start: startHour,
                end: endHour
            });
        }

        const updates = {
            id: user.id,
            openclaw_url,
            availability_schedule: availabilitySchedule,
            widget_enabled,
            sync_notes,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

		if (updateError) return fail(500, { error: 'Failed to update preferences' });
		return { success: true };
    },

    generateToken: async ({ locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const newKey = generateOpenclawToken();

        const updates = {
            id: user.id,
            openclaw_api_key: hashOpenclawToken(newKey),
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return fail(500, { error: 'Failed to generate token' });
        return { success: true, token: newKey };
    },

    revokeToken: async ({ locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

		const { data: updatedProfile, error: updateError } = await supabase
			.from('profiles')
			.update({
				openclaw_api_key: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', user.id)
			.select('id')
			.maybeSingle();

		if (updateError) return fail(500, { error: 'Failed to revoke token' });
		if (!updatedProfile) return fail(409, { error: 'Token revocation was not confirmed' });
		return { success: true };
    },

    removeDevice: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const deviceId = data.get('device_id')?.toString();

        if (!deviceId || !DEVICE_ID_RE.test(deviceId)) return fail(400, { error: 'Invalid device id' });

        const { data: removedDevice, error } = await supabase
            .from('device_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('id', deviceId)
            .select('id')
            .maybeSingle();

        if (error) return fail(500, { error: 'Failed to remove device' });
        if (!removedDevice) return fail(403, { error: 'Device not found or insufficient permissions' });
        return { success: true };
    },

    saveCommandConfig: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const commandType = formData.get('commandType')?.toString();
        const configJson = formData.get('config')?.toString();

        if (!commandType || !configJson || configJson.length > MAX_COMMAND_CONFIG_BYTES) {
            return fail(400, { error: 'Missing required fields' });
        }
        const allowedFields = COMMAND_FIELDS[commandType];
        if (!allowedFields) return fail(400, { error: 'Unsupported command type' });

        try {
            const submittedConfig = JSON.parse(configJson);
            if (!submittedConfig || typeof submittedConfig !== 'object' || Array.isArray(submittedConfig)) {
                return fail(400, { error: 'Invalid configuration format' });
            }
            const { data: existingConfigRow, error: existingConfigError } = await supabase
                .from('command_integrations')
                .select('config')
                .eq('user_id', user.id)
                .eq('command_type', commandType)
                .maybeSingle();

            if (existingConfigError) {
                console.error('Error loading existing command config');
                return fail(500, { error: 'Failed to save configuration' });
            }

            const config = {
                ...((existingConfigRow?.config as Record<string, unknown> | null) ?? {})
            };

            for (const [key, value] of Object.entries(submittedConfig)) {
                if (!allowedFields.has(key)) continue;
                const normalizedValue = normalizeCommandField(key, value);
                if (COMMAND_SECRET_FIELDS.has(key) && normalizedValue === null) {
                    continue;
                }
                if (normalizedValue === null) {
                    return fail(400, { error: 'Invalid configuration value' });
                }
                config[key] = normalizedValue;
            }

            const { error } = await supabase
                .from('command_integrations')
                .upsert({
                    user_id: user.id,
                    command_type: commandType,
                    config,
                    enabled: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,command_type'
                });

            if (error) {
                console.error('Error saving command config');
                return fail(500, { error: 'Failed to save configuration' });
            }

            return { success: true };
        } catch {
            console.error('Error parsing config');
            return fail(400, { error: 'Invalid configuration format' });
        }
    },

    toggleCommandConfig: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const configId = formData.get('configId')?.toString();
        const enabled = formData.get('enabled') === 'true';

        if (!configId) {
            return fail(400, { error: 'Missing config ID' });
        }

        const { error } = await supabase
            .from('command_integrations')
            .update({ enabled })
            .eq('id', configId)
            .eq('user_id', user.id);

        if (error) return fail(500, { error: 'Failed to update configuration' });
        return { success: true };
    },

    deleteCommandConfig: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const configId = formData.get('configId')?.toString();

        if (!configId) {
            return fail(400, { error: 'Missing config ID' });
        }

        const { count, error } = await supabase
            .from('command_integrations')
            .delete({ count: 'exact' })
            .eq('id', configId)
            .eq('user_id', user.id);

        if (error) return fail(500, { error: 'Failed to delete configuration' });
        if (!count || count === 0) return fail(403, { error: 'Configuration not found or insufficient permissions' });
        return { success: true };
    },

    addFriend: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const friendEmail = formData.get('friend_email')?.toString().trim().toLowerCase();

        if (!friendEmail || friendEmail.length > MAX_FRIEND_EMAIL_LENGTH || !EMAIL_RE.test(friendEmail)) {
            return fail(400, { error: 'Email address required' });
        }

        const genericSentResponse = { success: true, message: 'Friend request sent!' };
        const { data: emailLookup, error: emailLookupError } = await supabase.rpc('get_user_id_by_email', {
            email_input: friendEmail
        }).single();
        if (emailLookupError) {
            console.warn('[account:addFriend] email lookup skipped');
            return genericSentResponse;
        }
        const friendUserId = emailLookup as string | null;

        if (!friendUserId) {
            return genericSentResponse;
        }

        if (friendUserId === user.id) {
            return fail(400, { error: 'Cannot add yourself as a friend' });
        }

        const friendUser = { id: friendUserId };

        // Check if already friends
        const { data: existingFriendship } = await supabase
            .from('friends')
            .select('id')
            .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${friendUser.id}),and(user_id_1.eq.${friendUser.id},user_id_2.eq.${user.id})`)
            .single();

        if (existingFriendship) {
            return fail(400, { error: 'Already friends with this user' });
        }

        // Check if request already exists
        const { data: existingRequest } = await supabase
            .from('friend_requests')
            .select('id')
            .eq('from_user_id', user.id)
            .eq('to_user_id', friendUser.id)
            .single();

        if (existingRequest) {
            return genericSentResponse;
        }

        // Create friend request
        const { error } = await supabase
            .from('friend_requests')
            .insert({
                from_user_id: user.id,
                to_user_id: friendUser.id
            });

        if (error) {
            console.error('Error creating friend request');
            return fail(500, { error: 'Failed to send friend request' });
        }

        return genericSentResponse;
    },

    acceptFriend: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const requestId = formData.get('request_id')?.toString();

        if (!requestId) {
            return fail(400, { error: 'Missing request ID' });
        }

        // Get the request details
        const { data: friendRequest, error: getError } = await supabase
            .from('friend_requests')
            .select('from_user_id, to_user_id')
            .eq('id', requestId)
            .eq('to_user_id', user.id)
            .single();

        if (getError || !friendRequest) {
            return fail(404, { error: 'Friend request not found' });
        }

        // Create friendship (always store with user_id_1 < user_id_2 lexicographically for consistency)
        const user1 = friendRequest.from_user_id < friendRequest.to_user_id ? friendRequest.from_user_id : friendRequest.to_user_id;
        const user2 = friendRequest.from_user_id < friendRequest.to_user_id ? friendRequest.to_user_id : friendRequest.from_user_id;

        const { error: createError } = await supabase
            .from('friends')
            .insert({
                user_id_1: user1,
                user_id_2: user2
            });

        if (createError) {
            console.error('Error creating friendship');
            return fail(500, { error: 'Failed to accept friend request' });
        }

        // Delete the request
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete()
            .eq('id', requestId);

        if (deleteError) {
            console.error('Error deleting request');
            return fail(500, { error: 'Failed to process friend request' });
        }

        return { success: true, message: 'Friend request accepted!' };
    },

    rejectFriend: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const requestId = formData.get('request_id')?.toString();

        if (!requestId) {
            return fail(400, { error: 'Missing request ID' });
        }

        // Verify this is the recipient
        const { count: deleteCount, error: deleteError } = await supabase
            .from('friend_requests')
            .delete({ count: 'exact' })
            .eq('id', requestId)
            .eq('to_user_id', user.id);

        if (deleteError) {
            console.error('Error rejecting request');
            return fail(500, { error: 'Failed to reject friend request' });
        }

        if (!deleteCount || deleteCount === 0) return fail(403, { error: 'Request not found or insufficient permissions' });

        return { success: true, message: 'Friend request rejected' };
    },

    removeFriend: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const friendshipId = formData.get('friendship_id')?.toString();

        if (!friendshipId) {
            return fail(400, { error: 'Missing friendship ID' });
        }

        // Verify this user is part of the friendship
        const { data: friendship, error: getError } = await supabase
            .from('friends')
            .select('user_id_1, user_id_2')
            .eq('id', friendshipId)
            .single();

        if (getError || !friendship) {
            return fail(404, { error: 'Friendship not found' });
        }

        if (friendship.user_id_1 !== user.id && friendship.user_id_2 !== user.id) {
            return fail(403, { error: 'Unauthorized' });
        }

        // Delete the friendship
        const { count: deleteCount, error: deleteError } = await supabase
            .from('friends')
            .delete({ count: 'exact' })
            .eq('id', friendshipId);

        if (deleteError) {
            console.error('Error removing friend');
            return fail(500, { error: 'Failed to remove friend' });
        }

        if (!deleteCount || deleteCount === 0) return fail(403, { error: 'Friendship not found or insufficient permissions' });

        return { success: true, message: 'Friend removed' };
    },

    cancelFriendRequest: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const requestId = formData.get('request_id')?.toString();

        if (!requestId) {
            return fail(400, { error: 'Missing request ID' });
        }

        // Delete request if sent by this user
        const { count, error } = await supabase
            .from('friend_requests')
            .delete({ count: 'exact' })
            .eq('id', requestId)
            .eq('from_user_id', user.id);

        if (error) {
            console.error('Error canceling request');
            return fail(500, { error: 'Failed to cancel friend request' });
        }

        if (!count || count === 0) return fail(403, { error: 'Request not found or insufficient permissions' });

        return { success: true, message: 'Friend request canceled' };
    },

    toggleHardenedMode: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const enabled = formData.get('enabled') === 'true';

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                hardened_mode_enabled: enabled,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Error updating hardened mode');
            return fail(500, { error: 'Failed to update hardened mode setting' });
        }
        if (!updatedProfile) return fail(409, { error: 'Hardened mode setting was not updated' });

        return { success: true, hardened_mode_enabled: enabled };
    },

    emergencyUnlock: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        // Immediately disable hardened mode
        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                hardened_mode_enabled: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Error emergency unlocking');
            return fail(500, { error: 'Failed to unlock' });
        }
        if (!updatedProfile) return fail(409, { error: 'Hardened mode could not be disabled' });

        return {
            success: true,
            message: 'Hardened mode disabled. Open the iOS app to refresh device-level removal protection if it is still active.'
        };
    },

    deleteAccount: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const confirmation = formData.get('delete_confirmation')?.toString().trim();

        if (confirmation !== 'DELETE') {
            return fail(400, { error: 'Type DELETE to confirm account deletion.' });
        }

        const { error: deleteUserError } = await deleteUserAccount(user.id);
        if (deleteUserError) {
            console.error('[account:delete] Auth user deletion failed');
            return fail(500, {
                error: 'We could not delete your account automatically. Please contact support@noteresin.com and we will finish it.'
            });
        }

        await supabase.auth.signOut().catch(() => {});
        throw redirect(303, '/login?deleted=1');
    }
};
