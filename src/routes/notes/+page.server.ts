import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { runActivationPipeline } from '$lib/services/amber';
import { syncStonesFromNotes, recordDailyActivity } from '$lib/services/gamification';

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
    // Insert into amber_sessions with status='draft' for saved notes
    const insertResult = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at,
            updated_at: now
        })
        .select('id');

    if (insertResult.error) {
        return { data: null, error: insertResult.error };
    }

    // Check if the insert actually returned an ID (detects RLS or DB errors)
    if (!insertResult.data || insertResult.data.length === 0) {
        return { data: null, error: new Error('Insert failed to return ID') };
    }

    // Return the inserted row with known data
    return {
        data: {
            id: insertResult.data[0].id,
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at,
            updated_at: now
        },
        error: null
    };
};

const updateNoteRow = async (supabase: any, row: { id: string; user_id: string; title: string; content: string }) => {
    const now = new Date().toISOString();
    console.log(`[updateNoteRow] Starting update for note ${row.id.substring(0, 8)} by user ${row.user_id.substring(0, 8)}`);
    console.log(`[updateNoteRow] Content: "${row.content.substring(0, 50)}..." (${row.content.length} chars)`);

    // First check if note exists before updating
    const checkResult = await supabase
        .from('amber_sessions')
        .select('id, raw_text')
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .single();

    console.log(`[updateNoteRow] Pre-update check:`, {
        exists: !!checkResult.data,
        currentContent: checkResult.data?.raw_text?.substring(0, 50)
    });

    // Update amber_sessions with raw_text and display_title
    const updateResult = await supabase
        .from('amber_sessions')
        .update({ raw_text: row.content, display_title: row.title, updated_at: now })
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .select('id');

    console.log(`[updateNoteRow] Update result:`, {
        hasError: !!updateResult.error,
        errorMsg: updateResult.error?.message,
        dataLength: updateResult.data?.length
    });

    if (updateResult.error) {
        console.error(`[updateNoteRow] Update error:`, updateResult.error);
        return { data: null, error: updateResult.error };
    }

    // Check if any rows were actually updated (detects RLS silent failures)
    if (!updateResult.data || updateResult.data.length === 0) {
        console.error(`[updateNoteRow] No rows updated - RLS likely blocked it`);
        return { data: null, error: new Error('RLS blocked update (no rows matched policy)') };
    }

    console.log(`[updateNoteRow] Update successful, now verifying...`);

    // Add delay to ensure database has committed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify the update actually worked by fetching the updated row
    const verifyResult = await supabase
        .from('amber_sessions')
        .select('raw_text, display_title')
        .eq('id', row.id)
        .eq('user_id', row.user_id)
        .single();

    console.log(`[updateNoteRow] Verify fetch result:`, {
        hasError: !!verifyResult.error,
        hasData: !!verifyResult.data,
        contentLength: verifyResult.data?.raw_text?.length,
        content: verifyResult.data?.raw_text?.substring(0, 50)
    });

    if (verifyResult.error || !verifyResult.data) {
        console.error('[updateNoteRow] Verification fetch failed:', verifyResult.error);
        return { data: null, error: new Error('Failed to verify update') };
    }

    // Verify the content actually changed
    if (verifyResult.data.raw_text !== row.content) {
        console.error('[updateNoteRow] CONTENT MISMATCH - Database has different content!', {
            sentLength: row.content.length,
            storedLength: verifyResult.data.raw_text?.length,
            sent: row.content.substring(0, 100),
            stored: verifyResult.data.raw_text?.substring(0, 100)
        });
        return { data: null, error: new Error('Update verification failed - content not saved') };
    }

    console.log(`[updateNoteRow] Verification successful!`);

    // Return the updated row with known data
    return {
        data: {
            id: updateResult.data[0].id,
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            updated_at: now
        },
        error: null
    };
};

