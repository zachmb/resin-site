import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url, params, locals: { supabase, getSession } }) => {
    const token = url.searchParams.get('token');

    if (!token) {
        return { error: 'Invalid invite link' };
    }

    // Verify the invite token exists and is valid
    const { data: invite } = await supabase
        .from('board_invites')
        .select('*, boards(id, name)')
        .eq('token', token)
        .single();

    if (!invite) {
        return { error: 'Invalid or expired invite link' };
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return { error: 'This invite link has expired' };
    }

    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
        return { error: 'This invite link has reached its usage limit' };
    }

    // Check if user is logged in
    const session = await getSession();

    if (!session) {
        // Redirect to login with return URL
        throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
    }

    // Check if user is already a member
    const { data: membership } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', invite.board_id)
        .eq('user_id', session.user.id)
        .single();

    if (membership) {
        throw redirect(303, `/boards/${invite.board_id}`);
    }

    return {
        board: invite.boards,
        token,
        boardId: invite.board_id
    };
};

export const actions: Actions = {
    join: async ({ request, params, locals: { supabase, getSession } }) => {
        const session = await getSession();

        if (!session) {
            return { success: false, error: 'You must be logged in to join a board' };
        }

        const formData = await request.formData();
        const token = formData.get('token')?.toString();
        const boardId = formData.get('boardId')?.toString();

        if (!token || !boardId) {
            return { success: false, error: 'Invalid request' };
        }

        try {
            // Re-validate the invite token
            const { data: invite } = await supabase
                .from('board_invites')
                .select('*')
                .eq('token', token)
                .single();

            if (!invite) {
                return { success: false, error: 'Invalid invite link' };
            }

            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                return { success: false, error: 'This invite link has expired' };
            }

            if (invite.max_uses && invite.uses_count >= invite.max_uses) {
                return { success: false, error: 'This invite link has reached its usage limit' };
            }

            // Check if already a member
            const { data: existing } = await supabase
                .from('board_members')
                .select('id')
                .eq('board_id', boardId)
                .eq('user_id', session.user.id)
                .single();

            if (existing) {
                throw redirect(303, `/boards/${boardId}`);
            }

            // Add user to board
            const { error: memberError } = await supabase.from('board_members').insert({
                board_id: boardId,
                user_id: session.user.id,
                role: 'editor'
            });

            if (memberError) throw memberError;

            // Increment uses_count
            const { error: updateError } = await supabase
                .from('board_invites')
                .update({ uses_count: invite.uses_count + 1 })
                .eq('token', token);

            if (updateError) console.error('Error updating invite count:', updateError);

            // Redirect to board
            throw redirect(303, `/boards/${boardId}`);
        } catch (err: any) {
            if (err.status === 303) {
                throw err; // Re-throw redirects
            }
            console.error('Error joining board:', err);
            return { success: false, error: String(err) };
        }
    }
};
