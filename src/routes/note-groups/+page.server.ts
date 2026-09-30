import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const GROUP_COLUMNS = 'id, name, description, color, created_at';
const MAX_GROUP_NAME_LENGTH = 80;
const MAX_NOTE_GROUPS = 200;
const GROUP_COLORS = new Set(['resin-forest', 'resin-amber', 'resin-earth']);
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeGroupName(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value
		.replace(CONTROL_CHARS_RE, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_GROUP_NAME_LENGTH);
}

function sanitizeGroupColor(value: FormDataEntryValue | null): string {
	return typeof value === 'string' && GROUP_COLORS.has(value) ? value : 'resin-forest';
}

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getUser } }) => {
    const supabase = await getAuthenticatedSupabase();
    const user = await getUser();

    if (!user) {
        throw redirect(303, '/login?next=/note-groups');
    }

    // Fetch user's note groups
    const { data: groups } = await supabase
        .from('note_groups')
        .select(GROUP_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTE_GROUPS);

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
			const name = sanitizeGroupName(formData.get('name'));
			const color = sanitizeGroupColor(formData.get('color'));

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
					.select(GROUP_COLUMNS)
					.single();

			if (err) throw err;

			return {
				success: true,
				group: newGroup
			};
			} catch {
				console.error('[note-groups] Create error');
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
			const groupId = formData.get('groupId');

			if (typeof groupId !== 'string' || !UUID_RE.test(groupId)) {
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
			} catch {
				console.error('[note-groups] Delete error');
				return fail(500, { error: 'Failed to delete group' });
			}
		}
	};
