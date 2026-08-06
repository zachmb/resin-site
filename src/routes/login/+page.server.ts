import { redirect } from '@sveltejs/kit'

function safeNext(rawNext: string | null | undefined, origin: string): string {
    const fallback = '/?tab=notes'
    if (!rawNext) return fallback

    try {
        if (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')) {
            return rawNext
        }

        const parsed = new URL(rawNext, origin)
        if (parsed.origin === origin) {
            return parsed.pathname + parsed.search
        }
    } catch {
        // Fall through to fallback.
    }

    return fallback
}

export const actions = {
    signInWithGoogle: async ({ request, locals: { supabase }, url }) => {
        const formData = await request.formData()
        const next = safeNext(formData.get('next')?.toString() ?? url.searchParams.get('next'), url.origin)
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                scopes: 'openid email profile',
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

    signInWithApple: async ({ request, locals: { supabase }, url }) => {
        const formData = await request.formData()
        const next = safeNext(formData.get('next')?.toString() ?? url.searchParams.get('next'), url.origin)
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
