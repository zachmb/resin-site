import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';
import { adminClient as supabase } from '$lib/server/auth';

const NO_STORE_HEADERS = { 'cache-control': 'no-store' };
const MAX_GROUP_NAME_LENGTH = 80;
const MAX_GROUP_DESCRIPTION_LENGTH = 500;
const MAX_REQUEST_BODY_LENGTH = 8_000;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;

function cleanText(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHARS_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : '';
}

export const POST: RequestHandler = async ({ request, locals: { getUser } }) => {
    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
        }

        let body: { name?: unknown; description?: unknown };
        try {
            body = await readBoundedJsonBody<{ name?: unknown; description?: unknown }>(
                request,
                MAX_REQUEST_BODY_LENGTH
            );
        } catch (error) {
            const status = error instanceof RequestBodyError ? error.status : 400;
            return json({
                error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status, headers: NO_STORE_HEADERS });
        }
        const name = cleanText(body?.name, MAX_GROUP_NAME_LENGTH);
        const description = cleanText(body?.description, MAX_GROUP_DESCRIPTION_LENGTH);

        if (!name) {
            return json({ error: 'Group name is required' }, { status: 400, headers: NO_STORE_HEADERS });
        }

        const groupId = crypto.randomUUID();
        const boardId = crypto.randomUUID();
        const groupDescription = description || null;

        // 1. Create the board first so the group can reference it safely
        const { error: boardError } = await supabase
            .from('boards')
            .insert({
                id: boardId,
                name,
                description: groupDescription,
                created_by: user.id
            });

        if (boardError) {
            console.error('[groups/create] Error creating board');
            return json({ error: 'Failed to create group board' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // 2. Create the group linked to its board
        const { error: groupError } = await supabase
            .from('focus_groups')
            .insert({
                id: groupId,
                name,
                description: groupDescription,
                board_id: boardId,
                created_by: user.id
            });

        if (groupError) {
            console.error('[groups/create] Error creating group');
            await supabase.from('boards').delete().eq('id', boardId);
            return json({ error: 'Failed to create group' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // 3. Add creator to board members
        const { error: boardMemberError } = await supabase
            .from('board_members')
            .insert({
                board_id: boardId,
                user_id: user.id,
                role: 'owner'
            });

        if (boardMemberError) {
            console.error('[groups/create] Error adding creator to board');
            await supabase.from('focus_groups').delete().eq('id', groupId);
            await supabase.from('boards').delete().eq('id', boardId);
            return json({ error: 'Failed to set up group board' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // 4. Add creator as admin member of the group
        const { error: memberError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: groupId,
                user_id: user.id,
                role: 'admin'
            });

        if (memberError) {
            console.error('[groups/create] Error adding creator as member');
            await supabase.from('board_members').delete().eq('board_id', boardId).eq('user_id', user.id);
            await supabase.from('focus_groups').delete().eq('id', groupId);
            await supabase.from('boards').delete().eq('id', boardId);
            return json({ error: 'Failed to add you to the group' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        return json(
            {
                success: true,
                group: {
                    id: groupId,
                    name,
                    description: groupDescription,
                    created_by: user.id
                }
            },
            { status: 201, headers: NO_STORE_HEADERS }
        );

    } catch {
        console.error('[groups/create] Unexpected error');
        return json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
    }
};
