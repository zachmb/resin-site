import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/boards/' + params.id);
    }

    // Verify user is a board member
    const { data: membership } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', params.id)
        .eq('user_id', session.user.id)
        .single();

    if (!membership) {
        throw redirect(303, '/boards');
    }

    // Fetch board
    const { data: board } = await supabase
        .from('boards')
        .select('*')
        .eq('id', params.id)
        .single();

    // Fetch all notes for the board with author info
    const { data: notes } = await supabase
        .from('board_notes')
        .select(`
            *,
            profiles!board_notes_user_id_fkey(email)
        `)
        .eq('board_id', params.id)
        .order('created_at', { ascending: false });

    // Fetch all board members with their profiles
    const { data: members } = await supabase
        .from('board_members')
        .select(`
            user_id,
            role,
            profiles!board_members_user_id_fkey(email, id)
        `)
        .eq('board_id', params.id);

    return {
        board,
        notes: notes || [],
        members: members || [],
        currentUserRole: membership.role,
        currentUserId: session.user.id
    };
};

export const actions: Actions = {
    addNote: async ({ request, params, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        // Verify membership
        const { data: membership } = await supabase
            .from('board_members')
            .select('role')
            .eq('board_id', params.id)
            .eq('user_id', session.user.id)
            .single();

        if (!membership) return { success: false, error: 'Not a board member' };

        const formData = await request.formData();
        const title = formData.get('title')?.toString() || '';
        const content = formData.get('content')?.toString() || '';
        const color = formData.get('color')?.toString() || 'amber';

        try {
            const { data: note, error } = await supabase
                .from('board_notes')
                .insert({
                    board_id: params.id,
                    user_id: session.user.id,
                    title,
                    content,
                    color
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, note };
        } catch (err) {
            console.error('Error adding note:', err);
            return { success: false, error: String(err) };
        }
    },

    updateNote: async ({ request, params, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const formData = await request.formData();
        const noteId = formData.get('noteId')?.toString();
        const title = formData.get('title')?.toString() || '';
        const content = formData.get('content')?.toString() || '';
        const color = formData.get('color')?.toString() || 'amber';

        if (!noteId) return { success: false, error: 'Note ID required' };

        try {
            // Verify ownership
            const { data: note } = await supabase
                .from('board_notes')
                .select('user_id')
                .eq('id', noteId)
                .single();

            if (!note) return { success: false, error: 'Note not found' };

            const { data: membership } = await supabase
                .from('board_members')
                .select('role')
                .eq('board_id', params.id)
                .eq('user_id', session.user.id)
                .single();

            const isOwner = note.user_id === session.user.id;
            const isBoardOwner = membership?.role === 'owner';

            if (!isOwner && !isBoardOwner) {
                return { success: false, error: 'Not authorized to edit this note' };
            }

            const { error } = await supabase
                .from('board_notes')
                .update({
                    title,
                    content,
                    color,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error updating note:', err);
            return { success: false, error: String(err) };
        }
    },

    deleteNote: async ({ request, params, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const formData = await request.formData();
        const noteId = formData.get('noteId')?.toString();

        if (!noteId) return { success: false, error: 'Note ID required' };

        try {
            // Verify ownership
            const { data: note } = await supabase
                .from('board_notes')
                .select('user_id')
                .eq('id', noteId)
                .single();

            if (!note) return { success: false, error: 'Note not found' };

            const { data: membership } = await supabase
                .from('board_members')
                .select('role')
                .eq('board_id', params.id)
                .eq('user_id', session.user.id)
                .single();

            const isOwner = note.user_id === session.user.id;
            const isBoardOwner = membership?.role === 'owner';

            if (!isOwner && !isBoardOwner) {
                return { success: false, error: 'Not authorized to delete this note' };
            }

            const { error } = await supabase.from('board_notes').delete().eq('id', noteId);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error deleting note:', err);
            return { success: false, error: String(err) };
        }
    },

    generateInviteLink: async ({ params, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        // Verify board owner
        const { data: membership } = await supabase
            .from('board_members')
            .select('role')
            .eq('board_id', params.id)
            .eq('user_id', session.user.id)
            .single();

        if (membership?.role !== 'owner') {
            return { success: false, error: 'Only board owners can generate invite links' };
        }

        try {
            const { data: invite, error } = await supabase
                .from('board_invites')
                .insert({
                    board_id: params.id,
                    created_by: session.user.id
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, token: invite.token };
        } catch (err) {
            console.error('Error generating invite link:', err);
            return { success: false, error: String(err) };
        }
    }
};
