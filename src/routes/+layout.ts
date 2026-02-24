import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { createBrowserClient, isBrowser } from '@supabase/ssr'
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
    depends('supabase:auth')

    // Create a browser client for the client side
    const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
            fetch,
        }
    })

    // getSession ensures it's fresh if in browser, otherwise fallback to server data
    const session = isBrowser() ? (await supabase.auth.getSession()).data.session : data.session;

    return { supabase, session }
}
