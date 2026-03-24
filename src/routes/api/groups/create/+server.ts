import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request, locals: { getUser } }) => {
    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });

        const { name, description } = await request.json();

        if (!name || name.trim().length === 0) {
            return json({ error: 'Group name is required' }, { status: 400 });
        }

        const groupId = crypto.randomUUID();
        const boardId = crypto.randomUUID();

        // 1. Create the group directly
        const { error: groupError } = await supabase
            .from('focus_groups')
            .insert({
                id: groupId,
                name: name.trim(),
                description: description?.trim() || null,
                created_by: user.id
            });

        if (groupError) {
            console.error('[groups/create] Error creating group:', groupError);
            return json({ error: 'Failed to create group', detail: groupError }, { status: 500 });
        }

        // 2. Create the board exactly matching the ID
        const { error: boardError } = await supabase
            .from('boards')
            .insert({
                id: boardId,
                name: name.trim(),
                description: description?.trim() || null,
                created_by: user.id
            });

        if (boardError) {
            console.error('[groups/create] Error creating board:', boardError);
            return json({ error: 'Failed to create group board', detail: boardError }, { status: 500 });
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
            console.error('[groups/create] Error adding creator to board:', boardMemberError);
            return json({ error: 'Failed to set up group board' }, { status: 500 });
        }

        // 5. Add creator as admin member of the group
        const { error: memberError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: groupId,
                user_id: user.id,
                role: 'admin'
            });

        if (memberError) {
            console.error('[groups/create] Error adding creator as member:', memberError);
            return json({ error: 'Failed to add you to the group', detail: memberError }, { status: 500 });
        }

        return json(
            {
                success: true,
                group: {
                    id: groupId,
                    name: name.trim(),
                    description: description?.trim() || null,
                    board_id: boardId
                }
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('[groups/create] Unexpected error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
