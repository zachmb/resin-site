import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getUser } }) => {
    const supabase = await getAuthenticatedSupabase();
    const user = await getUser();

    if (!user) {
        throw redirect(303, '/login?next=/note-groups');
    }

    // Fetch user's note groups
    const { data: groups } = await supabase
        .from('note_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return {
        groups: groups || []
    };
};

export const actions: Actions = {
	createGroup: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
		const supabase = await getAuthenticatedSupabase();
		const user = await getUser();

		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const color = (formData.get('color') as string) || 'resin-forest';

		if (!name) {
			return fail(400, { error: 'Group name is required' });
		}

		try {
			const { data: newGroup, error: err } = await supabase
				.from('note_groups')
				.insert({
					user_id: user.id,
					name,
					color
				})
				.select()
				.single();

			if (err) throw err;

			return {
				success: true,
				group: newGroup
			};
		} catch (error) {
			console.error('[note-groups] Create error:', error);
			return fail(500, { error: 'Failed to create group' });
		}
	},

	deleteGroup: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
		const supabase = await getAuthenticatedSupabase();
		const user = await getUser();

		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const groupId = formData.get('groupId') as string;

		if (!groupId) {
			return fail(400, { error: 'Group ID is required' });
		}

		try {
			const { error: err } = await supabase
				.from('note_groups')
				.delete()
				.eq('id', groupId)
				.eq('user_id', user.id); // Ensure user owns the group

			if (err) throw err;

			return { success: true };
		} catch (error) {
			console.error('[note-groups] Delete error:', error);
			return fail(500, { error: 'Failed to delete group' });
		}
	}
};
