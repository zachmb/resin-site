import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
