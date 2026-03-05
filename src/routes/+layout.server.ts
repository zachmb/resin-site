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
        .order('created_at', { ascending: false });

    const normalizedNotes = (notes || []).map((note: any) => ({
        ...note,
        title: note.display_title ?? note.title ?? '',
        content: note.raw_text ?? note.content ?? ''
    }));

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    return {
        session,
        notes: normalizedNotes,
        profile: profile || null,
    }
}
