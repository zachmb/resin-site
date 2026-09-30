import { createServerClient } from '@supabase/ssr'
import { sequence } from '@sveltejs/kit/hooks'
import { type Handle } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const apiCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
}
const routeOwnedCorsPrefixes = [
    '/api/activate',
    '/api/activity/update-daily',
    '/api/amber/data',
    '/api/amber/reschedule',
    '/api/amber/sessions',
    '/api/auth/apple-notifications',
    '/api/auth/save-credentials',
    '/api/auth/token',
    '/api/blocking/check-domain',
    '/api/blocking/get-blocked-domains',
    '/api/blocking/sync',
    '/api/blocking/verify-sync',
    '/api/commands/send-email',
    '/api/calendar/activity',
    '/api/devices/heartbeat',
    '/api/devices/list',
    '/api/devices/register-ios',
    '/api/devices/register-token',
    '/api/devices/unregister-ios',
    '/api/devices/unregister-token',
    '/api/emergency/trigger',
    '/api/focus',
    '/api/focus/expand-automations',
    '/api/focus/sync-status',
    '/api/gamification/apply-reward',
    '/api/gamification/forest-status',
    '/api/groups/create',
    '/api/insights/generate',
    '/api/notes/data',
    '/api/notes/sync',
    '/api/notifications/send-focus-session',
    '/api/profile/entitlement-sync',
    '/api/profile/sync',
    '/api/register-device',
    '/api/schedule',
    '/api/time-drift/log'
]
const routeOwnedCorsV1Prefixes = routeOwnedCorsPrefixes.map((prefix) => prefix.replace('/api/', '/api/v1/'))
const csrfProtectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const mutationContentTypes = new Set([
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
])

function isCsrfCandidate(event: Parameters<Handle>[0]['event']) {
    if (!csrfProtectedMethods.has(event.request.method)) return false

    if (event.url.pathname.startsWith('/api/')) {
        // Native apps and signed webhooks generally omit Origin. Browser callers
        // using cross-origin CORS must present their own Bearer credential rather
        // than silently falling back to the user's Resin cookies.
        if (!event.request.headers.has('origin')) return false
        const authorization = event.request.headers.get('authorization') ?? ''
        return !authorization.startsWith('Bearer ')
    }

    const contentType = event.request.headers.get('content-type')?.toLowerCase() ?? ''
    if (![...mutationContentTypes].some((type) => contentType.startsWith(type))) return false
    return true
}

function isSameOriginMutation(event: Parameters<Handle>[0]['event']) {
    const origin = event.request.headers.get('origin')
    if (origin) return origin === event.url.origin

    const referer = event.request.headers.get('referer')
    if (!referer) return true

    try {
        return new URL(referer).origin === event.url.origin
    } catch {
        return false
    }
}

function appendVary(headers: Headers, value: string) {
    const existing = headers.get('Vary')
    if (existing === '*') return
    const values = existing?.split(',').map((entry) => entry.trim().toLowerCase()) ?? []
    if (values.includes(value.toLowerCase())) return
    headers.set('Vary', existing ? `${existing}, ${value}` : value)
}

const csrfHandle: Handle = async ({ event, resolve }) => {
    if (isCsrfCandidate(event) && !isSameOriginMutation(event)) {
        return new Response('Cross-origin form submissions are not allowed.', { status: 403 })
    }

    return resolve(event)
}

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
        
        if (!session) return null;
        
        // Authenticate the user to avoid the Insecure Session warning
        const { data: { user }, error } = await event.locals.supabase.auth.getUser()
        if (error || !user) return null;
        
        session.user = user;
        return session;
    }

    /**
     * getUser() authenticates with the Supabase server to verify the user is genuine.
     * Use this for sensitive operations instead of getSession().
     * Also returns the user with their JWT token for RLS to work on server side.
     */
    event.locals.getUser = async () => {
        const { data: { user }, error } = await event.locals.supabase.auth.getUser()
        if (error) return null
        return user
    }

    /**
     * getAuthenticatedSupabase() returns a Supabase client configured with the user's JWT
     * This makes RLS policies work on the server side by passing auth.uid() context
     * Use this for all database operations that need RLS authentication
     */
    event.locals.getAuthenticatedSupabase = async () => {
        const { data: { session }, error } = await event.locals.supabase.auth.getSession()

        if (error || !session?.access_token) {
            // No session - return the unauthenticated client
            return event.locals.supabase
        }

        // Create a new client instance with the user's JWT in the Authorization header
        // This ensures auth.uid() in RLS policies can see the authenticated user
        const authenticatedClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
            cookies: {
                get: (key) => event.cookies.get(key),
                set: (key, value, options) => {
                    event.cookies.set(key, value, { ...options, path: '/' })
                },
                remove: (key, options) => {
                    event.cookies.delete(key, { ...options, path: '/' })
                },
            },
            global: {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            }
        })

        return authenticatedClient
    }

    // Refresh the session if it exists to ensure cookies are synchronized
    event.locals.session = await event.locals.getSession()

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range'
        },
    })
}

// Add CORS headers to all /api/* responses so the iOS app can call them directly
const corsHandle: Handle = async ({ event, resolve }) => {
    const isRouteOwnedCors = [...routeOwnedCorsPrefixes, ...routeOwnedCorsV1Prefixes].some((prefix) => event.url.pathname === prefix || event.url.pathname.startsWith(`${prefix}/`))

    if (event.url.pathname.startsWith('/api/') && event.request.method === 'OPTIONS' && !isRouteOwnedCors) {
        return new Response(null, {
            status: 204,
            headers: apiCorsHeaders,
        })
    }

    const response = await resolve(event)

    if (event.url.pathname.startsWith('/api/') && !isRouteOwnedCors) {
        for (const [header, value] of Object.entries(apiCorsHeaders)) {
            response.headers.set(header, value)
        }
    }

    return response
}

// Add cache headers for aggressive caching
const cacheHandle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event)
    const url = new URL(event.request.url)

    // Set cache headers based on content type
    if (url.pathname.startsWith('/api/')) {
        // API responses are usually user-specific or token-bearing. Endpoints
        // that are truly public/cacheable, such as /api/config or /api/tree-svg,
        // set their own Cache-Control and are preserved here.
        if (!response.headers.has('Cache-Control')) {
            response.headers.set('Cache-Control', 'no-store, max-age=0')
            response.headers.set('Pragma', 'no-cache')
            response.headers.set('Expires', '0')
        }
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
        url.pathname.startsWith('/rewards') ||
        url.pathname.startsWith('/focus') ||
        url.pathname.startsWith('/map') ||
        url.pathname.startsWith('/friends') ||
        url.pathname.startsWith('/account')
    ) {
        // These pages render user-specific notes, focus state, rewards, devices,
        // and account data. Do not retain them in browser or shared caches.
        response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
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
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    response.headers.set('X-XSS-Protection', '0')

    if (url.protocol === 'https:') {
        response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }

    // Enable compression for text-based content
    if (response.headers.get('Content-Type')?.includes('text')) {
        appendVary(response.headers, 'Accept-Encoding')
    }

    return response
}

export const handle = sequence(csrfHandle, supabaseHandle, corsHandle, cacheHandle)
