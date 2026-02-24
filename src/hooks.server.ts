import { createServerClient } from '@supabase/ssr'
import { sequence } from '@sveltejs/kit/hooks'
import { type Handle } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const supabaseHandle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get: (key) => event.cookies.get(key),
            /**
             * Note: You should only use the set and remove methods if you're
             * using a custom cookie implementation. SvelteKit's built-in
             * cookie management handles this automatically when using the
             * default cookie options.
             */
            set: (key, value, options) => {
                event.cookies.set(key, value, { ...options, path: '/' })
            },
            remove: (key, options) => {
                event.cookies.delete(key, { ...options, path: '/' })
            },
        },
    })

    event.locals.getSession = async () => {
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession()
        return session
    }

    // Refresh the session on every request to ensure cookies are synced
    await event.locals.getSession()

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range'
        },
    })
}

// Add CORS headers to all /api/* responses so the iOS app can call them directly
const corsHandle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)

    if (event.url.pathname.startsWith('/api/')) {
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    }

    return response
}

export const handle = sequence(supabaseHandle, corsHandle)
