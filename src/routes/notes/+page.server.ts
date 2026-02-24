import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/notes');
    }

    // Try to fetch amber sessions (notes) 
    const { data: notes, error } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notes:', error);
    }

    return {
        session,
        notes: notes || [],
    };
};

export const actions: Actions = {
    createNote: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const title = 'Untitled Draft ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const { data, error } = await supabase
            .from('amber_sessions')
            .insert({
                user_id: session.user.id,
                title,
                content: '# ' + title + '\n\n',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating note:', error);
            return fail(500, { error: 'Could not create note' });
        }

        return { success: true, note: data };
    },

    updateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;

        // Try to extract title from the first line if it's a heading
        let title = 'Untitled Note';
        const lines = content.split('\n');
        if (lines[0] && lines[0].startsWith('# ')) {
            title = lines[0].replace('# ', '').trim();
        }

        const { error } = await supabase
            .from('amber_sessions')
            .update({ content, title })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error updating note:', error);
            return fail(500, { error: 'Could not automatically save note' });
        }

        return { success: true, id, title, content };
    },

    deleteNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;

        const { error } = await supabase
            .from('amber_sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error deleting note:', error);
            return fail(500, { error: 'Could not delete note' });
        }

        return { success: true, deletedId: id };
    }
};
