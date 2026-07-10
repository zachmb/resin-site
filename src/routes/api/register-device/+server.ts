import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { RequestEvent } from '@sveltejs/kit'

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
})

const VALID_PLATFORMS = new Set(['apns', 'ios'])
const MIN_APNS_TOKEN_LENGTH = 32
const MAX_APNS_TOKEN_LENGTH = 512

function normalizeAPNSToken(token: string): string {
    return token.trim().toLowerCase()
}

function isValidAPNSToken(token: string): boolean {
    return (
        token.length >= MIN_APNS_TOKEN_LENGTH &&
        token.length <= MAX_APNS_TOKEN_LENGTH &&
        token.length % 2 === 0 &&
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
export const POST = async ({ request }: RequestEvent) => {
    // 1. Authenticate
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!jwt) return json({ error: 'Missing Authorization header' }, { status: 401 })

    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !user) return json({ error: 'Invalid or expired token' }, { status: 401 })

    // 2. Parse body (accept device_token from iOS app, map to token in db)
    let body: { device_token?: string; platform?: string }
    try {
        body = await request.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { device_token, platform = 'apns' } = body
    if (!device_token || typeof device_token !== 'string') {
        return json({ error: 'device_token is required' }, { status: 400 })
    }
    const normalizedToken = normalizeAPNSToken(device_token)
    if (!isValidAPNSToken(normalizedToken)) {
        return json({ error: 'Invalid device token' }, { status: 400 })
    }
    if (typeof platform !== 'string' || !VALID_PLATFORMS.has(platform)) {
        return json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Map platform to device_type: 'apns' → 'ios'
    const device_type = platform === 'apns' ? 'ios' : platform

    const { error: cleanupError } = await admin
        .from('device_tokens')
        .update({
            is_active: false,
            updated_at: new Date().toISOString()
        })
        .eq('token', normalizedToken)
        .neq('user_id', user.id)

    if (cleanupError) {
        console.error('[register-device] Token ownership cleanup failed')
        return json({ error: 'Failed to save device token' }, { status: 500 })
    }

    // 3. Upsert into device_tokens table
    const { error: dbError } = await admin
        .from('device_tokens')
        .upsert(
            {
                user_id: user.id,
                token: normalizedToken,
                device_type,
                is_active: true,
                last_used_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id,token' }
        )

    if (dbError) {
        console.error('[register-device] DB error')
        return json({ error: 'Failed to save device token' }, { status: 500 })
    }

    console.log('[register-device] Registered iOS device for focus sync')
    return json({ status: 'ok' })
}

export const OPTIONS = async () => new Response(null, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
