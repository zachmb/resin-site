import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const CONNECTIONS_MARKER = "\n\n---\n**Map connections:**";

async function rebuildConnectionsSection(noteId: string, supabase: any, userId: string) {
    const [outRes, inRes] = await Promise.all([
        supabase.from("mind_map_edges").select("target_id").eq("source_id", noteId).eq("user_id", userId),
        supabase.from("mind_map_edges").select("source_id").eq("target_id", noteId).eq("user_id", userId),
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
        .from("amber_sessions").select("id, display_title").in("id", allIds);
    const titleMap = new Map((connectedNotes || []).map((n: any) => [n.id, n.display_title || "Untitled"]));

    const lines = [
        ...outIds.map((id: string) => `→ ${titleMap.get(id) || "Untitled"}`),
        ...inIds.map((id: string) => `← ${titleMap.get(id) || "Untitled"}`),
    ].join("\n");

    await supabase.from("amber_sessions")
        .update({ raw_text: rawText + CONNECTIONS_MARKER + " " + lines })
        .eq("id", noteId).eq("user_id", userId);
}

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();
    if (!session) throw redirect(303, '/login');

    const [notesResponse, edgesResponse] = await Promise.all([
        supabase
            .from('amber_sessions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('mind_map_edges')
            .select('*')
            .eq('user_id', session.user.id)
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
    updateNodePosition: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;
        const x = parseFloat(data.get('position_x') as string);
        const y = parseFloat(data.get('position_y') as string);

        // We use is_on_map logic implicitly or explicitly if added to the DB.
        // For backwards compatibility without strict schema updates, we just update the coords
        const { error } = await supabase
            .from('amber_sessions')
            .update({ position_x: x, position_y: y, is_on_map: true })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error saving node position:', error);
            return fail(500, { error: 'Could not save node position' });
        }
        return { success: true };
    },

    removeFromMap: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;

        const { error } = await supabase
            .from('amber_sessions')
            .update({ is_on_map: false, position_x: null, position_y: null })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error removing note from map:', error);
            return fail(500, { error: 'Could not remove note from map' });
        }
        return { success: true, removedId: id };
    },

    createEdge: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const source_id = data.get('source_id') as string;
        const target_id = data.get('target_id') as string;
        const connection_type = (data.get('connection_type') as string) || 'relates_to';

        const { data: edge, error } = await supabase
            .from('mind_map_edges')
            .insert({
                user_id: session.user.id,
                source_id,
                target_id,
                connection_type
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating edge:', error);
            return fail(500, { error: 'Could not create edge' });
        }

        // After successful insert, sync both notes' raw_text
        await Promise.all([
            rebuildConnectionsSection(source_id, supabase, session.user.id),
            rebuildConnectionsSection(target_id, supabase, session.user.id),
        ]);

        return { success: true, edge };
    },

    deleteEdge: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const id = data.get('id') as string;

        // Fetch before delete to get source/target
        const { data: edge } = await supabase
            .from('mind_map_edges').select('source_id, target_id')
            .eq('id', id).eq('user_id', session.user.id).single();

        const { error } = await supabase
            .from('mind_map_edges')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) return fail(500, { error: 'Could not delete edge' });

        if (edge) {
            await Promise.all([
                rebuildConnectionsSection(edge.source_id, supabase, session.user.id),
                rebuildConnectionsSection(edge.target_id, supabase, session.user.id),
            ]);
        }
        return { success: true };
    },

    clearMap: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const { error } = await supabase
            .from('amber_sessions')
            .update({ is_on_map: false, position_x: null, position_y: null })
            .eq('user_id', session.user.id)
            .eq('is_on_map', true);

        if (error) return fail(500, { error: 'Could not clear map' });
        return { success: true };
    }
};
