import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getUser } }) => {
	const user = await getUser();
	if (!user) {
		throw redirect(303, '/login?next=/account');
	}

    // Fetch profile - resilient to missing optional columns in production
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('id, username, full_name, avatar_url, total_stones, current_streak, hardened_mode_enabled, openclaw_api_key, openclaw_url, widget_enabled, availability_schedule')
		.eq('id', user.id)
		.single();

    let finalProfile = profile;
    if (profileError) {
        console.warn('[account:load] Initial profile fetch failed, retrying with minimal columns:', profileError.message);
        const { data: minimalProfile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, total_stones, current_streak')
            .eq('id', user.id)
            .single();
        finalProfile = minimalProfile ? { 
            ...minimalProfile,
            hardened_mode_enabled: false,
            openclaw_api_key: null,
            openclaw_url: null,
            widget_enabled: true,
            availability_schedule: null
        } as any : null;
    }

	const { data: feedback } = await supabase
		.from('amber_task_feedback')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

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
	const { data: deviceTokens } = await supabase
		.from('device_tokens')
		.select('device_token, platform, updated_at')
		.eq('user_id', user.id)
		.order('updated_at', { ascending: false });

	// Load command integrations
	const { data: commandConfigs } = await supabase
		.from('command_integrations')
		.select('id, command_type, config, enabled')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true });

	// Load friends and friend requests
	const { data: friends } = await supabase
		.from('friends')
		.select(`
			id,
			user_id_1,
			user_id_2,
			profiles!friends_user_id_1_fkey(id, email),
			profiles!friends_user_id_2_fkey(id, email),
			created_at
		`)
		.or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

	// Load incoming friend requests
	const { data: incomingRequests } = await supabase
		.from('friend_requests')
		.select(`
			id,
			from_user_id,
			profiles!friend_requests_from_user_id_fkey(id, email),
			created_at
		`)
		.eq('to_user_id', user.id)
		.order('created_at', { ascending: false });

	// Load outgoing friend requests
	const { data: outgoingRequests } = await supabase
		.from('friend_requests')
		.select(`
			id,
			to_user_id,
			profiles!friend_requests_to_user_id_fkey(id, email),
			created_at
		`)
		.eq('from_user_id', user.id)
		.order('created_at', { ascending: false });

	// Transform friends data - Supabase joins with FK aliases return array or single object
	const friendsList = (friends || []).map((friendship: any) => {
		const isFriend1 = friendship.user_id_1 === user.id;
		// Supabase returns FK joins as the table name or the alias key
		const p1 = Array.isArray(friendship['profiles!friends_user_id_1_fkey'])
			? friendship['profiles!friends_user_id_1_fkey'][0]
			: friendship['profiles!friends_user_id_1_fkey'];
		const p2 = Array.isArray(friendship['profiles!friends_user_id_2_fkey'])
			? friendship['profiles!friends_user_id_2_fkey'][0]
			: friendship['profiles!friends_user_id_2_fkey'];
		const friendProfile = isFriend1 ? p2 : p1;
		return {
			id: friendship.id,
			friendId: isFriend1 ? friendship.user_id_2 : friendship.user_id_1,
			email: friendProfile?.email || 'Unknown',
			createdAt: friendship.created_at
		};
	});

	return {
		profile: finalProfile,
		deviceTokens: deviceTokens || [],
		commandConfigs: commandConfigs || [],
		tasteData: {
			feelingCounts,
			enjoyedThings,
			ratingHistory: ratingHistory.reverse() // chronological
		},
		friends: friendsList,
		incomingRequests: (incomingRequests || []).map((req: any) => {
			const fromProfile = Array.isArray(req['profiles!friend_requests_from_user_id_fkey'])
				? req['profiles!friend_requests_from_user_id_fkey'][0]
				: req['profiles!friend_requests_from_user_id_fkey'];
			return {
				id: req.id,
				fromUserId: req.from_user_id,
				fromEmail: fromProfile?.email || 'Unknown',
				createdAt: req.created_at
			};
		}),
		outgoingRequests: (outgoingRequests || []).map((req: any) => {
			const toProfile = Array.isArray(req['profiles!friend_requests_to_user_id_fkey'])
				? req['profiles!friend_requests_to_user_id_fkey'][0]
				: req['profiles!friend_requests_to_user_id_fkey'];
			return {
				id: req.id,
				toUserId: req.to_user_id,
				toEmail: toProfile?.email || 'Unknown',
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
            console.error(error)
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
        const openclaw_url = formData.get('openclaw_url') as string;
        const openclaw_api_key = formData.get('openclaw_api_key') as string;
        const widget_enabled = formData.get('widget_enabled') === 'on';

        // Build per-day availability schedule
        const availabilitySchedule = [];
        for (let i = 0; i < 7; i++) {
            const startTime = formData.get(`availability_start_${i}`) as string;
            const endTime = formData.get(`availability_end_${i}`) as string;

            // Parse time strings (HH:MM) to hours
            const startHour = startTime ? parseInt(startTime.split(':')[0]) : 16;
            const endHour = endTime ? parseInt(endTime.split(':')[0]) : 22;

            availabilitySchedule.push({
                start: startHour,
                end: endHour
            });
        }

        const updates = {
            id: user.id,
            openclaw_url,
            openclaw_api_key,
            availability_schedule: availabilitySchedule,
            widget_enabled,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to update preferences' };
        return { success: true };
    },

    generateToken: async ({ locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const newKey = crypto.randomUUID();

        const updates = {
            id: user.id,
            openclaw_api_key: newKey,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to generate token' };
        return { success: true, token: newKey };
    },

    removeDevice: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const token = data.get('device_token')?.toString();

        if (!token) return fail(400, { error: 'Missing device token' });

        const { count, error } = await supabase
            .from('device_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('device_token', token);

        if (error) return fail(500, { error: 'Failed to remove device' });
        if (!count || count === 0) return fail(403, { error: 'Device not found or insufficient permissions' });
        return { success: true };
    },

    saveCommandConfig: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const commandType = formData.get('commandType')?.toString();
        const configJson = formData.get('config')?.toString();

        if (!commandType || !configJson) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const config = JSON.parse(configJson);

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
                console.error('Error saving command config:', error);
                return fail(500, { error: 'Failed to save configuration' });
            }

            return { success: true };
        } catch (e) {
            console.error('Error parsing config:', e);
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
            .delete()
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
        const friendEmail = formData.get('friend_email')?.toString().trim();

        if (!friendEmail) {
            return fail(400, { error: 'Email address required' });
        }

        // Find user by email - check profiles table first, then fallback to email field
        let friendUserId: string | null = null;

        // Try profiles with email column (may not exist on all deployments)
        const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', friendEmail.split('@')[0])
            .limit(1)
            .single();

        if (!profileByEmail) {
            // Use RPC to look up by email securely
            const { data: emailLookup } = await supabase.rpc('get_user_id_by_email', {
                email_input: friendEmail
            }).single();
            friendUserId = emailLookup as string | null;
        } else {
            friendUserId = profileByEmail.id;
        }

        if (!friendUserId) {
            return fail(404, { error: 'User not found. Make sure you have the correct email address.' });
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
            return fail(400, { error: 'Friend request already sent' });
        }

        // Create friend request
        const { error } = await supabase
            .from('friend_requests')
            .insert({
                from_user_id: user.id,
                to_user_id: friendUser.id
            });

        if (error) {
            console.error('Error creating friend request:', error);
            return fail(500, { error: 'Failed to send friend request' });
        }

        return { success: true, message: 'Friend request sent!' };
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
            console.error('Error creating friendship:', createError);
            return fail(500, { error: 'Failed to accept friend request' });
        }

        // Delete the request
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete()
            .eq('id', requestId);

        if (deleteError) {
            console.error('Error deleting request:', deleteError);
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
            .delete()
            .eq('id', requestId)
            .eq('to_user_id', user.id);

        if (deleteError) {
            console.error('Error rejecting request:', deleteError);
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
            .delete()
            .eq('id', friendshipId);

        if (deleteError) {
            console.error('Error removing friend:', deleteError);
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
            .delete()
            .eq('id', requestId)
            .eq('from_user_id', user.id);

        if (error) {
            console.error('Error canceling request:', error);
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

        const { error } = await supabase
            .from('profiles')
            .update({
                hardened_mode_enabled: enabled,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating hardened mode:', error);
            return fail(500, { error: 'Failed to update hardened mode setting' });
        }

        return { success: true, hardened_mode_enabled: enabled };
    },

    emergencyUnlock: async ({ request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        // Immediately disable hardened mode
        const { error } = await supabase
            .from('profiles')
            .update({
                hardened_mode_enabled: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error emergency unlocking:', error);
            return fail(500, { error: 'Failed to unlock' });
        }

        // Send push notification to iOS app to release denyAppRemoval
        try {
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', user.id)
                .eq('platform', 'apns');

            if (tokens && tokens.length > 0) {
                // Trigger push notification via APNs
                // (DeviceTokenService will handle the actual removal of denyAppRemoval)
                // For now, the app will check on next launch via profile sync
            }
        } catch (err) {
            console.error('Error sending emergency unlock notification:', err);
        }

        return { success: true, message: 'Hardened mode disabled. Resin is now deletable.' };
    }
};
