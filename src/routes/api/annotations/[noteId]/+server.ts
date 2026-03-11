import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId } = params;

    try {
        const { data, error } = await supabase
            .from('note_annotations')
            .select('drawing_data')
            .eq('note_id', noteId)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch annotations:', error);
            return json({ error: 'Failed to fetch annotations' }, { status: 500 });
        }

        // Extract just the drawing_data from results
        const annotations = (data || []).map((ann: any) => ann.drawing_data);

        return json({ annotations });
    } catch (err) {
        console.error('Error fetching annotations:', err);
        return json({ error: 'An error occurred' }, { status: 500 });
    }
};
