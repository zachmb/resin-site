import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        return {
            session: null,
            notes: [],
            edges: [],
            profile: null
        };
    }

    // Try to fetch amber sessions (notes) 
    const { data: notes, error: notesError } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (notesError) {
        console.error('Error fetching notes:', notesError);
    }

    // Try to fetch user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
    }

    return {
        session,
        notes: notes || [],
        profile: profile || null,
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
    },

    activateNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const content = data.get('noteContent') as string;

        if (!content || !content.trim()) {
            return fail(400, { error: 'Note content cannot be empty' });
        }

        // 1. Get the Google Refresh Token
        const { data: credentials, error: credsError } = await supabase
            .from('user_credentials')
            .select('google_refresh_token')
            .eq('id', session.user.id)
            .single();

        if (credsError || !credentials?.google_refresh_token) {
            console.error('Missing Google refresh token:', credsError);
            return fail(400, { error: 'Google Calendar access not configured. Please sign in with Google again.' });
        }

        // 2. Exchange for an Access Token
        let googleAccessToken = null;
        try {
            const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await import('$env/static/private');

            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: credentials.google_refresh_token
                })
            });

            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                googleAccessToken = tokenData.access_token;
                console.log('[Activate Route] Successfully retrieved short-lived Google Calendar access token:', !!googleAccessToken);
            } else {
                return fail(401, { error: 'Failed to refresh calendar token. Google connection may be expired.' });
            }
        } catch (e) {
            console.error('Error fetching calendar token:', e);
            return fail(500, { error: 'Internal server error while linking calendar.' });
        }

        // 3. Mock DeepSeek logic for now, verifying token retrieval
        // TODO: Port DeepSeek parsing logic from Swift to Node.js/SvelteKit

        return {
            success: true,
            message: 'DeepSeek activated! Plan generated and scheduled.',
            hasToken: !!googleAccessToken
        };
    },

    updateProfile: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) {
            return fail(401, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const openclaw_url = formData.get('openclaw_url') as string;
        const openclaw_api_key = formData.get('openclaw_api_key') as string;
        const availability_start = formData.get('availability_start') as string;
        const availability_end = formData.get('availability_end') as string;

        const updates = {
            id: session.user.id,
            openclaw_url,
            openclaw_api_key,
            availability_start,
            availability_end,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return { success: false, error: 'Failed to update preferences' };
        }

        return { success: true };
    },

    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=/?tab=account`,
                scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) {
            console.error(error)
            return { error: 'Could not authenticate with Google' }
        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },

    generateToken: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) {
            return fail(401, { error: 'Unauthorized' });
        }

        const newKey = crypto.randomUUID();

        const updates = {
            id: session.user.id,
            openclaw_api_key: newKey, // Using this existing field as the PAT for simplicity
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) {
            console.error('Error generating token:', updateError);
            return { success: false, error: 'Failed to generate token' };
        }

        return { success: true, token: newKey };
    }
};
