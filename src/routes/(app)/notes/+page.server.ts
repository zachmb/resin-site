import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await locals.getUser();
  if (!user) return { notes: [], userId: null };

  const { data: notes } = await locals.supabase
    .from('brain_dumps')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return {
    notes: notes ?? [],
    userId: user.id
  };
};
