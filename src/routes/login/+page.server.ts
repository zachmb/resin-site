import { redirect } from '@sveltejs/kit'

export const actions = {
    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const next = url.searchParams.get('next') ?? '/account'
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=${next}`,
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
}
