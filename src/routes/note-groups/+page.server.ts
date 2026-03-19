import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getUser } }) => {
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
