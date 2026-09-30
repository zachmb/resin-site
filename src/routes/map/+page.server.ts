import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const CONNECTIONS_MARKER = "\n\n---\n**Map connections:**";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAP_NOTE_COLUMNS = 'id, user_id, raw_text, display_title, title, status, created_at, updated_at, is_on_map, position_x, position_y';
const MAP_EDGE_COLUMNS = 'id, user_id, source_id, target_id, connection_type, created_at';
const MAX_MAP_NOTES = 500;
const MAX_MAP_EDGES = 1000;
const MAX_REBUILT_CONNECTIONS = 200;

function logMapIssue(scope: string, error: unknown) {
    const issue = error as { code?: unknown; name?: unknown; message?: unknown };
    console.error(`[map] ${scope}`, {
        code: typeof issue?.code === 'string' ? issue.code : undefined,
        name: typeof issue?.name === 'string' ? issue.name : undefined,
        hasMessage: typeof issue?.message === 'string' && issue.message.length > 0
    });
}

function isValidUuid(value: FormDataEntryValue | null): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

function parseMapPosition(value: FormDataEntryValue | null) {
    if (typeof value !== 'string' || value.length > 32) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && Math.abs(parsed) <= 100000 ? parsed : null;
}

async function userOwnsNotes(supabase: any, userId: string, noteIds: string[]) {
    const uniqueIds = [...new Set(noteIds)];
    if (uniqueIds.length === 0) return false;

    const { data, error } = await supabase
        .from("amber_sessions")
        .select("id")
        .eq("user_id", userId)
        .in("id", uniqueIds);

    if (error) {
        logMapIssue('ownership_check_failed', error);
        return false;
    }

    return new Set((data || []).map((note: any) => note.id)).size === uniqueIds.length;
}

