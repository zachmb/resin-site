import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await locals.getUser();
  if (!user) return { sessions: [], userId: null };

  const { data: sessions } = await locals.supabase
    .from('amber_sessions')
    .select('*, amber_tasks(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Sort tasks within each session by sequence_order
  const sorted = (sessions ?? []).map((s) => ({
    ...s,
    amber_tasks: (s.amber_tasks ?? []).sort(
      (a: { sequence_order: number }, b: { sequence_order: number }) =>
        a.sequence_order - b.sequence_order
    )
  }));

  return { sessions: sorted, userId: user.id };
};
