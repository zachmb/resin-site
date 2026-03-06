import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { sendPush } from '$lib/apns';
import type { RequestEvent } from '@sveltejs/kit';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

export const POST = async ({ request, locals }: RequestEvent) => {
    // 1. Auth: Get session from locals (set by hooks.server.ts)
    const session = await locals.getSession();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    // 2. Parse body
    let body: {
        title: string;
        durationMinutes: number;
        startTime?: string; // ISO string
    };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { title, durationMinutes, startTime } = body;

    if (!title || !durationMinutes) {
        return json({ error: 'title and durationMinutes are required' }, { status: 400 });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    try {
        // 3. Insert into blocking_sessions
        // The iOS app polls this table or receives a push to sync.
        const { data, error } = await admin.from('blocking_sessions').insert({
            user_id: user.id,
            title: title,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            device_scheduled: false
        }).select().single();

        if (error) throw error;

        // 4. Send APNs push to notify the device to sync immediately
        const { data: tokens } = await admin
            .from('device_tokens')
            .select('device_token')
            .eq('user_id', user.id)
            .eq('platform', 'apns');

        if (tokens && tokens.length > 0) {
            await Promise.all(tokens.map(({ device_token }) =>
                sendPush(device_token, {
                    title: `Focus Session Started`,
                    body: `"${title}" initiated from web dashboard.`,
                    data: { type: 'sync_blocking' }
                })
            ));
        }

        return json({ status: 'success', session: data });

    } catch (err) {
        console.error('[api/focus] Error:', err);
        return json({ error: String(err) }, { status: 500 });
    }
};