async function rebuildConnectionsSection(noteId: string, supabase: any, userId: string) {
    const [outRes, inRes] = await Promise.all([
        supabase.from("mind_map_edges").select("target_id").eq("source_id", noteId).eq("user_id", userId).limit(MAX_REBUILT_CONNECTIONS),
        supabase.from("mind_map_edges").select("source_id").eq("target_id", noteId).eq("user_id", userId).limit(MAX_REBUILT_CONNECTIONS),
    ]);

    const outIds = (outRes.data || []).map((e: any) => e.target_id);
    const inIds = (inRes.data || []).map((e: any) => e.source_id);
    const allIds = [...new Set([...outIds, ...inIds])];

    const { data: note } = await supabase
        .from("amber_sessions").select("raw_text")
        .eq("id", noteId).eq("user_id", userId).single();

    if (!note) return;

    let rawText: string = note.raw_text || "";
    const markerIndex = rawText.indexOf(CONNECTIONS_MARKER);
    if (markerIndex !== -1) rawText = rawText.slice(0, markerIndex);

    if (allIds.length === 0) {
        await supabase.from("amber_sessions").update({ raw_text: rawText })
            .eq("id", noteId).eq("user_id", userId);
        return;
    }

    const { data: connectedNotes } = await supabase
        .from("amber_sessions")
        .select("id, display_title")
        .eq("user_id", userId)
        .in("id", allIds);
    const titleMap = new Map((connectedNotes || []).map((n: any) => [n.id, n.display_title || "Untitled"]));

    const lines = [
        ...outIds.map((id: string) => `→ ${titleMap.get(id) || "Untitled"}`),
        ...inIds.map((id: string) => `← ${titleMap.get(id) || "Untitled"}`),
    ].join("\n");

    await supabase.from("amber_sessions")
        .update({ raw_text: rawText + CONNECTIONS_MARKER + " " + lines })
        .eq("id", noteId).eq("user_id", userId);
}

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getSession }, setHeaders }) => {
    const session = await getSession();
    if (!session) throw redirect(303, '/login');

    setHeaders({
        'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    const supabase = await getAuthenticatedSupabase();

    const [notesResponse, edgesResponse] = await Promise.all([
        supabase
            .from('amber_sessions')
            .select(MAP_NOTE_COLUMNS)
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(MAX_MAP_NOTES),
        supabase
            .from('mind_map_edges')
            .select(MAP_EDGE_COLUMNS)
            .eq('user_id', session.user.id)
            .limit(MAX_MAP_EDGES)
    ]);

    // Fetch connections with titles for each note
    const notes = (notesResponse.data || []).map((n: any) => ({
        ...n,
        title: n.display_title || n.title || 'Untitled Note',
        content: n.raw_text || n.content || ''
    }));

    const edges = edgesResponse.data || [];

    // Build connection metadata for each note
    const connections: Record<string, any> = {};
    const noteMap = new Map(notes.map(n => [n.id, n]));

    for (const note of notes) {
        const outgoing = edges
            .filter(e => e.source_id === note.id)
            .map(e => ({
                ...e,
                targetTitle: noteMap.get(e.target_id)?.title || 'Untitled',
                type: 'outgoing'
            }));

        const incoming = edges
            .filter(e => e.target_id === note.id)
            .map(e => ({
                ...e,
                sourceTitle: noteMap.get(e.source_id)?.title || 'Untitled',
                type: 'incoming'
            }));

        connections[note.id] = { outgoing, incoming };
    }

    return {
        notes,
        edges,
        connections
    };
};

export const actions: Actions = {
    updateNodePosition: async ({ request, locals: { getAuthenticatedSupabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const id = data.get('id');
        const x = parseMapPosition(data.get('position_x'));
        const y = parseMapPosition(data.get('position_y'));
        if (!isValidUuid(id) || x === null || y === null) {
            return fail(400, { error: 'Invalid map position' });
        }

        // We use is_on_map logic implicitly or explicitly if added to the DB.
        // For backwards compatibility without strict schema updates, we just update the coords
        const { error } = await supabase
            .from('amber_sessions')
            .update({ position_x: x, position_y: y, is_on_map: true })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            logMapIssue('save_node_position_failed', error);
            return fail(500, { error: 'Could not save node position' });
        }
        return { success: true };
    },

    removeFromMap: async ({ request, locals: { getAuthenticatedSupabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const id = data.get('id');
        if (!isValidUuid(id)) {
            return fail(400, { error: 'Invalid note' });
        }

        const { error } = await supabase
            .from('amber_sessions')
            .update({ is_on_map: false, position_x: null, position_y: null })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            logMapIssue('remove_from_map_failed', error);
            return fail(500, { error: 'Could not remove note from map' });
        }
        return { success: true, removedId: id };
    },

    createEdge: async ({ request, locals: { getAuthenticatedSupabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const source_id = data.get('source_id');
        const target_id = data.get('target_id');
        const connection_type = (data.get('connection_type') as string) || 'relates_to';
        if (!isValidUuid(source_id) || !isValidUuid(target_id) || source_id === target_id) {
            return fail(400, { error: 'Invalid connection' });
        }

        if (!(await userOwnsNotes(supabase, session.user.id, [source_id, target_id]))) {
            return fail(404, { error: 'Notes not found' });
        }

        const { data: edge, error } = await supabase
            .from('mind_map_edges')
            .insert({
                user_id: session.user.id,
                source_id,
                target_id,
                connection_type
            })
            .select(MAP_EDGE_COLUMNS)
            .single();

        if (error) {
            logMapIssue('create_edge_failed', error);
            return fail(500, { error: 'Could not create edge' });
        }

        // After successful insert, sync both notes' raw_text
        await Promise.all([
            rebuildConnectionsSection(source_id, supabase, session.user.id),
            rebuildConnectionsSection(target_id, supabase, session.user.id),
        ]);

        return { success: true, edge };
    },

    deleteEdge: async ({ request, locals: { getAuthenticatedSupabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const id = data.get('id');
        if (!isValidUuid(id)) {
            return fail(400, { error: 'Invalid connection' });
        }

        // Fetch before delete to get source/target
        const { data: edge } = await supabase
            .from('mind_map_edges').select('source_id, target_id')
            .eq('id', id).eq('user_id', session.user.id).single();

        const { error } = await supabase
            .from('mind_map_edges')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            logMapIssue('delete_edge_failed', error);
            return fail(500, { error: 'Could not delete edge' });
        }

        if (edge) {
            await Promise.all([
                rebuildConnectionsSection(edge.source_id, supabase, session.user.id),
                rebuildConnectionsSection(edge.target_id, supabase, session.user.id),
            ]);
        }
        return { success: true };
    },

    clearMap: async ({ locals: { getAuthenticatedSupabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const { error } = await supabase
            .from('amber_sessions')
            .update({ is_on_map: false, position_x: null, position_y: null })
            .eq('user_id', session.user.id)
            .eq('is_on_map', true);

        if (error) {
            logMapIssue('clear_map_failed', error);
            return fail(500, { error: 'Could not clear map' });
        }
        return { success: true };
    }
};
