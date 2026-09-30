import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EMAIL_LENGTH = 254;
const MAX_FRIENDS = 200;
const MAX_FRIEND_REQUESTS = 100;
const MAX_PROFILE_LOOKUPS = MAX_FRIENDS + (MAX_FRIEND_REQUESTS * 2);
const MAX_JOINT_PLAN_TEXT_LENGTH = 5000;
const MAX_DISPLAY_NAME_LENGTH = 80;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const email = value.trim().toLowerCase();
	if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) return null;
	return email;
}

function cleanDisplayName(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const displayName = value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME_LENGTH);
	return displayName || null;
}

function safeDbLog(scope: string, error: unknown) {
	const issue = error as { code?: unknown; name?: unknown; status?: unknown; message?: unknown };
	console.error(`[friends] ${scope}`, {
		code: typeof issue?.code === 'string' ? issue.code : undefined,
		name: typeof issue?.name === 'string' ? issue.name : undefined,
		status: typeof issue?.status === 'number' || typeof issue?.status === 'string' ? issue.status : undefined,
		hasMessage: typeof issue?.message === 'string' && issue.message.length > 0
	});
}

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getSession } }) => {
    const supabase = await getAuthenticatedSupabase();
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login?next=/friends');
	}

	const userId = session.user.id;

	// Get accepted friends
	const { data: friendships, error: friendshipsError } = await supabase
		.from('friendships')
		.select('id, requester_id, addressee_id, status, created_at')
		.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
		.eq('status', 'accepted')
		.order('created_at', { ascending: false })
		.limit(MAX_FRIENDS);

	if (friendshipsError) {
		safeDbLog('friendships_fetch_failed', friendshipsError);
	}

	const receivedRequestsPromise = supabase
		.from('friendships')
		.select('id, requester_id, status, created_at')
		.eq('addressee_id', userId)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(MAX_FRIEND_REQUESTS);

	const sentRequestsPromise = supabase
		.from('friendships')
		.select('id, addressee_id, status, created_at')
		.eq('requester_id', userId)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(MAX_FRIEND_REQUESTS);

	const [{ data: receivedRequests }, { data: sentRequests }] = await Promise.all([
		receivedRequestsPromise,
		sentRequestsPromise
	]);

	const profileIds = Array.from(new Set([
		...(friendships || []).map((friendship) =>
			friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id
		),
		...(receivedRequests || []).map((req) => req.requester_id),
		...(sentRequests || []).map((req) => req.addressee_id)
	].filter(Boolean))).slice(0, MAX_PROFILE_LOOKUPS);

	const { data: profiles, error: profilesError } = profileIds.length > 0
		? await supabase.from('profiles').select('id, username, full_name').in('id', profileIds)
		: { data: [], error: null };
	if (profilesError) {
		safeDbLog('friend_profile_fetch_failed', profilesError);
	}
	const displayNameByUserId = new Map((profiles || []).map((profile: any) => [
		profile.id,
		cleanDisplayName(profile.full_name) || cleanDisplayName(profile.username) || 'Resin user'
	]));

	const friends = (friendships || []).map((friendship) => {
		const otherId =
			friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;

		return {
			id: friendship.id,
			displayName: displayNameByUserId.get(otherId) || 'Resin user',
			created_at: friendship.created_at
		};
	});

	const pendingReceived = (receivedRequests || []).map((req) => {
		return {
			id: req.id,
			displayName: displayNameByUserId.get(req.requester_id) || 'Resin user',
			created_at: req.created_at
		};
	});

	const pendingSent = (sentRequests || []).map((req) => {
		return {
			id: req.id,
			displayName: displayNameByUserId.get(req.addressee_id) || 'Resin user',
			created_at: req.created_at
		};
	});

	return {
		friends,
		pendingReceived,
		pendingSent
	};
};

