import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/forest');
    }

    // 1. Fetch user profile for stats
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // 2. Fetch amber sessions for trees/stones
    const { data: sessions } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    return {
        profile,
        sessions: sessions || []
    };
};
