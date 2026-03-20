import { redirect } from '@sveltejs/kit'

export const actions = {
    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const next = url.searchParams.get('next') ?? '/?tab=notes'
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
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

    signInWithApple: async ({ locals: { supabase }, url }) => {
        const next = url.searchParams.get('next') ?? '/?tab=notes'
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                scopes: 'email name',
            },
        })

        if (error) {
            console.error(error)
            return { error: 'Could not authenticate with Apple' }
        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },
}
