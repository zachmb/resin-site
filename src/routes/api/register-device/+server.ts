import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody'
import { adminClient } from '$lib/server/auth'

const VALID_PLATFORMS = new Set(['apns', 'ios'])
const APNS_TOKEN_LENGTH = 64
const MAX_REQUEST_BODY_LENGTH = 4_000
const MAX_JWT_LENGTH = 8192
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

function normalizeAPNSToken(token: string): string {
    return token.trim().toLowerCase()
}

function isValidAPNSToken(token: string): boolean {
    return (
        token.length === APNS_TOKEN_LENGTH &&
        /^[a-f0-9]+$/.test(token)
    )
}

/**
 * POST /api/register-device
 * Body: { device_token: string, platform?: "apns" }
 * Auth: Bearer <supabase_jwt>
 *
 * Called by the iOS app on every launch after successful auth,
 * and immediately after the user logs in, to ensure the stored
 * APNs token is current.
 */
export const POST = async ({ request, setHeaders }: RequestEvent) => {
    const headers = responseHeaders(request)
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    })

    // 1. Authenticate
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers })
    }

    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt)
    if (userError || !user) return json({ error: 'Invalid or expired token' }, { status: 401, headers })

    // 2. Parse body (accept device_token from iOS app, map to token in db)
    let body: { device_token?: string; platform?: string }
    try {
        body = await readBoundedJsonBody<{ device_token?: string; platform?: string }>(request, MAX_REQUEST_BODY_LENGTH)
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers })
    }

    const { device_token, platform = 'apns' } = body
    if (!device_token || typeof device_token !== 'string') {
        return json({ error: 'device_token is required' }, { status: 400, headers })
    }
    const normalizedToken = normalizeAPNSToken(device_token)
    if (!isValidAPNSToken(normalizedToken)) {
        return json({ error: 'Invalid device token' }, { status: 400, headers })
    }
    if (typeof platform !== 'string' || !VALID_PLATFORMS.has(platform)) {
        return json({ error: 'Invalid platform' }, { status: 400, headers })
    }

    // Map platform to device_type: 'apns' → 'ios'
    const device_type = platform === 'apns' ? 'ios' : platform

    const { error: cleanupError } = await adminClient
        .from('device_tokens')
        .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
        .eq('token', normalizedToken)
        .neq('user_id', user.id)

    if (cleanupError) {
        console.error('[register-device] Token ownership cleanup failed')
        return json({ error: 'Failed to save device token' }, { status: 500, headers })
    }

    const { data: existing, error: lookupError } = await adminClient
        .from('device_tokens')
        .select('id')
        .eq('token', normalizedToken)
        .maybeSingle()

    if (lookupError) {
        console.error('[register-device] Token lookup failed')
        return json({ error: 'Failed to save device token' }, { status: 500, headers })
    }

    const payload = {
        user_id: user.id,
        token: normalizedToken,
        device_type,
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    // 3. Save into device_tokens table by token row so account switching cannot
    // leave a stale owner or collide with unique token indexes.
    const { error: dbError } = existing
        ? await adminClient
            .from('device_tokens')
            .update(payload)
            .eq('id', existing.id)
            .eq('token', normalizedToken)
        : await adminClient
        .from('device_tokens')
        .insert(payload)

    if (dbError) {
        console.error('[register-device] DB error')
        return json({ error: 'Failed to save device token' }, { status: 500, headers })
    }

    return json({ status: 'ok' }, { headers })
}

export const OPTIONS = async ({ request }: RequestEvent) => new Response(null, {
    headers: {
        ...responseHeaders(request),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
