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

    /**
     * getUser() authenticates with the Supabase server to verify the user is genuine.
     * Use this for sensitive operations instead of getSession().
     */
    event.locals.getUser = async () => {
        const { data: { user }, error } = await event.locals.supabase.auth.getUser()
        if (error) return null
        return user
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

// Add cache headers for aggressive caching
const cacheHandle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)
    const url = new URL(event.request.url)

    // Set cache headers based on content type
    if (url.pathname.startsWith('/api/')) {
        // API responses: short cache, revalidation required
        response.headers.set('Cache-Control', 'private, max-age=30, must-revalidate')
        // Add API version header (v1 for /api/*, v2 for /api/v2/*, etc.)
        const versionMatch = url.pathname.match(/^\/api\/(v\d+)/)
        const apiVersion = versionMatch ? versionMatch[1] : 'v1'
        response.headers.set('API-Version', apiVersion)
    } else if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2|woff|ttf|eot|ico)$/)
    ) {
        // Static assets: long cache (1 year) since they're usually versioned
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    } else if (
        url.pathname === '/' ||
        url.pathname.startsWith('/amber') ||
        url.pathname.startsWith('/forest') ||
        url.pathname.startsWith('/focus') ||
        url.pathname.startsWith('/map') ||
        url.pathname.startsWith('/friends') ||
        url.pathname.startsWith('/account')
    ) {
        // HTML pages: cache with revalidation for freshness
        // MUST be private to prevent CDNs from caching personalized content
        response.headers.set('Cache-Control', 'private, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
    } else if (url.pathname.startsWith('/notes')) {
        // Notes page: always fetch fresh (managed by setHeaders in load function)
        // Don't override - let the load function's no-cache directives take precedence
        if (!response.headers.has('Cache-Control')) {
            response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
    } else {
        // Default: no cache
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }

    // Add performance and security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Enable compression for text-based content
    if (response.headers.get('Content-Type')?.includes('text')) {
        response.headers.set('Vary', 'Accept-Encoding')
    }

    return response
}

export const handle = sequence(supabaseHandle, corsHandle, cacheHandle)
