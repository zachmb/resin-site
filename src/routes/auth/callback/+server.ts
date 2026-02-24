import { redirect } from '@sveltejs/kit'

export const GET = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') ?? '/'

    // ── iOS deep-link pass-through ──────────────────────────────────────────
    // When the iOS app initiates OAuth, it sets redirectTo = com.resin.app://...
    // Supabase preserves this as the `next` param on this callback.
    // We must NOT consume the code here — instead hand it back to the app so
    // the Supabase Swift SDK can exchange it via client.auth.session(from:).
    if (next.startsWith('com.resin.app://')) {
        const appUrl = new URL(next)
        if (code) appUrl.searchParams.set('code', code)
        throw redirect(303, appUrl.toString())
    }

    // ── Web sign-in (normal flow) ───────────────────────────────────────────
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
            const { session } = data;

            // Persist the provider_token in user metadata so the iOS app can retrieve it
            // via the /api/auth/token endpoint if needed.
            if (session.provider_token) {
                await supabase.auth.updateUser({
                    data: {
                        provider_token: session.provider_token,
                        provider_token_expiry: Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600)
                    }
                })
            }

            // Capture and store the refresh_token separately in user_credentials
            // This is critical for background token refresh.
            if (session.provider_refresh_token) {
                console.log('[Auth Callback] Provider refresh token captured for user:', session.user.id);
                try {
                    const { createClient } = await import('@supabase/supabase-js')
                    const { PUBLIC_SUPABASE_URL } = await import('$env/static/public')
                    const { SUPABASE_SERVICE_ROLE_KEY } = await import('$env/static/private')

                    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                        auth: { persistSession: false }
                    })

                    const { error: upsertError } = await admin.from('user_credentials').upsert({
                        id: session.user.id,
                        google_refresh_token: session.provider_refresh_token,
                        updated_at: new Date().toISOString()
                    })

                    if (upsertError) {
                        console.error('[Auth Callback] Error storing refresh token:', upsertError);
                    } else {
                        console.log('[Auth Callback] Refresh token stored successfully');
                    }
                } catch (err) {
                    console.error('[Auth Callback] Unexpected error during token storage:', err);
                }
            } else {
                console.warn('[Auth Callback] No provider_refresh_token found in session. Ensure offline_access and prompt=consent were used.');
            }

            // Safer redirect logic
            // 1. Ensure 'next' is a valid path starting with /
            // 2. If it's a full URL, ensure it's on the same origin
            let redirectPath = '/';
            try {
                if (next.startsWith('/')) {
                    redirectPath = next;
                } else {
                    const nextUrl = new URL(next, url.origin);
                    if (nextUrl.origin === url.origin) {
                        redirectPath = nextUrl.pathname + nextUrl.search;
                    }
                }
            } catch (e) {
                console.warn('[Auth Callback] Invalid next parameter:', next);
            }

            console.log('[Auth Callback] Redirecting to:', redirectPath);
            throw redirect(303, redirectPath)
        }
    }

    console.error('[Auth Callback] Auth code error or missing code');
    throw redirect(303, '/auth/auth-code-error')
}
