import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Note: Requires SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security when searching by token instead of active user session.
const supabaseAdmin = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || publicEnv.PUBLIC_SUPABASE_ANON_KEY
);

export const GET = async ({ request }: RequestEvent) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return json({ error: 'Missing or invalid Authorization header (Bearer token required)' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return json({ error: 'Token not provided' }, { status: 401 });
    }

    // 1. Authenticate Request via PAT (openclaw_api_key matches the Bearer token)
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('openclaw_api_key', token)
        .single();

    if (error || !profile) {
        return json({ error: 'Unauthorized: Invalid access token' }, { status: 401 });
    }

    // 2. Fetch the user's latest focus notes to return as the schedule context
    const { data: notes, error: notesError } = await supabaseAdmin
        .from('amber_sessions')
        .select('id, title, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (notesError) {
        return json({ error: 'Failed to retrieve schedule' }, { status: 500 });
    }

    // 3. Return the user's focus schedule for OpenCLAW integration
    return json({
        status: "success",
        user: {
            id: profile.id,
            focus_window: {
                start: profile.availability_start || '09:00',
                end: profile.availability_end || '17:00'
            }
        },
        openclaw_integrated: true,
        recent_focus_sessions: notes
    });
};
