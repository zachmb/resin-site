import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};
const MAX_AMBER_SESSIONS = 200;
const MAX_FOCUS_SESSIONS = 200;
const MAX_JOINT_PLANS = 100;

function logAmberDataIssue(scope: string) {
    console.error(`[api/amber/data] ${scope}`);
}

export const GET: RequestHandler = async ({ locals: { getUser, getAuthenticatedSupabase }, setHeaders }) => {
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
        }

        const supabase = await getAuthenticatedSupabase();

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, total_stones, current_streak, account_type')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError) {
            logAmberDataIssue('profile_lookup_failed');
            return json({ error: 'Failed to fetch profile' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // Fetch amber sessions (non-draft)
        const { data: notes, error: notesError } = await supabase
            .from('amber_sessions')
            .select(`
                id,
                raw_text,
                display_title,
                title,
                status,
                created_at,
                updated_at,
                intensity,
                rating,
                reflection,
                was_celebrated,
                amber_tasks (
                    id,
                    session_id,
                    title,
                    description,
                    estimated_minutes,
                    sequence_order,
                    start_time,
                    end_time,
                    requires_focus,
                    requires_camera_verification,
                    created_at,
                    updated_at
                )
            `)
            .eq('user_id', user.id)
            .neq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(MAX_AMBER_SESSIONS);
        if (notesError) {
            logAmberDataIssue('sessions_lookup_failed');
            return json({ error: 'Failed to fetch sessions' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        // Fetch blocking sessions (focus sessions)
        const { data: focusSessions, error: focusSessionsError } = await supabase
            .from('blocking_sessions')
            .select('id, title, start_time, end_time, is_active, device_scheduled, created_at, updated_at')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false })
            .limit(MAX_FOCUS_SESSIONS);
        if (focusSessionsError) {
            logAmberDataIssue('focus_sessions_lookup_failed');
            return json({ error: 'Failed to fetch focus sessions' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        const normalizedNotes = (notes || []).map((note: any) => ({
            ...note,
            sessionType: 'amber',
            title: note.display_title ?? note.title ?? '',
            content: note.raw_text ?? '',
            amber_tasks: (note.amber_tasks || []).sort((a: any, b: any) => {
                if (a.start_time && b.start_time) {
                    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                }
                return 0;
            })
        }));

        // Convert blocking sessions to amber format
        const normalizedFocusSessions = (focusSessions || []).map((fs: any) => ({
            id: fs.id,
            sessionType: 'focus',
            title: fs.title || 'Focus Session',
            display_title: fs.title || 'Focus Session',
            content: '',
            raw_text: '',
            status: new Date(fs.end_time) < new Date() ? 'completed' :
                    new Date(fs.start_time) <= new Date() ? 'scheduled' : 'scheduled',
            intensity: 1,
            created_at: fs.start_time,
            updated_at: fs.updated_at,
            start_time: fs.start_time,
            end_time: fs.end_time,
            is_device_scheduled: fs.device_scheduled,
            amber_tasks: [{
                id: `focus-${fs.id}`,
                session_id: fs.id,
                title: fs.title || 'Focus',
                estimated_minutes: Math.round((new Date(fs.end_time).getTime() - new Date(fs.start_time).getTime()) / 60000),
                start_time: fs.start_time,
                end_time: fs.end_time,
                sequence_order: 1
            }]
        }));

        // Merge and sort
        const allSessions = [...normalizedNotes, ...normalizedFocusSessions].sort((a, b) => {
            const aTime = a.amber_tasks?.[0]?.start_time || a.created_at;
            const bTime = b.amber_tasks?.[0]?.start_time || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        // Fetch joint plans
        const { data: jointPlans, error: jointPlansError } = await supabase
            .from('joint_amber_plans')
            .select('id, raw_text, intensity, status, created_at, updated_at')
            .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(MAX_JOINT_PLANS);
        if (jointPlansError) {
            logAmberDataIssue('joint_plans_lookup_failed');
            return json({ error: 'Failed to fetch joint plans' }, { status: 500, headers: NO_STORE_HEADERS });
        }

        return json({
            sessions: allSessions,
            jointPlans: jointPlans || [],
            profile,
            timestamp: Date.now()
        }, { headers: NO_STORE_HEADERS });
    } catch (error) {
        logAmberDataIssue('request_failed');
        return json(
            { error: 'Failed to fetch amber data' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
};
