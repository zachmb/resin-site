import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { RequestEvent } from '@sveltejs/kit'

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
})

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

    // 2. Parse body
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

    // 3. Upsert into device_tokens table (unique on user_id + device_token)
    const { error: dbError } = await admin
        .from('device_tokens')
        .upsert(
            { user_id: user.id, device_token, platform, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,device_token' }
        )

    if (dbError) {
        console.error('[register-device] DB error:', dbError)
        return json({ error: 'Failed to save device token' }, { status: 500 })
    }

    console.log(`[register-device] Registered token for user ${user.id}`)
    return json({ status: 'ok' })
}

export const OPTIONS = async () => new Response(null, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
