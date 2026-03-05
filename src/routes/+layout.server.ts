export const load = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        return {
            session: null,
            notes: [],
            profile: null
        };
    }

    const { data: notes } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    return {
        session,
        notes: notes || [],
        profile: profile || null,
    }
}
