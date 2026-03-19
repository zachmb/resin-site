import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, getUser } }) => {
    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name || name.trim().length === 0) {
            return json({ error: 'Group name is required' }, { status: 400 });
        }

        // 1. Create the group
        const { data: group, error: groupError } = await supabase
            .from('focus_groups')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                created_by: user.id
            })
            .select()
            .single();

        if (groupError) {
            console.error('[groups/create] Error creating group:', groupError);
            return json({ error: 'Failed to create group' }, { status: 500 });
        }

        // 2. Create a linked board for the group's note board
        const { data: board, error: boardError } = await supabase
            .from('boards')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                created_by: user.id
            })
            .select()
            .single();

        if (boardError) {
            console.error('[groups/create] Error creating board:', boardError);
            return json({ error: 'Failed to create group board' }, { status: 500 });
        }

        // 3. Add creator as owner of the board
        const { error: boardMemberError } = await supabase
            .from('board_members')
            .insert({
                board_id: board.id,
                user_id: user.id,
                role: 'owner'
            });

        if (boardMemberError) {
            console.error('[groups/create] Error adding creator to board:', boardMemberError);
            return json({ error: 'Failed to set up group board' }, { status: 500 });
        }

        // 4. Update group with board_id
        const { error: updateError } = await supabase
            .from('focus_groups')
            .update({ board_id: board.id })
            .eq('id', group.id);

        if (updateError) {
            console.error('[groups/create] Error linking board to group:', updateError);
            return json({ error: 'Failed to link board to group' }, { status: 500 });
        }

        // 5. Add creator as admin member of the group
        const { error: memberError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: group.id,
                user_id: user.id,
                role: 'admin'
            });

        if (memberError) {
            console.error('[groups/create] Error adding creator as member:', memberError);
            return json({ error: 'Failed to add you to the group' }, { status: 500 });
        }

        return json(
            {
                success: true,
                group: {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    board_id: board.id
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[groups/create] Unexpected error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
