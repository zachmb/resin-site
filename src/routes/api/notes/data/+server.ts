import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};
const NOTE_EDGE_COLUMNS = 'id, source_id, target_id, connection_type, created_at';
const MAX_RETURNED_NOTES = 500;
const MAX_SHARED_NOTES = 200;
const MAX_FRIENDSHIPS = 500;
const MAX_MIND_MAP_EDGES = 1000;

function logNotesDataIssue(scope: string) {
    console.error(`[api/notes/data] ${scope}`);
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

        const userId = user.id;
        const supabase = await getAuthenticatedSupabase();

        const normalizeNote = (note: any) => ({
            id: note.id,
            title: note.display_title ?? note.title ?? '',
            content: note.raw_text ?? note.content ?? '',
            created_at: note.created_at,
            status: note.status
        });

        // Fetch user profile with resilience to schema drift
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, total_stones, current_streak')
            .eq('id', userId)
            .maybeSingle();

        let finalProfile = profile;
        if (profileError) {
            logNotesDataIssue('profile_full_fetch_failed');
            const { data: minimalProfile } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', userId)
                .maybeSingle();
            finalProfile = minimalProfile ? { 
                ...minimalProfile, 
                total_stones: null, 
                current_streak: null 
            } as any : null;
        }

        // Fetch shared notes
        const { data: sharedNotes, error: sharedNotesError } = await supabase
            .from('shared_notes')
            .select('id, amber_sessions!inner(id, raw_text, display_title, status, created_at)')
            .eq('shared_with_id', userId)
            .limit(MAX_SHARED_NOTES);
        if (sharedNotesError) {
            logNotesDataIssue('shared_notes_fetch_failed');
        }

        const normalizedSharedNotes = (sharedNotes || []).map((share: any) => {
            const note = share.amber_sessions;
            return {
                id: note.id,
                title: note.display_title ?? '',
                content: note.raw_text ?? '',
                status: note.status,
                shared_note_id: share.id,
                created_at: note.created_at
            };
        });

        // Fetch friends
        const { data: friendships, error: friendshipsError } = await supabase
            .from('friendships')
            .select('id, requester_id, addressee_id, status')
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
            .eq('status', 'accepted')
            .limit(MAX_FRIENDSHIPS);
        if (friendshipsError) {
            logNotesDataIssue('friendships_fetch_failed');
        }

        const friends = await Promise.all(
            (friendships || []).map(async (friendship: any) => {
                const otherId =
                    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;

                return {
                    id: otherId
                };
            })
        );

        // Fetch mind map edges
        const { data: edges, error: edgesError } = await supabase
            .from('mind_map_edges')
            .select(NOTE_EDGE_COLUMNS)
            .eq('user_id', userId)
            .limit(MAX_MIND_MAP_EDGES);
        if (edgesError) {
            logNotesDataIssue('mind_map_edges_fetch_failed');
        }

        // Fetch user's notes
        const { data: userNotes, error: notesError } = await supabase
            .from('amber_sessions')
            .select('id, raw_text, content, display_title, title, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(MAX_RETURNED_NOTES);

        if (notesError) {
            logNotesDataIssue('user_notes_fetch_failed');
        }

        // Normalize notes
        const normalizedUserNotes = (userNotes || []).map(normalizeNote);

        // Build connection metadata
        const allNotes = normalizedUserNotes.map(n => ({
            id: n.id,
            title: n.title
        }));

        const connections: Record<string, any> = {};
        const noteMap = new Map(allNotes.map(n => [n.id, n]));

        for (const note of allNotes) {
            const outgoing = (edges || [])
                .filter(e => e.source_id === note.id)
                .map(e => ({
                    ...e,
                    targetTitle: noteMap.get(e.target_id)?.title || 'Untitled'
                }));

            const incoming = (edges || [])
                .filter(e => e.target_id === note.id)
                .map(e => ({
                    ...e,
                    sourceTitle: noteMap.get(e.source_id)?.title || 'Untitled'
                }));

            connections[note.id] = { outgoing, incoming };
        }

        return json({
            notes: normalizedUserNotes,
            sharedWithMe: normalizedSharedNotes,
            friends,
            connections,
            profile: finalProfile,
            timestamp: Date.now()
        }, { headers: NO_STORE_HEADERS });
    } catch (error) {
        logNotesDataIssue('request_failed');
        return json(
            { error: 'Failed to fetch notes data' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
};
