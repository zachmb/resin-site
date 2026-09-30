import { json } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { adminClient } from '$lib/server/auth'
import { readBoundedJsonResponse } from '$lib/server/requestBody'

const MAX_JWT_LENGTH = 8192
const GOOGLE_TOKEN_TIMEOUT_MS = 8000
const MAX_GOOGLE_TOKEN_RESPONSE_LENGTH = 16_000
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
}
const ALLOWED_BROWSER_ORIGINS = new Set([
    'https://noteresin.com',
    'https://www.noteresin.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
])

function responseHeaders(request: Request): HeadersInit {
    const origin = request.headers.get('origin') ?? ''
    const headers: Record<string, string> = {
        ...NO_STORE_HEADERS,
        Vary: 'Origin, Authorization'
    }

    if (ALLOWED_BROWSER_ORIGINS.has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin
    }

    return headers
}

export const GET = async ({ request }) => {
    const headers = responseHeaders(request)

    // 1. Extract Bearer JWT from Authorization header (iOS sends this, no cookies)
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers })
    }

    // 2. Validate the JWT and get the user
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt)

    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401, headers })
    }

    // 3. Retrieve the refresh_token from the user_credentials table
    const { data: credentials, error: credsError } = await adminClient
        .from('user_credentials')
        .select('google_refresh_token')
        .eq('id', user.id)
        .maybeSingle()

    if (credsError) {
        console.error('[Token API] Credential lookup failed');
        return json({
            error: 'Could not fetch Google credentials.'
        }, { status: 500, headers })
    }

    if (!credentials?.google_refresh_token) {
        console.warn('[Token API] No refresh token found for authenticated user');
        return json({
            error: 'Google refresh token not available. Please sign in again on the website.',
            hint: 'Ensure you have connected your Google account and granted offline access.'
        }, { status: 404, headers })
    }

    // 5. Exchange the refresh_token for a fresh access_token
    try {
        const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await import('$env/static/private')

        const params: Record<string, string> = {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: credentials.google_refresh_token
        }

        // Google sometimes requires the original redirect_uri if it was provided during authorization.
        const supabaseCallback = `${PUBLIC_SUPABASE_URL}/auth/v1/callback`
        params.redirect_uri = supabaseCallback

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params),
            signal: AbortSignal.timeout(GOOGLE_TOKEN_TIMEOUT_MS)
        })

        const tokenData = await readBoundedJsonResponse<{
            access_token?: unknown
            expires_in?: unknown
        }>(response, MAX_GOOGLE_TOKEN_RESPONSE_LENGTH)

        if (!response.ok) {
            console.error('[Token API] Google token exchange failed');
            return json({ error: 'Failed to refresh Google token' }, { status: 400, headers })
        }

        if (typeof tokenData.access_token !== 'string' || typeof tokenData.expires_in !== 'number') {
            console.error('[Token API] Google token response was incomplete');
            return json({ error: 'Failed to refresh Google token' }, { status: 502, headers })
        }

        return json({
            access_token: tokenData.access_token,
            expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in
        }, { headers })
    } catch {
        console.error('[Token API] Unexpected error during token refresh');
        return json({ error: 'Internal server error during token refresh' }, { status: 500, headers })
    }
}

// Allow iOS app to call this endpoint cross-origin (preflight)
export const OPTIONS = async ({ request }) => {
    const headers = responseHeaders(request)
    return new Response(null, {
        headers: {
            ...headers,
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
    })
}
