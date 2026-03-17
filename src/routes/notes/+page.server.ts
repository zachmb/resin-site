import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { runActivationPipeline } from '$lib/amber_service';
import { syncStonesFromNotes, recordDailyActivity } from '$lib/gamification_service';

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
    const now = new Date().toISOString();
    // Attempt the preferred schema (raw_text, display_title, status)
    const result = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at,
            updated_at: now
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
            created_at: row.created_at,
            updated_at: now
        })
        .select()
        .single();
};

const updateNoteRow = async (supabase: any, row: { id: string; user_id: string; title: string; content: string }) => {
    const now = new Date().toISOString();
    // Attempt the preferred schema (raw_text, display_title)
    const result = await supabase
        .from('amber_sessions')
        .update({ raw_text: row.content, display_title: row.title, updated_at: now })
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
        .update({ content: row.content, title: row.title, updated_at: now })
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .select()
        .single();
};

export const load: PageServerLoad = async ({ locals: { getSession, supabase }, setHeaders }) => {
    // Disable caching to ensure fresh notes every time
    setHeaders({
        'cache-control': 'no-cache, no-store, must-revalidate'
    });

    const session = await getSession();
    if (!session) throw redirect(303, '/login');

    const userId = session.user.id;

    // Fetch user profile for scheduling preferences
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // Fetch notes shared with me
    const { data: sharedNotes } = await supabase
        .from('shared_notes')
        .select('note_id, owner_id, amber_sessions!inner(id, raw_text, display_title, status, user_id, created_at)')
        .eq('shared_with_id', userId);

    const normalizedSharedNotes = (sharedNotes || []).map((share: any) => {
        const note = share.amber_sessions;
        return {
            id: note.id,
            user_id: note.user_id,
            title: note.display_title ?? '',
            content: note.raw_text ?? '',
            status: note.status,
            owner_id: share.owner_id,
            shared_note_id: share.id,
            created_at: note.created_at
        };
    });

    // Fetch accepted friends
    const { data: friendships } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

    const friends = await Promise.all(
        (friendships || []).map(async (friendship: any) => {
            const otherId =
                friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', otherId)
                .single();

            return {
                id: otherId,
                friendship_id: friendship.id
            };
        })
    );

    // Fetch mind map edges (connections) for all user notes
    const { data: edges } = await supabase
        .from('mind_map_edges')
        .select('*')
        .eq('user_id', userId);

    // Fetch user's own notes for building connection metadata AND for display
    const { data: userNotes, error: notesError } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (notesError) {
        console.error('[notes] Error fetching user notes:', notesError);
    }

    // Normalize user's own notes for display
    const normalizedUserNotes = (userNotes || []).map((n: any) => ({
        id: n.id,
        title: n.display_title || n.title || 'Untitled',
        content: n.raw_text || n.content || '',
        created_at: n.created_at,
        status: n.status
    }));

    // Build allNotes for connection metadata (just title, used for mapping)
    const allNotes = normalizedUserNotes.map(n => ({
        id: n.id,
        title: n.title
    }));

    // Build connection metadata
    const connections: Record<string, any> = {};
    const noteMap = new Map(allNotes.map(n => [n.id, n]));

    for (const note of allNotes) {
        const outgoing = (edges || [])
            .filter(e => e.source_id === note.id)
            .map(e => ({
                ...e,
                targetTitle: noteMap.get(e.target_id)?.title || 'Untitled'
            }));

        const incoming = (edges || [])
            .filter(e => e.target_id === note.id)
            .map(e => ({
                ...e,
                sourceTitle: noteMap.get(e.source_id)?.title || 'Untitled'
            }));

        connections[note.id] = { outgoing, incoming };
    }

    return {
        notes: normalizedUserNotes,
        sharedWithMe: normalizedSharedNotes,
        friends,
        connections,
        profile
    };
};

