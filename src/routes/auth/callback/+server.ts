import { redirect } from '@sveltejs/kit'
import { adminClient } from '$lib/server/auth'

const IOS_CALLBACK_SCHEME = 'com.resin.app:'
const IOS_AUTH_CALLBACK_HOSTS = new Set(['auth', 'auth-callback', 'callback', 'login-callback', 'oauth'])
const isDev = process.env.NODE_ENV === 'development'
const FALLBACK_REDIRECT_PATH = '/'

function safeWebRedirectPath(next: string, origin: string): string {
    try {
        if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
            return next
        }

        const nextUrl = new URL(next, origin)
        if (nextUrl.origin === origin) {
            return nextUrl.pathname + nextUrl.search
        }
    } catch {
        console.warn('[Auth Callback] Invalid next parameter')
    }

    return FALLBACK_REDIRECT_PATH
}

function safeIOSAuthCallback(next: string, code: string | null): string | null {
    try {
        const appUrl = new URL(next)
        if (appUrl.protocol !== IOS_CALLBACK_SCHEME) return null
        if (!IOS_AUTH_CALLBACK_HOSTS.has(appUrl.hostname)) return null
        if (code) appUrl.searchParams.set('code', code)
        return appUrl.toString()
    } catch {
        return null
    }
}

export const GET = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') ?? '/notes'

    // ── iOS deep-link pass-through ──────────────────────────────────────────
    // When the iOS app initiates OAuth, it sets redirectTo = com.resin.app://...
    // Supabase preserves this as the `next` param on this callback.
    // We must NOT consume the code here — instead hand it back to the app so
    // the Supabase Swift SDK can exchange it via client.auth.session(from:).
    if (next.startsWith('com.resin.app://')) {
        const appCallback = safeIOSAuthCallback(next, code)
        if (appCallback) {
            throw redirect(303, appCallback)
        }

        console.warn('[Auth Callback] Rejected invalid iOS callback target')
        throw redirect(303, '/login?error=invalid-ios-callback')
    }

    // ── Web sign-in (normal flow) ───────────────────────────────────────────
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
            const { session } = data;
            const provider = typeof session.user.app_metadata?.provider === 'string'
                ? session.user.app_metadata.provider
                : '';

            // Capture and store the refresh_token separately in user_credentials
            // This is critical for background token refresh.
            if (isDev) {
                console.log('[Auth Callback] Session established:', {
                    has_provider_refresh_token: !!session.provider_refresh_token,
                    provider
                });
            }

            if (provider === 'google' && session.provider_refresh_token) {
                if (isDev) console.log('[Auth Callback] OAuth refresh capability received');
	                try {
	                    const updateData: any = {
	                        id: session.user.id,
	                        updated_at: new Date().toISOString()
                    };

                    updateData.google_refresh_token = session.provider_refresh_token;

                    const { error: upsertError } = await adminClient.from('user_credentials').upsert(updateData)

                    if (upsertError) {
	                        console.error('[Auth Callback] Error storing OAuth refresh capability');
                    } else {
                        if (isDev) console.log('[Auth Callback] OAuth refresh capability stored successfully');
                    }
                } catch (err) {
                    console.error('[Auth Callback] Unexpected error during token storage');
                }
            } else if (provider === 'google') {
                console.warn('[Auth Callback] No provider refresh token found in session. Ensure offline_access and prompt=consent were used.');
            }

            const redirectPath = safeWebRedirectPath(next, url.origin)

            if (isDev) console.log('[Auth Callback] Redirecting to authenticated app path')
            throw redirect(303, redirectPath)
        }
    }

    console.error('[Auth Callback] Auth code error or missing code');
    // /auth/auth-code-error doesn't exist as a route — land on login instead
    throw redirect(303, '/login?error=auth-code')
}
