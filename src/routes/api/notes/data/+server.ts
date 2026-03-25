import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { getUser, getAuthenticatedSupabase } }) => {
    try {
        const user = await getUser();
        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const supabase = await getAuthenticatedSupabase();

        // Helper functions from notes +page.server.ts
        const extractTitle = (content: string) => {
            if (!content || !content.trim()) return null;
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed !== '#') {
                    return trimmed.replace(/^#+\s*/, '').substring(0, 60);
                }
            }
            return null;
        };

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
            .select('id, username, full_name, avatar_url, total_stones, current_streak')
            .eq('id', userId)
            .single();

        let finalProfile = profile;
        if (profileError) {
            console.warn('[api/notes/data] Initial profile fetch failed, retrying with minimal columns:', profileError.message);
            const { data: minimalProfile } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', userId)
                .single();
            finalProfile = minimalProfile ? { 
                ...minimalProfile, 
                total_stones: null, 
                current_streak: null 
            } as any : null;
        }

        // Fetch shared notes
        const { data: sharedNotes } = await supabase
            .from('shared_notes')
            .select('note_id, owner_id, amber_sessions!inner(id, raw_text, display_title, status, user_id, created_at)')
            .eq('shared_with_id', userId);

        const normalizedSharedNotes = (sharedNotes || []).map((share: any) => {
            const note = share.amber_sessions;
            return {
                id: note.id,
                user_id: note.user_id,
                title: note.display_title ?? '',
                content: note.raw_text ?? '',
                status: note.status,
                owner_id: share.owner_id,
                shared_note_id: share.id,
                created_at: note.created_at
            };
        });

        // Fetch friends
        const { data: friendships } = await supabase
            .from('friendships')
            .select('id, requester_id, addressee_id, status')
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
            .eq('status', 'accepted');

        const friends = await Promise.all(
            (friendships || []).map(async (friendship: any) => {
                const otherId =
                    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', otherId)
                    .single();

                return {
                    id: otherId,
                    friendship_id: friendship.id
                };
            })
        );

        // Fetch mind map edges
        const { data: edges } = await supabase
            .from('mind_map_edges')
            .select('*')
            .eq('user_id', userId);

        // Fetch user's notes
        const { data: userNotes, error: notesError } = await supabase
            .from('amber_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (notesError) {
            console.error('[api/notes/data] Error fetching user notes:', notesError);
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
        });
    } catch (error) {
        console.error('[api/notes/data] Error:', error);
        return json(
            { error: 'Failed to fetch notes data' },
            { status: 500 }
        );
    }
};
