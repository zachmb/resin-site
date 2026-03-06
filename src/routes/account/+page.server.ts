import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=/account`,
                scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) {
            console.error(error)
            return fail(500, { error: 'Could not authenticate with Google' })
        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },

    updateProfile: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const openclaw_url = formData.get('openclaw_url') as string;
        const openclaw_api_key = formData.get('openclaw_api_key') as string;
        const availability_start = formData.get('availability_start') as string;
        const availability_end = formData.get('availability_end') as string;
        const sync_notes = formData.get('sync_notes') === 'on';

        const updates = {
            id: session.user.id,
            openclaw_url,
            openclaw_api_key,
            availability_start,
            availability_end,
            sync_notes,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to update preferences' };
        return { success: true };
    },

    generateToken: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const newKey = crypto.randomUUID();

        const updates = {
            id: session.user.id,
            openclaw_api_key: newKey,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to generate token' };
        return { success: true, token: newKey };
    }
};
