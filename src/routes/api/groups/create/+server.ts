import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, getSession } }) => {
    try {
        const session = await getSession();
        if (!session) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name || name.trim().length === 0) {
            return json({ error: 'Group name is required' }, { status: 400 });
        }

        // Create the group
        const { data: group, error: groupError } = await supabase
            .from('focus_groups')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                created_by: session.user.id
            })
            .select()
            .single();

        if (groupError) {
            console.error('[groups/create] Error creating group:', groupError);
            return json({ error: 'Failed to create group' }, { status: 500 });
        }

        // Add creator as admin member
        const { error: memberError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: group.id,
                user_id: session.user.id,
                role: 'admin'
            });

        if (memberError) {
            console.error('[groups/create] Error adding creator as member:', memberError);
            // Group was created but member addition failed - this is a problem
            return json({ error: 'Failed to add you to the group' }, { status: 500 });
        }

        return json(
            {
                success: true,
                group: {
                    id: group.id,
                    name: group.name,
                    description: group.description
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[groups/create] Unexpected error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
