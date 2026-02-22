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
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            throw redirect(303, `/${next.slice(1)}`)
        }
    }

    throw redirect(303, '/auth/auth-code-error')
}
