import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { readBoundedJsonBody, readBoundedJsonResponse, RequestBodyError } from '$lib/server/requestBody'
import { adminClient } from '$lib/server/auth'

const MAX_JWT_LENGTH = 8192
const MAX_REQUEST_BODY_LENGTH = 16_000
const GOOGLE_TOKEN_TIMEOUT_MS = 8000
const MAX_GOOGLE_TOKEN_RESPONSE_LENGTH = 16_000
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
const MAX_GOOGLE_REFRESH_TOKEN_LENGTH = 4096
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]+$/
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

async function verifyGoogleRefreshToken(refreshToken: string): Promise<boolean> {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await import('$env/static/private')
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }),
        signal: AbortSignal.timeout(GOOGLE_TOKEN_TIMEOUT_MS)
    })

    let tokenData: unknown
    try {
        tokenData = await readBoundedJsonResponse<{ access_token?: unknown }>(
            response,
            MAX_GOOGLE_TOKEN_RESPONSE_LENGTH
        )
    } catch {
        return false
    }

    return response.ok && typeof (tokenData as { access_token?: unknown }).access_token === 'string'
}

/**
 * POST /api/auth/save-credentials
 * 
 * Securely stores Google refresh tokens captured by the iOS app.
 */
export const POST = async ({ request, setHeaders }: RequestEvent) => {
    const headers = responseHeaders(request)
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    })

    // 1. Auth: Extract Bearer JWT from Authorization header
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers })
    }

    // 2. Validate JWT
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt)
    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401, headers })
    }

    // 3. Parse body
    let body: { google_refresh_token: string }
    try {
        body = await readBoundedJsonBody<{ google_refresh_token: string }>(request, MAX_REQUEST_BODY_LENGTH)
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers })
    }

    const { google_refresh_token } = body
    const safeRefreshToken = typeof google_refresh_token === 'string'
        ? google_refresh_token.trim()
        : ''
    if (
        !safeRefreshToken ||
        safeRefreshToken.length > MAX_GOOGLE_REFRESH_TOKEN_LENGTH ||
        !TOKEN_RE.test(safeRefreshToken)
    ) {
        return json({ error: 'Invalid Google refresh token' }, { status: 400, headers })
    }

    let tokenVerified = false
    try {
        tokenVerified = await verifyGoogleRefreshToken(safeRefreshToken)
    } catch {
        console.error('[save-credentials] Google refresh token verification failed')
    }

    if (!tokenVerified) {
        return json({ error: 'Google refresh token could not be verified' }, { status: 400, headers })
    }

    // 4. Upsert to user_credentials
    const { error: upsertError } = await adminClient.from('user_credentials').upsert({
        id: user.id,
        google_refresh_token: safeRefreshToken,
        updated_at: new Date().toISOString()
    })

    if (upsertError) {
        console.error('[save-credentials] Credential storage failed')
        return json({ error: 'Could not store credentials' }, { status: 500, headers })
    }

    return json({ status: 'saved' }, { headers })
}

export const OPTIONS = async ({ request }: RequestEvent) => new Response(null, {
    headers: {
        ...responseHeaders(request),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
