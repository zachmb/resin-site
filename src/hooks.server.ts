import { createServerClient } from '@supabase/ssr'
import { sequence } from '@sveltejs/kit/hooks'
import { type Handle } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const supabaseHandle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get: (key) => event.cookies.get(key),
            set: (key, value, options) => {
                event.cookies.set(key, value, { ...options, path: '/' })
            },
            remove: (key, options) => {
                event.cookies.delete(key, { ...options, path: '/' })
            },
        },
    })

    /**
     * a protective wrapper around getSession that handles errors and returns null
     * instead of throwing, which is safer for hooks and layout loads.
     */
    event.locals.getSession = async () => {
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession()
        return session
    }

    // Refresh the session if it exists to ensure cookies are synchronized
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
