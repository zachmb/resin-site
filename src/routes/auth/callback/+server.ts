import { redirect } from '@sveltejs/kit'

export const GET = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') ?? '/notes'

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

            // Capture and store the refresh_token separately in user_credentials
            // This is critical for background token refresh.
            console.log('[Auth Callback] Session data:', {
                has_provider_refresh_token: !!session.provider_refresh_token,
                user_id: session.user.id,
                provider: session.user.app_metadata?.provider
            });

            if (session.provider_refresh_token) {
                console.log('[Auth Callback] OAuth refresh capability received');
                try {
                    const { createClient } = await import('@supabase/supabase-js')
                    const { PUBLIC_SUPABASE_URL } = await import('$env/static/public')
                    const { SUPABASE_SERVICE_ROLE_KEY } = await import('$env/static/private')

                    const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                        auth: { persistSession: false }
                    })

                    const updateData: any = {
                        id: session.user.id,
                        updated_at: new Date().toISOString()
                    };

                    updateData.google_refresh_token = session.provider_refresh_token;

                    const { error: upsertError } = await admin.from('user_credentials').upsert(updateData)

                    if (upsertError) {
                        console.error('[Auth Callback] Error storing OAuth refresh capability:', upsertError.message);
                    } else {
                        console.log('[Auth Callback] OAuth refresh capability stored successfully');
                    }
                } catch (err) {
                    console.error('[Auth Callback] Unexpected error during token storage:', err);
                }
            } else {
                console.warn('[Auth Callback] No provider refresh token found in session. Ensure offline_access and prompt=consent were used.');
            }

            // Safer redirect logic
            // 1. Ensure 'next' is a valid path starting with /
            // 2. If it's a full URL, ensure it's on the same origin
            let redirectPath = '/';
            try {
                // Reject protocol-relative (`//evil.com`) and backslash
                // (`/\evil.com`) forms — browsers treat both as cross-origin.
                if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
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
    // /auth/auth-code-error doesn't exist as a route — land on login instead
    throw redirect(303, '/login?error=auth-code')
}
