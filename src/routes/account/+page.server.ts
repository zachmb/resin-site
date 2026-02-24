import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
    }

    // If profile doesn't exist, we'll handle it during save or just return null
    return {
        session,
        profile: profile || null,
    };
};

export const actions: Actions = {
    updateProfile: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) {
            throw error(401, { message: 'Unauthorized' });
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
            return { error: 'Could not authenticate with Google' }
        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },
    generateToken: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) {
            throw error(401, { message: 'Unauthorized' });
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
