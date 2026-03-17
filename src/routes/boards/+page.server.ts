import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/boards');
    }

    // Fetch user's boards via board_members relationship
    const { data: userBoards } = await supabase
        .from('board_members')
        .select(`
            boards(
                id,
                name,
                description,
                created_by,
                created_at
            )
        `)
        .eq('user_id', session.user.id);

    // Extract boards and count members for each
    const boardsList = (userBoards || []).map(bm => ({
        ...(bm.boards as any),
        memberCount: (userBoards || []).filter(b => (b.boards as any)?.id === (bm.boards as any)?.id).length
    })) || [];

    return {
        boards: boardsList,
        session
    };
};

export const actions: Actions = {
    createBoard: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const formData = await request.formData();
        const name = formData.get('name')?.toString() || '';
        const description = formData.get('description')?.toString() || '';

        if (!name || name.trim().length === 0) {
            return { success: false, error: 'Board name is required' };
        }

        try {
            // Create the board
            const { data: board, error: boardError } = await supabase
                .from('boards')
                .insert({
                    name: name.trim(),
                    description: description.trim(),
                    created_by: session.user.id
                })
                .select()
                .single();

            if (boardError) throw boardError;

            // Add creator as owner
            const { error: memberError } = await supabase
                .from('board_members')
                .insert({
                    board_id: board.id,
                    user_id: session.user.id,
                    role: 'owner'
                });

            if (memberError) throw memberError;

            return { success: true, board };
        } catch (err) {
            console.error('Error creating board:', err);
            return { success: false, error: String(err) };
        }
    }
};
