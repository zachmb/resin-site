import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { getAuthenticatedSupabase, session } }) => {
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getAuthenticatedSupabase();

    const id = url.searchParams.get('id');
    if (!id) {
        return json({ error: 'Missing session id' }, { status: 400 });
    }

    const { data: session_data, error } = await supabase
        .from('blocking_sessions')
        .select('device_scheduled')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

    if (error) {
        return json({ error: 'Session not found' }, { status: 404 });
    }

    return json({ device_scheduled: session_data?.device_scheduled ?? false });
};