export const load: PageServerLoad = async ({ locals: { getUser, getAuthenticatedSupabase }, setHeaders }) => {
    const user = await getUser();
    if (!user) throw redirect(303, '/login');

    setHeaders({
        'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    const supabase = await getAuthenticatedSupabase();
    const userId = user.id;

    // Fetch notes directly server-side - most reliable approach
    let notes: any[] = [];
    try {
        const { data: rawNotes, error: notesError } = await supabase
            .from('amber_sessions')
            .select('id, display_title, raw_text, status, created_at, updated_at, user_id')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (notesError) {
            console.error('[notes:load] Error fetching notes:', notesError.message);
        } else {
            notes = (rawNotes || []).map(normalizeNote);
        }
    } catch (err) {
        console.error('[notes:load] Unexpected error:', err);
    }

    // Fetch profile with resilience
    let profile: any = null;
    try {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, total_stones, current_streak')
            .eq('id', userId)
            .single();
        profile = profileData;
    } catch (err) {
        // Non-critical, profile will be null
    }

    return {
        notes,
        sharedWithMe: [],
        friends: [],
        connections: {},
        profile,
        shouldFetchData: false
    };
};

export const actions: Actions = {
    createNote: async ({ locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const userId = user.id;
        const supabase = await getAuthenticatedSupabase();

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

    updateNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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

        // Fire streak record in background (non-blocking)
        recordDailyActivity(userId).catch(err =>
            console.warn('[notes] Background streak update failed:', err)
        );

        return { success: true, id, title, content };
    },

    saveNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

        const data = await request.formData();
        const id = data.get('id') as string;
        const content = data.get('content') as string;
        const providedTitle = (data.get('title') as string)?.trim();

        console.log('[saveNote] Received form data:', {
            id,
            contentLength: content?.length,
            contentPreview: content?.substring(0, 100),
            title: providedTitle
        });

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

            // Trigger syncs in background (non-blocking)
            syncStonesFromNotes(userId).catch(err =>
                console.warn('[notes] Background stone sync failed:', err)
            );
            recordDailyActivity(userId).catch(err =>
                console.warn('[notes] Background streak update failed:', err)
            );

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

            // Fire streak update in background (non-blocking)
            recordDailyActivity(userId).catch(err =>
                console.warn('[notes] Background streak update failed:', err)
            );

            const normalizedResult = normalizeNote(updatedNote);
            console.log('[saveNote] Returning from server:', {
                id: normalizedResult.id,
                contentLength: normalizedResult.content?.length,
                contentPreview: normalizedResult.content?.substring(0, 100),
                title: normalizedResult.title
            });

            // Small delay to ensure database commit is complete
            // This prevents load function from seeing stale data due to transaction isolation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Return with cache control to prevent caching stale data
            return {
                success: true,
                note: normalizedResult,
                isNew: false,
                timestamp: Date.now() // Add timestamp so client knows this is fresh
            };
        }
    },

    deleteNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

        const data = await request.formData();
        const id = data.get('id') as string;

        const { count, error } = await supabase
            .from('amber_sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        // Check for explicit errors
        if (error) {
            console.error('[deleteNote] Delete error:', error);
            return fail(500, { error: 'Could not delete note', code: error.code });
        }

        // Check RLS silent failure (count === 0 means no rows were affected)
        if (!count || count === 0) {
            console.warn('[deleteNote] RLS silent failure - no rows affected');
            return fail(403, { error: 'Could not delete note. Check your permissions.', code: 'RLS_SILENT_FAILURE' });
        }

        console.log('[deleteNote] Successfully deleted note:', id);

        return { success: true, deletedId: id };
    },

    activateNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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
            // Update amber_sessions entry with 'processing' status
            // This gives immediate visual feedback on the amber page while AI runs
            await supabase.from('amber_sessions').update({
                status: 'processing',
                intensity: 0.5,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .eq('user_id', userId);

            // Fire the background activation without awaiting
            // This will update the entry with full details once AI responds
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

    cancelNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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

    completeNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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

    shareNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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

    unshareNote: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });
        const supabase = await getAuthenticatedSupabase();

        const userId = user.id;

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
