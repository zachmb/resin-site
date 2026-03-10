import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Missing session ID' }, { status: 400 });

    try {
        const { data: blockingSession, error } = await supabase
            .from('blocking_sessions')
            .select('device_scheduled')
            .eq('id', id)
            .eq('user_id', session.user.id)
            .single();

        if (error || !blockingSession) {
            return json({ error: 'Session not found' }, { status: 404 });
        }

        return json({ device_scheduled: blockingSession.device_scheduled });
    } catch (err) {
        console.error('Error fetching sync status:', err);
        return json({ error: 'Failed to fetch sync status' }, { status: 500 });
    }
};
