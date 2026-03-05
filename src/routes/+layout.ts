import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { createBrowserClient, isBrowser } from '@supabase/ssr'
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
    depends('supabase:auth')

    // Create a browser client for the client side
    const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
            fetch,
            headers: {
                'apikey': PUBLIC_SUPABASE_ANON_KEY,
                'X-Client-Info': 'resin-site-web'
            }
        }
    })

    if (isBrowser()) {
        console.log('[Layout] Supabase client initialized. URL:', PUBLIC_SUPABASE_URL);
        if (!PUBLIC_SUPABASE_ANON_KEY) console.error('[Layout] PUBLIC_SUPABASE_ANON_KEY IS MISSING!');
    }

    const { data: { session } } = await supabase.auth.getSession();

    return { ...data, supabase, session }
}