export const actions: Actions = {
	searchUser: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = normalizeEmail(formData.get('email'));

		if (!email) {
			return fail(400, { error: 'Invalid email' });
		}

		try {
			const { data: emailLookup, error: emailLookupError } = await supabase.rpc('get_user_id_by_email', {
				email_input: email
			}).single();

			if (emailLookupError) {
				safeDbLog('email_lookup_failed', emailLookupError);
				return fail(500, { error: 'Failed to search users' });
			}
			const foundUserId = emailLookup as string | null;
			if (!foundUserId) {
				return fail(404, { error: 'User not found' });
			}

			if (foundUserId === session.user.id) {
				return fail(400, { error: 'Cannot add yourself' });
			}

			// Get user profile
			const { data: profile } = await supabase
				.from('profiles')
				.select('id')
				.eq('id', foundUserId)
				.single();

			if (!profile) {
				return fail(404, { error: 'User profile not found' });
			}

			// Check if already friends or pending
			const { data: existing } = await supabase
				.from('friendships')
				.select('status')
				.or(
					`and(requester_id.eq.${session.user.id},addressee_id.eq.${foundUserId}),and(requester_id.eq.${foundUserId},addressee_id.eq.${session.user.id})`
				)
				.single();

			if (existing) {
				return fail(400, { error: `Already ${existing.status}` });
			}

			return {
				found: true,
				user: {
					id: foundUserId,
					email
				}
			};
		} catch (error) {
			safeDbLog('search_failed', error);
			return fail(500, { error: 'Search failed' });
		}
	},

	sendRequest: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const addresseeId = formData.get('addressee_id') as string;

		if (!addresseeId || !UUID_RE.test(addresseeId) || addresseeId === session.user.id) {
			return fail(400, { error: 'Invalid user' });
		}

		const { data: addressee } = await supabase
			.from('profiles')
			.select('id')
			.eq('id', addresseeId)
			.maybeSingle();
		if (!addressee) {
			return fail(400, { error: 'Invalid user' });
		}

		const { data: existing } = await supabase
			.from('friendships')
			.select('id')
			.or(
				`and(requester_id.eq.${session.user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${session.user.id})`
			)
			.maybeSingle();
		if (existing) {
			return { success: true };
		}

		const { data, error } = await supabase
			.from('friendships')
			.insert({
				requester_id: session.user.id,
				addressee_id: addresseeId,
				status: 'pending'
			})
			.select('id, requester_id, addressee_id, status, created_at')
			.single();

		if (error) {
			safeDbLog('request_insert_failed', error);
			return fail(500, { error: 'Failed to send request' });
		}

		return { success: true, friendship: data };
	},

	acceptRequest: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		if (!friendshipId || !UUID_RE.test(friendshipId)) {
			return fail(400, { error: 'Invalid friend request' });
		}

		const { data, error } = await supabase
			.from('friendships')
			.update({ status: 'accepted' })
			.eq('id', friendshipId)
			.eq('addressee_id', session.user.id)
			.select('id, requester_id, addressee_id, status, created_at')
			.single();

		if (error) {
			safeDbLog('request_accept_failed', error);
			return fail(500, { error: 'Failed to accept request' });
		}

		return { success: true, friendship: data };
	},

	declineRequest: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		if (!friendshipId || !UUID_RE.test(friendshipId)) {
			return fail(400, { error: 'Invalid friend request' });
		}

		const { error } = await supabase
			.from('friendships')
			.delete()
			.eq('id', friendshipId)
			.eq('addressee_id', session.user.id);

		if (error) {
			safeDbLog('request_decline_failed', error);
			return fail(500, { error: 'Failed to decline request' });
		}

		return { success: true };
	},

	removeFriend: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		if (!friendshipId || !UUID_RE.test(friendshipId)) {
			return fail(400, { error: 'Invalid friendship' });
		}

		const { error } = await supabase
			.from('friendships')
			.delete()
			.eq('id', friendshipId)
			.or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);

		if (error) {
			safeDbLog('friend_remove_failed', error);
			return fail(500, { error: 'Failed to remove friend' });
		}

		return { success: true };
	},

	createJointPlan: async ({ locals: { getAuthenticatedSupabase, getSession }, request }) => {
        const supabase = await getAuthenticatedSupabase();
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('collaborator_id') as string;
		const rawText = formData.get('raw_text') as string;
		const intensity = formData.get('intensity') as string;
		const cleanRawText = typeof rawText === 'string' ? rawText.trim().slice(0, MAX_JOINT_PLAN_TEXT_LENGTH) : '';
		const parsedIntensity = Number.parseInt(intensity, 10);
		const cleanIntensity = Number.isFinite(parsedIntensity)
			? Math.min(100, Math.max(1, parsedIntensity))
			: 50;

		if (!friendshipId || !UUID_RE.test(friendshipId) || !cleanRawText) {
			return fail(400, { error: 'Invalid input' });
		}

		// Resolve the collaborator from the friendship row instead of trusting a client-supplied user id.
		const { data: friendship } = await supabase
			.from('friendships')
			.select('requester_id, addressee_id')
			.eq('id', friendshipId)
			.or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`)
			.eq('status', 'accepted')
			.single();

		if (!friendship) {
			return fail(403, { error: 'Not friends with this user' });
		}
		const collaboratorId = friendship.requester_id === session.user.id
			? friendship.addressee_id
			: friendship.requester_id;

		const { data, error } = await supabase
			.from('joint_amber_plans')
			.insert({
				initiator_id: session.user.id,
				collaborator_id: collaboratorId,
				raw_text: cleanRawText,
				intensity: cleanIntensity,
				status: 'pending'
			})
			.select('id, raw_text, intensity, status, created_at')
			.single();

		if (error) {
			safeDbLog('joint_plan_insert_failed', error);
			return fail(500, { error: 'Failed to create joint plan' });
		}

		return { success: true, plan: data };
	}
};
