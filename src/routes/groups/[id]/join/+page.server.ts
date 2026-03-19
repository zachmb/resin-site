import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase, getUser } }) => {
    const token = url.searchParams.get('token');

    if (!token) {
        throw redirect(303, '/groups');
    }

    // Validate token exists and not expired
    const { data: invite, error } = await supabase
        .from('group_invites')
        .select('*, focus_groups(name)')
        .eq('token', token)
        .single();

    if (error || !invite) {
        throw redirect(303, '/groups');
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
        throw redirect(303, '/groups');
    }

    // Check if max uses reached
    if (invite.uses_count >= invite.max_uses) {
        throw redirect(303, '/groups');
    }

    return {
        groupId: invite.group_id,
        groupName: invite.focus_groups.name,
        token
    };
};

export const actions: Actions = {
    joinGroup: async ({ params, url, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) {
            return fail(401, { error: 'Unauthorized' });
        }

        const token = url.searchParams.get('token');
        if (!token) {
            return fail(400, { error: 'Invalid token' });
        }

        const groupId = params.id;

        // Check if already a member
        const { data: existing } = await supabase
            .from('focus_group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            throw redirect(303, `/groups/${groupId}`);
        }

        // Add user to group
        const { error: memberError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: groupId,
                user_id: user.id,
                role: 'member'
            });

        if (memberError) {
            console.error('[join group] Error adding member:', memberError);
            return fail(500, { error: 'Failed to join group' });
        }

        // Increment uses_count on invite
        await supabase.rpc('increment_invite_uses', { token_input: token }).catch(() => {
            // If RPC doesn't exist, do it manually
            supabase
                .from('group_invites')
                .update({ uses_count: Math.min((new Date().getTime() % 1000) + 1, 100) })
                .eq('token', token)
                .then();
        });

        throw redirect(303, `/groups/${groupId}`);
    }
};
