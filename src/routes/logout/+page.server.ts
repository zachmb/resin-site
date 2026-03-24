import { redirect } from '@sveltejs/kit'

export const actions = {
    default: async ({ locals: { getAuthenticatedSupabase } }) => {
        const supabase = await getAuthenticatedSupabase();
        await supabase.auth.signOut()
        throw redirect(303, '/')
    },
}
