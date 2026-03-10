import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

async function getAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});
}

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
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
		.eq('status', 'accepted');

	if (friendshipsError) {
		console.error('Error fetching friendships:', friendshipsError);
	}

	// Get the other user's profile for each friendship
	const friends = await Promise.all(
		(friendships || []).map(async (friendship) => {
			const otherId =
				friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
			const { data: profile } = await supabase
				.from('profiles')
				.select('id, email:auth.users(email)')
				.eq('id', otherId)
				.single();

			return {
				id: friendship.id,
				user_id: otherId,
				email: profile?.email || 'Unknown',
				created_at: friendship.created_at
			};
		})
	);

	// Get pending received requests
	const { data: receivedRequests } = await supabase
		.from('friendships')
		.select('id, requester_id, status, created_at')
		.eq('addressee_id', userId)
		.eq('status', 'pending');

	const pendingReceived = await Promise.all(
		(receivedRequests || []).map(async (req) => {
			const { data: profile } = await supabase
				.from('profiles')
				.select('id, email:auth.users(email)')
				.eq('id', req.requester_id)
				.single();

			return {
				id: req.id,
				user_id: req.requester_id,
				email: profile?.email || 'Unknown',
				created_at: req.created_at
			};
		})
	);

	// Get pending sent requests
	const { data: sentRequests } = await supabase
		.from('friendships')
		.select('id, addressee_id, status, created_at')
		.eq('requester_id', userId)
		.eq('status', 'pending');

	const pendingSent = await Promise.all(
		(sentRequests || []).map(async (req) => {
			const { data: profile } = await supabase
				.from('profiles')
				.select('id, email:auth.users(email)')
				.eq('id', req.addressee_id)
				.single();

			return {
				id: req.id,
				user_id: req.addressee_id,
				email: profile?.email || 'Unknown',
				created_at: req.created_at
			};
		})
	);

	return {
		friends,
		pendingReceived,
		pendingSent
	};
};

export const actions: Actions = {
	searchUser: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Invalid email' });
		}

		try {
			const admin = await getAdminClient();

			// Query auth.users by email via admin client
			// Need to iterate through all pages since listUsers returns paginated results
			let allUsers = [];
			let page = 1;
			let hasMore = true;

			while (hasMore) {
				const { data: pageData, error } = await admin.auth.admin.listUsers({
					page,
					perPage: 100
				});

				if (error) {
					console.error('Auth error:', error);
					return fail(500, { error: 'Failed to search users' });
				}

				if (!pageData?.users) {
					break;
				}

				allUsers = allUsers.concat(pageData.users);

				// Stop if we got fewer results than requested (means we're on the last page)
				hasMore = pageData.users.length === 100;
				page++;
			}

			const user = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			if (user.id === session.user.id) {
				return fail(400, { error: 'Cannot add yourself' });
			}

			// Get user profile
			const { data: profile } = await supabase
				.from('profiles')
				.select('id')
				.eq('id', user.id)
				.single();

			if (!profile) {
				return fail(404, { error: 'User profile not found' });
			}

			// Check if already friends or pending
			const { data: existing } = await supabase
				.from('friendships')
				.select('status')
				.or(
					`and(requester_id.eq.${session.user.id},addressee_id.eq.${user.id}),and(requester_id.eq.${user.id},addressee_id.eq.${session.user.id})`
				)
				.single();

			if (existing) {
				return fail(400, { error: `Already ${existing.status}` });
			}

			return {
				found: true,
				user: {
					id: user.id,
					email: user.email || ''
				}
			};
		} catch (error) {
			console.error('Search error:', error);
			return fail(500, { error: 'Search failed' });
		}
	},

	sendRequest: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const addresseeId = formData.get('addressee_id') as string;

		if (!addresseeId) {
			return fail(400, { error: 'Invalid user' });
		}

		const { data, error } = await supabase
			.from('friendships')
			.insert({
				requester_id: session.user.id,
				addressee_id: addresseeId,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			console.error('Insert error:', error);
			return fail(500, { error: 'Failed to send request' });
		}

		return { success: true, friendship: data };
	},

	acceptRequest: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		const { data, error } = await supabase
			.from('friendships')
			.update({ status: 'accepted' })
			.eq('id', friendshipId)
			.eq('addressee_id', session.user.id)
			.select()
			.single();

		if (error) {
			console.error('Update error:', error);
			return fail(500, { error: 'Failed to accept request' });
		}

		return { success: true, friendship: data };
	},

	declineRequest: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		const { error } = await supabase
			.from('friendships')
			.delete()
			.eq('id', friendshipId)
			.eq('addressee_id', session.user.id);

		if (error) {
			console.error('Delete error:', error);
			return fail(500, { error: 'Failed to decline request' });
		}

		return { success: true };
	},

	removeFriend: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendship_id') as string;

		const { error } = await supabase
			.from('friendships')
			.delete()
			.eq('id', friendshipId)
			.or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);

		if (error) {
			console.error('Delete error:', error);
			return fail(500, { error: 'Failed to remove friend' });
		}

		return { success: true };
	},

	createJointPlan: async ({ locals: { supabase, getSession }, request }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const collaboratorId = formData.get('collaborator_id') as string;
		const rawText = formData.get('raw_text') as string;
		const intensity = formData.get('intensity') as string;

		if (!collaboratorId || !rawText || !rawText.trim()) {
			return fail(400, { error: 'Invalid input' });
		}

		// Verify they are friends
		const { data: friendship } = await supabase
			.from('friendships')
			.select('id')
			.or(
				`and(requester_id.eq.${session.user.id},addressee_id.eq.${collaboratorId}),and(requester_id.eq.${collaboratorId},addressee_id.eq.${session.user.id})`
			)
			.eq('status', 'accepted')
			.single();

		if (!friendship) {
			return fail(403, { error: 'Not friends with this user' });
		}

		const { data, error } = await supabase
			.from('joint_amber_plans')
			.insert({
				initiator_id: session.user.id,
				collaborator_id: collaboratorId,
				raw_text: rawText.trim(),
				intensity: parseInt(intensity) || 50,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			console.error('Insert error:', error);
			return fail(500, { error: 'Failed to create joint plan' });
		}

		return { success: true, plan: data };
	}
};
