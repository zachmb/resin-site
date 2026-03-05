import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    updateNodePosition: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;
        const x = parseFloat(data.get('position_x') as string);
        const y = parseFloat(data.get('position_y') as string);

        // We use is_on_map logic implicitly or explicitly if added to the DB.
        // For backwards compatibility without strict schema updates, we just update the coords
        const { error } = await supabase
            .from('amber_sessions')
            .update({ position_x: x, position_y: y, is_on_map: true })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error saving node position:', error);
            return fail(500, { error: 'Could not save node position' });
        }
        return { success: true };
    },

    removeFromMap: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;

        const { error } = await supabase
            .from('amber_sessions')
            .update({ is_on_map: false, position_x: null, position_y: null })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error removing note from map:', error);
            return fail(500, { error: 'Could not remove note from map' });
        }
        return { success: true, removedId: id };
    },

    createEdge: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const source_id = data.get('source_id') as string;
        const target_id = data.get('target_id') as string;

        const { data: edge, error } = await supabase
            .from('mind_map_edges')
            .insert({
                user_id: session.user.id,
                source_id,
                target_id
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating edge:', error);
            return fail(500, { error: 'Could not create edge' });
        }
        return { success: true, edge };
    },

    deleteEdge: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;

        const { error } = await supabase
            .from('mind_map_edges')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) return fail(500, { error: 'Could not delete edge' });
        return { success: true };
    }
};
