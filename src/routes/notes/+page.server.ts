import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { runActivationPipeline } from '$lib/amber_service';

const extractTitle = (content: string) => {
    if (!content || !content.trim()) return null;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed !== '#') {
            // Strip markdown headers and limit length
            return trimmed.replace(/^#+\s*/, '').substring(0, 60);
        }
    }
    return null;
};

const normalizeNote = (note: any) => ({
    ...note,
    title: note.display_title ?? note.title ?? '',
    content: note.raw_text ?? note.content ?? ''
});


const isMissingColumnError = (error: any) => {
    if (!error) return false;
    return error.code === 'PGRST204' || String(error.message || '').includes("Could not find");
};

const insertNote = async (supabase: any, row: { user_id: string; title: string; content: string; created_at: string }) => {
    // Attempt the preferred schema (raw_text, display_title, status)
    const result = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at
        })
        .select()
        .single();

    if (!result.error) return result;
    if (!isMissingColumnError(result.error)) return result;

    // Fallback for older schema (content, title, status)
    console.warn('[notes] Preferred schema insert failed, trying fallback...', result.error.message);
    return await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            content: row.content,
            title: row.title,
            status: 'draft',
            created_at: row.created_at
        })
        .select()
        .single();
};

const updateNoteRow = async (supabase: any, row: { id: string; user_id: string; title: string; content: string }) => {
    // Attempt the preferred schema (raw_text, display_title)
    const result = await supabase
        .from('amber_sessions')
        .update({ raw_text: row.content, display_title: row.title })
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .select()
        .single();

    if (!result.error) return result;
    if (!isMissingColumnError(result.error)) return result;

    // Fallback for older schema (content, title)
    console.warn('[notes] Preferred schema update failed, trying fallback...', result.error.message);
    return await supabase
        .from('amber_sessions')
        .update({ content: row.content, title: row.title })
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .select()
        .single();
};

export const load: PageServerLoad = async ({ locals: { getSession } }) => {
    const session = await getSession();
    if (!session) throw redirect(303, '/login');
    return {};
};

export const actions: Actions = {
    createNote: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const title = 'Untitled Draft ' + new Date().getTime();
        const { error } = await insertNote(supabase, {
            user_id: session.user.id,
            title,
            content: '# ' + title + '\n\n',
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error creating note:', error);
            return fail(500, { error: 'Could not create note' });
        }

        throw redirect(303, `/notes`);
    },

    updateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;

        if (id === 'mock') return { success: false, error: 'Cannot autosave a mock note' };

        const title = extractTitle(content) || '';

        const { error } = await updateNoteRow(supabase, {
            id,
            user_id: session.user.id,
            title,
            content
        });

        if (error) {
            console.error('[notes] updateNote failed:', error);
            return fail(500, { error: `Could not save note: ${error.message}` });
        }
        return { success: true, id, title, content };
    },

    saveNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;

        const title = extractTitle(content);

        if (id === 'mock' || !id) {
            // It's a new note
            const { data: newNote, error } = await insertNote(supabase, {
                user_id: session.user.id,
                title: title || '',
                content,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('[notes] saveNote (insert) failed:', error);
                return fail(500, { error: `Could not create note: ${error.message}` });
            }

            return { success: true, note: normalizeNote(newNote), isNew: true };
        } else {
            // Existing note
            const { data: updatedNote, error } = await updateNoteRow(supabase, {
                id,
                user_id: session.user.id,
                title: title || '',
                content
            });

            if (error) {
                console.error('[notes] saveNote (update) failed:', error);
                return fail(500, {
                    error: `Could not save note: ${error.message}`,
                    code: error.code,
                    details: error.details
                });
            }
            return { success: true, note: normalizeNote(updatedNote), isNew: false };
        }
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

        if (error) return fail(500, { error: 'Could not delete note' });
        return { success: true, deletedId: id };
    },

    activateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const content = data.get('noteContent') as string;

        if (!content || !content.trim()) return fail(400, { error: 'Note content cannot be empty' });

        // Save the note first to ensure we have a session record
        const title = extractTitle(content);
        let sessionId = data.get('id') as string;

        if (!sessionId || sessionId === 'mock') {
            const { data: newNote, error } = await insertNote(supabase, {
                user_id: session.user.id,
                title: title || '',
                content,
                created_at: new Date().toISOString()
            });
            if (error || !newNote) return fail(500, { error: 'Could not save note before activation' });
            sessionId = newNote.id;
        } else {
            // Update existing
            await updateNoteRow(supabase, {
                id: sessionId,
                user_id: session.user.id,
                title: title || '',
                content
            });
        }

        try {
            await runActivationPipeline(session.user.id, sessionId, content, {
                timezone: 'America/Chicago' // Default or get from profile/request
            });
            return { success: true, message: 'DeepSeek activated! Plan generated and scheduled.' };
        } catch (err: any) {
            console.error('[notes] Activation failed:', err);
            return fail(500, { error: err.message || 'Activation failed' });
        }
    }
};
