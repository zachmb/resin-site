import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_GROUP_MEMBERS = 200;
const MAX_BOARD_NOTES = 200;
const MAX_GROUP_FOCUS_SESSIONS = 500;
const NOTE_COLORS = new Set(['amber', 'forest', 'earth', 'blue', 'purple', 'pink']);

function cleanText(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHARS_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : '';
}

function cleanNoteColor(value: unknown): string {
    return typeof value === 'string' && NOTE_COLORS.has(value) ? value : 'amber';
}

function parsePositiveInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

export const load: PageServerLoad = async ({ params, locals: { getAuthenticatedSupabase, getUser } }) => {
    const supabase = await getAuthenticatedSupabase();
    const user = await getUser();

    if (!user) {
        throw redirect(303, `/login?next=/groups/${params.id}`);
    }

    const groupId = params.id;

    // Verify user is a member of this group
    const { data: membership } = await supabase
        .from('focus_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        throw redirect(303, '/groups');
    }

    // Fetch group details (includes board_id)
    const { data: group } = await supabase
        .from('focus_groups')
        .select('id, name, description, board_id')
        .eq('id', groupId)
        .single();

    if (!group) {
        throw redirect(303, '/groups');
    }

    // Fetch group members with profiles
    const { data: members } = await supabase
        .from('focus_group_members')
        .select(`
            user_id,
            role,
            joined_at,
            profiles (
                id,
                username,
                full_name,
                total_stones,
                current_streak
            )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
        .limit(MAX_GROUP_MEMBERS);

    const memberList = (members || []).map((membership: any) => {
        const profile = Array.isArray(membership.profiles)
            ? membership.profiles[0]
            : membership.profiles;
        const displayName = cleanText(profile?.full_name, 80)
            || cleanText(profile?.username, 80)
            || 'Member';

        return {
            userId: membership.user_id,
            role: membership.role,
            joinedAt: membership.joined_at,
            displayName,
            totalStones: Number.isFinite(profile?.total_stones) ? profile.total_stones : 0,
            currentStreak: Number.isFinite(profile?.current_streak) ? profile.current_streak : 0
        };
    });

    // ==================== NOTES TAB ====================
    // Fetch board notes for the group's note board
    const { data: notes } = await supabase
        .from('board_notes')
        .select(`
            id,
            title,
            content,
            color,
            created_at,
            profiles!board_notes_user_id_fkey (
                username,
                full_name
            )
        `)
        .eq('board_id', group.board_id)
        .order('created_at', { ascending: false })
        .limit(MAX_BOARD_NOTES);

    const boardNotes = (notes || []).map((note: any) => {
        const profile = Array.isArray(note.profiles) ? note.profiles[0] : note.profiles;
        return {
            id: note.id,
            title: note.title,
            content: note.content,
            color: note.color,
            created_at: note.created_at,
            authorName: cleanText(profile?.full_name, 80)
                || cleanText(profile?.username, 80)
                || 'Member'
        };
    });

    // ==================== FOCUS TAB ====================
    // Fetch all focus sessions with participants
    const { data: fetchedFocusSessions } = await supabase
        .from('group_focus_sessions')
        .select(`
            id,
            title,
            start_time,
            duration_minutes,
            status,
            group_session_participants(user_id, joined_at, left_at)
        `)
        .eq('group_id', groupId)
        .in('status', ['scheduled', 'active', 'completed', 'cancelled'])
        .order('start_time', { ascending: true })
        .limit(MAX_GROUP_FOCUS_SESSIONS);

    const focusSessions = (fetchedFocusSessions || []).map((focusSession) => ({
        ...focusSession,
        group_session_participants: (focusSession.group_session_participants || []).filter(
            (participant: any) => participant.left_at === null
        )
    }));

    // Shared forest progress comes only from activity explicitly shared with
    // this group. Never expose members' private Amber plans or task details.
    const memberSessionCounts: Record<string, number> = Object.fromEntries(
        memberList.map((member) => [member.userId, 0])
    );
    for (const focusSession of focusSessions || []) {
        if (focusSession.status !== 'completed') continue;
        const participantIds = new Set(
            (focusSession.group_session_participants || []).map((participant: any) => participant.user_id)
        );
        for (const participantId of participantIds) {
            if (participantId in memberSessionCounts) {
                memberSessionCounts[participantId] += 1;
            }
        }
    }

    const nowMs = Date.now();
    const activeFocusSessions = (focusSessions || []).filter(s => s.status === 'active');
    const scheduledFocusSessions = (focusSessions || []).filter(
        s => s.status === 'scheduled' && new Date(s.start_time).getTime() > nowMs
    );
    const missedFocusSessions = (focusSessions || []).filter(
        s => s.status === 'scheduled' && new Date(s.start_time).getTime() <= nowMs
    );

    return {
        group,
        members: memberList,
        notes: boardNotes,
        memberSessionCounts,
        focusSessions: focusSessions || [],
        scheduledFocusSessions,
        missedFocusSessions,
        activeFocusSessions,
        currentUserId: user.id,
        userRole: membership.role
    };
};

export const actions: Actions = {
    // ==================== NOTES ACTIONS ====================
    addNote: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify membership
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!membership) return fail(403, { error: 'Not a member of this group' });

        // Get group and board_id
        const { data: group } = await supabase
            .from('focus_groups')
            .select('board_id')
            .eq('id', groupId)
            .single();

        if (!group?.board_id) return fail(500, { error: 'Group board not found' });

        const data = await request.formData();
        const title = cleanText(data.get('title'), MAX_TITLE_LENGTH);
        const content = cleanText(data.get('content'), MAX_CONTENT_LENGTH);
        const color = cleanNoteColor(data.get('color'));

        const { error } = await supabase
            .from('board_notes')
            .insert({
                board_id: group.board_id,
                user_id: user.id,
                title,
                content,
                color
            });

        if (error) {
            console.error('[groups] Error adding note');
            return fail(500, { error: 'Failed to add note' });
        }

        return { success: true };
    },

    updateNote: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify admin
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (membership?.role !== 'admin') return fail(403, { error: 'Only admins can edit notes' });

        const data = await request.formData();
        const noteId = data.get('id')?.toString();
        const title = cleanText(data.get('title'), MAX_TITLE_LENGTH);
        const content = cleanText(data.get('content'), MAX_CONTENT_LENGTH);
        const color = cleanNoteColor(data.get('color'));
        if (!noteId || !UUID_RE.test(noteId)) return fail(400, { error: 'Invalid note ID' });

        const { data: group } = await supabase
            .from('focus_groups')
            .select('board_id')
            .eq('id', groupId)
            .single();
        if (!group?.board_id) return fail(500, { error: 'Group board not found' });

        const { error } = await supabase
            .from('board_notes')
            .update({ title, content, color })
            .eq('id', noteId)
            .eq('board_id', group.board_id);

        if (error) {
            console.error('[groups] Error updating note');
            return fail(500, { error: 'Failed to update note' });
        }

        return { success: true };
    },

    deleteNote: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify membership
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (membership?.role !== 'admin') return fail(403, { error: 'Only admins can delete notes' });

        const data = await request.formData();
        const noteId = data.get('id')?.toString();
        if (!noteId || !UUID_RE.test(noteId)) return fail(400, { error: 'Invalid note ID' });

        const { data: group } = await supabase
            .from('focus_groups')
            .select('board_id')
            .eq('id', groupId)
            .single();
        if (!group?.board_id) return fail(500, { error: 'Group board not found' });

        const { error } = await supabase
            .from('board_notes')
            .delete()
            .eq('id', noteId)
            .eq('board_id', group.board_id);

        if (error) {
            console.error('[groups] Error deleting note');
            return fail(500, { error: 'Failed to delete note' });
        }

        return { success: true };
    },

    // ==================== INVITE ACTIONS ====================
    generateGroupInvite: async ({ params, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify admin
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return fail(403, { error: 'Only admins can generate invites' });
        }

        // Create invite link
        const { data: invite, error } = await supabase
            .from('group_invites')
            .insert({
                group_id: groupId,
                created_by: user.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                max_uses: 100,
                uses_count: 0
            })
            .select('token')
            .single();

        if (error) {
            console.error('[groups] Error creating invite');
            return fail(500, { error: 'Failed to generate invite link' });
        }

        return {
            success: true,
            token: invite.token,
            inviteUrl: `/groups/${groupId}/join?token=${invite.token}`
        };
    },

    // ==================== FOCUS SESSION ACTIONS ====================
    scheduleSession: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Match the admin-only scheduling controls enforced by the UI.
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return fail(403, { error: 'Only admins can schedule sessions' });
        }

        const data = await request.formData();
        const title = cleanText(data.get('title'), MAX_TITLE_LENGTH);
        const description = cleanText(data.get('description'), MAX_DESCRIPTION_LENGTH) || null;
        const startTime = data.get('start_time')?.toString();
        const durationMinutes = parsePositiveInt(data.get('duration_minutes'), 30, 1, 480);
        const maxParticipants = parsePositiveInt(data.get('max_participants'), 999, 1, 999);

        if (!title || !startTime) {
            return fail(400, { error: 'Title and start time are required' });
        }

        const { error } = await supabase
            .from('group_focus_sessions')
            .insert({
                group_id: groupId,
                created_by: user.id,
                title,
                description,
                start_time: startTime,
                duration_minutes: durationMinutes,
                max_participants: maxParticipants,
                status: 'scheduled'
            });

        if (error) {
            console.error('[groups] Error scheduling session');
            return fail(500, { error: 'Failed to schedule session' });
        }

        return { success: true };
    },

    startNowSession: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Match the admin-only start controls enforced by the UI.
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return fail(403, { error: 'Only admins can start sessions' });
        }

        const data = await request.formData();
        const title = cleanText(data.get('title'), MAX_TITLE_LENGTH) || 'Group Focus Session';
        const description = cleanText(data.get('description'), MAX_DESCRIPTION_LENGTH) || null;
        const durationMinutes = parsePositiveInt(data.get('duration_minutes'), 25, 1, 480);

        const { data: focusSession, error } = await supabase
            .from('group_focus_sessions')
            .insert({
                group_id: groupId,
                created_by: user.id,
                title,
                description,
                start_time: new Date().toISOString(),
                duration_minutes: durationMinutes,
                max_participants: 999,
                status: 'active'
            })
            .select('id')
            .single();

        if (error || !focusSession) {
            console.error('[groups] Error starting session');
            return fail(500, { error: 'Failed to start session' });
        }

        const { error: participantError } = await supabase
            .from('group_session_participants')
            .insert({
                session_id: focusSession.id,
                user_id: user.id,
                joined_at: new Date().toISOString()
            });

        if (participantError) {
            await supabase
                .from('group_focus_sessions')
                .delete()
                .eq('id', focusSession.id)
                .eq('group_id', groupId)
                .eq('created_by', user.id);
            console.error('[groups] Error joining newly started session');
            return fail(500, { error: 'Failed to start session' });
        }

        return { success: true };
    },

    joinSession: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('session_id')?.toString();

        if (!sessionId || !UUID_RE.test(sessionId)) return fail(400, { error: 'Session ID is required' });

        const groupId = params.id;
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();
        if (!membership) return fail(403, { error: 'Not a member of this group' });

        const { data: focusSession } = await supabase
            .from('group_focus_sessions')
            .select('id, max_participants')
            .eq('id', sessionId)
            .eq('group_id', groupId)
            .in('status', ['scheduled', 'active'])
            .single();
        if (!focusSession) return fail(404, { error: 'Session not found' });

        // Check if already joined
        const { data: existingParticipant } = await supabase
            .from('group_session_participants')
            .select('id, left_at')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingParticipant && !existingParticipant.left_at) {
            return fail(400, { error: 'You are already in this session' });
        }

        const { count: participantCount, error: countError } = await supabase
            .from('group_session_participants')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .is('left_at', null);

        if (countError) {
            console.error('[groups] Error checking session capacity');
            return fail(500, { error: 'Failed to join session' });
        }
        if ((participantCount ?? 0) >= focusSession.max_participants) {
            return fail(409, { error: 'This session is full' });
        }

        const joinedAt = new Date().toISOString();
        const { error } = existingParticipant
            ? await supabase
                .from('group_session_participants')
                .update({ joined_at: joinedAt, left_at: null })
                .eq('id', existingParticipant.id)
                .eq('session_id', sessionId)
                .eq('user_id', user.id)
            : await supabase
                .from('group_session_participants')
                .insert({
                    session_id: sessionId,
                    user_id: user.id,
                    joined_at: joinedAt
                });

        if (error) {
            console.error('[groups] Error joining session');
            return fail(500, { error: 'Failed to join session' });
        }

        return { success: true };
    },

    leaveSession: async ({ params, request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const supabase = await getAuthenticatedSupabase();
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('session_id')?.toString();

        if (!sessionId || !UUID_RE.test(sessionId)) return fail(400, { error: 'Session ID is required' });

        const groupId = params.id;
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();
        if (!membership) return fail(403, { error: 'Not a member of this group' });

        const { data: focusSession } = await supabase
            .from('group_focus_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('group_id', groupId)
            .in('status', ['scheduled', 'active'])
            .single();
        if (!focusSession) return fail(409, { error: 'This session can no longer be left' });

        const { error } = await supabase
            .from('group_session_participants')
            .update({ left_at: new Date().toISOString() })
            .eq('session_id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('[groups] Error leaving session');
            return fail(500, { error: 'Failed to leave session' });
        }

        return { success: true };
    }
};
