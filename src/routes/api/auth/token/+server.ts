import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'

export const GET = async ({ request }) => {
    // 1. Extract Bearer JWT from Authorization header (iOS sends this, no cookies)
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!jwt) {
        return json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // 2. Create an admin client with service role — never exposed to browser
    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    })

    // 3. Validate the JWT and get the user
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)

    if (userError || !user) {
        return json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // 4. Retrieve the provider_token from user metadata
    //    NOTE: Supabase only stores provider_token server-side if it was
    //    explicitly saved to user_metadata at login time (e.g. via a webhook/edge function).
    //    If it's not here, the iOS app should read session.providerToken directly from the SDK.
    const providerToken =
        user.user_metadata?.provider_token ??
        user.app_metadata?.provider_token

    if (!providerToken) {
        return json({
            error: 'Google token not available. Please sign in again.',
            hint: 'provider_token is not persisted by Supabase after session expiry. Consider storing it via an Auth Webhook on sign-in.'
        }, { status: 404 })
    }

    return json({
        access_token: providerToken,
        expires_at: user.user_metadata?.provider_token_expiry ?? null
    })
}

// Allow iOS app to call this endpoint cross-origin (preflight)
export const OPTIONS = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
    })
}
