import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/taste');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    const { data: feedback } = await supabase
        .from('amber_task_feedback')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    // Process feedback
    const feelingCounts: Record<string, number> = {};
    const enjoyedThings: { text: string; date: string }[] = [];
    const ratingHistory: { date: string; rating: number }[] = [];

    for (const fb of (feedback || [])) {
        if (fb.rating) {
            ratingHistory.push({
                date: new Date(fb.created_at).toISOString().split('T')[0],
                rating: fb.rating
            });
        }

        const comments = fb.comments || '';
        const feelingMatch = comments.match(/feeling:(\S+)/);
        if (feelingMatch) {
            feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
        }

        const enjoyedMatch = comments.match(/enjoyed:(.+)/);
        if (enjoyedMatch) {
            enjoyedThings.push({
                text: enjoyedMatch[1].trim(),
                date: new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            });
        }
    }

    return {
        profile,
        feelingCounts,
        enjoyedThings,
        ratingHistory: ratingHistory.reverse() // chronological
    };
};