export const actions: Actions = {
    createNote: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const { data: newNote, error } = await insertNote(supabase, {
            user_id: userId,
            title: '',
            content: '',
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error('[createNote] Error creating note:', error);
            return fail(500, { error: 'Could not create note', details: error.message });
        }

        if (!newNote) {
            console.error('[createNote] No note returned from insert');
            return fail(500, { error: 'No note returned from database' });
        }

        try {
            // Trigger sync
            await syncStonesFromNotes(userId);
            await recordDailyActivity(userId);
        } catch (syncErr) {
            console.warn('[createNote] Sync error (non-blocking):', syncErr);
        }

        const normalizedNote = normalizeNote(newNote);
        console.log('[createNote] Successfully created note:', normalizedNote.id);

        return {
            success: true,
            note: normalizedNote,
            isNew: true
        };
    },

    updateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;
        const providedTitle = (data.get('title') as string)?.trim();

        if (id === 'mock') return { success: false, error: 'Cannot autosave a mock note' };

        // Use provided title if available, otherwise extract from content
        const title = providedTitle || extractTitle(content) || '';

        const { error } = await updateNoteRow(supabase, {
            id,
            user_id: userId,
            title,
            content
        });

        if (error) {
            console.error('[notes] updateNote failed:', error);
            return fail(500, { error: `Could not save note: ${error.message}` });
        }

        // Trigger streak record on update too
        await recordDailyActivity(userId);

        return { success: true, id, title, content };
    },

    saveNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;
        const providedTitle = (data.get('title') as string)?.trim();

        // Use provided title if available, otherwise extract from content
        const title = providedTitle || extractTitle(content);

        if (id === 'mock' || !id) {
            // It's a new note
            const { data: newNote, error } = await insertNote(supabase, {
                user_id: userId,
                title: title || '',
                content,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('[notes] saveNote (insert) failed:', error);
                return fail(500, { error: `Could not create note: ${error.message}` });
            }

            // Trigger stone sync for the new note
            await syncStonesFromNotes(userId);
            await recordDailyActivity(userId);

            return { success: true, note: normalizeNote(newNote), isNew: true };
        } else {
            // Existing note
            const { data: updatedNote, error } = await updateNoteRow(supabase, {
                id,
                user_id: userId,
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

            await recordDailyActivity(userId);

            return { success: true, note: normalizeNote(updatedNote), isNew: false };
        }
    },

    deleteNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const id = data.get('id') as string;

        const { error } = await supabase
            .from('amber_sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) return fail(500, { error: 'Could not delete note' });

        // Sync stones after deletion
        await syncStonesFromNotes(userId, { force: true });

        return { success: true, deletedId: id };
    },

    activateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const content = data.get('noteContent') as string;
        const providedTitle = (data.get('title') as string)?.trim();

        if (!content || !content.trim()) return fail(400, { error: 'Note content cannot be empty' });

        // Save the note first to ensure we have a session record
        // Use provided title if available, otherwise extract from content
        const title = providedTitle || extractTitle(content);
        let sessionId = data.get('id') as string;

        if (!sessionId || sessionId === 'mock') {
            const { data: newNote, error } = await insertNote(supabase, {
                user_id: userId,
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
                user_id: userId,
                title: title || '',
                content
            });
        }

        try {
            // Return immediately with success - fire activation in background
            // This gives the user immediate feedback while AI processes in the background

            // Fire the background activation without awaiting
            const activationPromise = runActivationPipeline(userId, sessionId, content, {
                timezone: 'America/Chicago' // Default or get from profile/request
            }).catch((err: any) => {
                console.error('[notes] Background activation failed:', err);
            });

            return {
                success: true,
                message: 'Plan created! DeepSeek is generating your schedule...',
                sessionId: sessionId
            };
        } catch (err: any) {
            console.error('[notes] Activation failed:', err);
            return fail(500, { error: err.message || 'Activation failed' });
        }
    },

    cancelNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const sessionId = data.get('id') as string;

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'canceled' })
            .eq('id', sessionId)
            .eq('user_id', userId);

        if (error) {
            console.error('[notes] Cancel failed:', error);
            return fail(500, { error: 'Could not cancel note' });
        }

        return { success: true, message: 'Note canceled' };
    },

    completeNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const sessionId = data.get('id') as string;

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        const { error } = await supabase
            .from('amber_sessions')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId);

        if (error) {
            console.error('[notes] Complete failed:', error);
            return fail(500, { error: 'Could not mark note as completed' });
        }

        return { success: true, message: 'Note marked as completed' };
    },

    shareNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const noteId = data.get('note_id') as string;
        const sharedWithId = data.get('shared_with_id') as string;

        if (!noteId || !sharedWithId) return fail(400, { error: 'Missing parameters' });

        // Verify user owns this note
        const { data: note, error: noteError } = await supabase
            .from('amber_sessions')
            .select('id')
            .eq('id', noteId)
            .eq('user_id', userId)
            .single();

        if (noteError || !note) {
            return fail(403, { error: 'You do not own this note' });
        }

        const { error } = await supabase
            .from('shared_notes')
            .insert({
                note_id: noteId,
                owner_id: userId,
                shared_with_id: sharedWithId
            });

        if (error) {
            console.error('[notes] Share failed:', error);
            return fail(500, { error: 'Could not share note' });
        }

        return { success: true, message: 'Note shared' };
    },

    unshareNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const userId = session.user.id;

        const data = await request.formData();
        const noteId = data.get('note_id') as string;
        const sharedWithId = data.get('shared_with_id') as string;

        if (!noteId || !sharedWithId) return fail(400, { error: 'Missing parameters' });

        const { error } = await supabase
            .from('shared_notes')
            .delete()
            .eq('note_id', noteId)
            .eq('owner_id', userId)
            .eq('shared_with_id', sharedWithId);

        if (error) {
            console.error('[notes] Unshare failed:', error);
            return fail(500, { error: 'Could not unshare note' });
        }

        return { success: true, message: 'Note unshared' };
    }
};
