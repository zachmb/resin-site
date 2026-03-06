import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { RequestEvent } from '@sveltejs/kit'

/**
 * POST /api/auth/save-credentials
 * 
 * Securely stores Google refresh tokens captured by the iOS app.
 */
export const POST = async ({ request }: RequestEvent) => {
    // 1. Auth: Extract Bearer JWT from Authorization header
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!jwt) {
        return json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // 2. Create admin client
    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    })

    // 3. Validate JWT
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !user) {
        return json({ error: 'Invalid or expired token', details: userError?.message }, { status: 401 })
    }

    // 4. Parse body
    let body: { google_refresh_token: string }
    try {
        body = await request.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { google_refresh_token } = body
    if (!google_refresh_token) {
        return json({ error: 'google_refresh_token is required' }, { status: 400 })
    }

    // 5. Upsert to user_credentials
    console.log(`[save-credentials] Storing refresh token for user: ${user.id}`)
    const { error: upsertError } = await admin.from('user_credentials').upsert({
        id: user.id,
        google_refresh_token,
        updated_at: new Date().toISOString()
    })

    if (upsertError) {
        console.error('[save-credentials] Database error:', upsertError)
        return json({ error: 'Database error storing credentials', details: upsertError.message }, { status: 500 })
    }

    return json({ status: 'saved' })
}

export const OPTIONS = async () => new Response(null, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
