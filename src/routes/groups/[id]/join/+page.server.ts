import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { adminClient } from '$lib/server/auth';

const INVITE_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const MAX_INVITE_TOKEN_LENGTH = 256;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;

function inviteCookieName(groupId: string) {
    return `resin_group_invite_${groupId}`;
}

function inviteCookiePath(groupId: string) {
    return `/groups/${groupId}/join`;
}

function inviteCookieOptions(groupId: string, protocol: string) {
    return {
        path: inviteCookiePath(groupId),
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: protocol === 'https:',
        maxAge: INVITE_COOKIE_MAX_AGE_SECONDS
    };
}

function cleanInviteToken(value: string | undefined | null): string | null {
    const token = value?.trim();
    if (!token || token.length > MAX_INVITE_TOKEN_LENGTH || CONTROL_CHARS_RE.test(token)) return null;
    return token;
}

async function releaseInviteClaim(token: string, groupId: string, claimedUsesCount: number) {
    const { error } = await adminClient
        .from('group_invites')
        .update({ uses_count: claimedUsesCount - 1 })
        .eq('token', token)
        .eq('group_id', groupId)
        .eq('uses_count', claimedUsesCount);

    if (error) {
        console.warn('[join group] Failed to release invite claim');
    }
}

export const load: PageServerLoad = async ({ params, url, cookies, locals: { getUser } }) => {
    if (!UUID_RE.test(params.id)) {
        throw redirect(303, '/groups');
    }

    if (url.searchParams.has('token')) {
        const queryToken = cleanInviteToken(url.searchParams.get('token'));
        if (!queryToken) {
            throw redirect(303, '/groups');
        }

        cookies.set(inviteCookieName(params.id), queryToken, inviteCookieOptions(params.id, url.protocol));
        throw redirect(303, inviteCookiePath(params.id));
    }

    const token = cleanInviteToken(url.searchParams.get('token') ?? cookies.get(inviteCookieName(params.id)));
    const user = await getUser();

    if (!token) {
        throw redirect(303, '/groups');
    }
    if (!user) {
        cookies.set(inviteCookieName(params.id), token, inviteCookieOptions(params.id, url.protocol));
        throw redirect(303, `/login?next=/groups/${params.id}/join`);
    }

    // Validate token exists and not expired
    const { data: invite, error } = await adminClient
        .from('group_invites')
        .select('group_id, expires_at, uses_count, max_uses, focus_groups(name)')
        .eq('token', token)
        .eq('group_id', params.id)
        .single();

    if (error || !invite) {
        cookies.delete(inviteCookieName(params.id), { path: inviteCookiePath(params.id) });
        throw redirect(303, '/groups');
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
        cookies.delete(inviteCookieName(params.id), { path: inviteCookiePath(params.id) });
        throw redirect(303, '/groups');
    }

    // Check if max uses reached
    if (invite.uses_count >= invite.max_uses) {
        cookies.delete(inviteCookieName(params.id), { path: inviteCookiePath(params.id) });
        throw redirect(303, '/groups');
    }

    const focusGroup = Array.isArray((invite as any).focus_groups)
        ? (invite as any).focus_groups[0]
        : (invite as any).focus_groups;

    return {
        groupId: invite.group_id,
        groupName: focusGroup?.name || 'this group'
    };
};

export const actions: Actions = {
    joinGroup: async ({ params, url, cookies, locals: { getUser } }) => {
        if (!UUID_RE.test(params.id)) {
            return fail(400, { error: 'Invalid group' });
        }

        const user = await getUser();
        if (!user) {
            return fail(401, { error: 'Unauthorized' });
        }

        const token = cleanInviteToken(url.searchParams.get('token') ?? cookies.get(inviteCookieName(params.id)));
        if (!token) {
            return fail(400, { error: 'Invalid token' });
        }

        const groupId = params.id;

        const { data: invite } = await adminClient
            .from('group_invites')
            .select('token, group_id, expires_at, uses_count, max_uses, focus_groups(board_id)')
            .eq('token', token)
            .eq('group_id', groupId)
            .maybeSingle();

        if (!invite || new Date(invite.expires_at) < new Date() || invite.uses_count >= invite.max_uses) {
            return fail(400, { error: 'This invite link is no longer valid' });
        }

        // Check if already a member
        const { data: existing } = await adminClient
            .from('focus_group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) {
            cookies.delete(inviteCookieName(groupId), { path: inviteCookiePath(groupId) });
            throw redirect(303, `/groups/${groupId}`);
        }

        const focusGroup = Array.isArray((invite as any).focus_groups)
            ? (invite as any).focus_groups[0]
            : (invite as any).focus_groups;
        const boardId = focusGroup?.board_id;
        if (!boardId) {
            return fail(500, { error: 'Group board not found' });
        }

        const claimedUsesCount = invite.uses_count + 1;
        const { data: claimedInvite, error: claimError } = await adminClient
            .from('group_invites')
            .update({ uses_count: claimedUsesCount })
            .eq('token', token)
            .eq('group_id', groupId)
            .eq('uses_count', invite.uses_count)
            .eq('max_uses', invite.max_uses)
            .gt('expires_at', new Date().toISOString())
            .select('token')
            .maybeSingle();

        if (claimError) {
            console.error('[join group] Error claiming invite');
            return fail(500, { error: 'Failed to join group' });
        }
        if (!claimedInvite) {
            return fail(409, { error: 'This invite was just used. Please try again.' });
        }

        // Add user to group
        const { error: memberError } = await adminClient
            .from('focus_group_members')
            .insert({
                group_id: groupId,
                user_id: user.id,
                role: 'member'
            });

        if (memberError) {
            await releaseInviteClaim(token, groupId, claimedUsesCount);
            console.error('[join group] Error adding member');
            return fail(500, { error: 'Failed to join group' });
        }

        const { error: boardMemberError } = await adminClient
            .from('board_members')
            .upsert({
                board_id: boardId,
                user_id: user.id,
                role: 'member'
            });

        if (boardMemberError) {
            await adminClient
                .from('focus_group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', user.id);
            await releaseInviteClaim(token, groupId, claimedUsesCount);
            console.error('[join group] Error adding board member');
            return fail(500, { error: 'Failed to join group' });
        }

        cookies.delete(inviteCookieName(groupId), { path: inviteCookiePath(groupId) });
        throw redirect(303, `/groups/${groupId}`);
    }
};
