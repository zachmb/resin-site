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

    // 4. Retrieve the refresh_token from the user_credentials table
    const { data: credentials, error: credsError } = await admin
        .from('user_credentials')
        .select('google_refresh_token')
        .eq('id', user.id)
        .single()

    if (credsError) {
        console.error('[Token API] Database error fetching credentials:', credsError);
        return json({
            error: 'Database error fetching Google credentials.',
            details: credsError.message
        }, { status: 500 })
    }

    if (!credentials?.google_refresh_token) {
        console.warn('[Token API] No refresh token found for user:', user.id);
        return json({
            error: 'Google refresh token not available. Please sign in again on the website.',
            hint: 'Ensure you have connected your Google account and granted offline access.'
        }, { status: 404 })
    }

    // 5. Exchange the refresh_token for a fresh access_token
    try {
        const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = await import('$env/static/private')

        console.log('[Token API] Exchanging refresh token for access token...');
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: credentials.google_refresh_token
            })
        })

        const tokenData = await response.json()

        if (!response.ok) {
            console.error('[Token API] Google token exchange failed:', tokenData);
            return json({ error: 'Failed to refresh Google token', details: tokenData }, { status: 400 })
        }

        console.log('[Token API] Token refreshed successfully');
        return json({
            access_token: tokenData.access_token,
            expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in
        })
    } catch (err) {
        console.error('[Token API] Unexpected error during token refresh:', err);
        return json({ error: 'Internal server error during token refresh' }, { status: 500 })
    }
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
