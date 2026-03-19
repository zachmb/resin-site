import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { generateForestTrees } from '$lib/forestGenerator';

export const load: PageServerLoad = async ({ params, locals: { supabase, getUser } }) => {
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
        .select('*')
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
                email,
                total_stones,
                current_streak
            )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

    const memberList = (members || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        ...m.profiles
    }));

    // ==================== NOTES TAB ====================
    // Fetch board notes for the group's note board
    const { data: notes } = await supabase
        .from('board_notes')
        .select(`
            *,
            profiles!board_notes_user_id_fkey (
                email
            )
        `)
        .eq('board_id', group.board_id)
        .order('created_at', { ascending: false });

    // ==================== FOREST TAB ====================
    // Fetch all members' amber sessions to build shared forest
    const memberUserIds = memberList.map(m => m.userId);
    const { data: allSessions } = await supabase
        .from('amber_sessions')
        .select(`
            *,
            amber_tasks(estimated_minutes, start_time, end_time)
        `)
        .in('user_id', memberUserIds)
        .not('status', 'in', '("draft","failed")')
        .order('created_at', { ascending: false });

    // Build member sessions map: userId -> ForestTreeData[]
    const memberSessionsMap: Record<string, any[]> = {};
    for (const member of memberList) {
        const memberSessions = (allSessions || [])
            .filter(s => s.user_id === member.userId)
            .map(s => ({
                ...s,
                focusMinutes: (s.amber_tasks || []).reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0)
            }));
        memberSessionsMap[member.userId] = generateForestTrees(memberSessions, 100);
    }

    // ==================== FOCUS TAB ====================
    // Fetch focus sessions for this group
    const now = new Date().toISOString();

    // Auto-activate any scheduled sessions whose start_time has passed
    const { data: scheduledSessions } = await supabase
        .from('group_focus_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'scheduled')
        .lte('start_time', now);

    if (scheduledSessions && scheduledSessions.length > 0) {
        const sessionIds = scheduledSessions.map((s: any) => s.id);
        await supabase
            .from('group_focus_sessions')
            .update({ status: 'active' })
            .in('id', sessionIds);
    }

    // Fetch all focus sessions with participants
    const { data: focusSessions } = await supabase
        .from('group_focus_sessions')
        .select(`
            *,
            group_session_participants(user_id, joined_at, left_at)
        `)
        .eq('group_id', groupId)
        .in('status', ['scheduled', 'active', 'completed', 'cancelled'])
        .order('start_time', { ascending: true });

    // Separate into scheduled and active
    const scheduledFocusSessions = (focusSessions || []).filter(s => s.status === 'scheduled');
    const activeFocusSessions = (focusSessions || []).filter(s => s.status === 'active');

    return {
        group,
        members: memberList,
        notes: notes || [],
        memberSessionsMap,
        focusSessions: focusSessions || [],
        scheduledFocusSessions,
        activeFocusSessions,
        currentUserId: user.id,
        userRole: membership.role
    };
};

export const actions: Actions = {
    // ==================== NOTES ACTIONS ====================
    addNote: async ({ params, request, locals: { supabase, getUser } }) => {
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
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const color = data.get('color')?.toString() || 'amber';

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
            console.error('[groups] Error adding note:', error);
            return fail(500, { error: 'Failed to add note' });
        }

        return { success: true };
    },

    updateNote: async ({ params, request, locals: { supabase, getUser } }) => {
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

        if (membership?.role !== 'admin') return fail(403, { error: 'Only admins can edit notes' });

        const data = await request.formData();
        const noteId = data.get('id')?.toString();
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const color = data.get('color')?.toString() || 'amber';

        const { error } = await supabase
            .from('board_notes')
            .update({ title, content, color })
            .eq('id', noteId);

        if (error) {
            console.error('[groups] Error updating note:', error);
            return fail(500, { error: 'Failed to update note' });
        }

        return { success: true };
    },

    deleteNote: async ({ params, request, locals: { supabase, getUser } }) => {
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

        const { error } = await supabase
            .from('board_notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error('[groups] Error deleting note:', error);
            return fail(500, { error: 'Failed to delete note' });
        }

        return { success: true };
    },

    // ==================== INVITE ACTIONS ====================
    generateGroupInvite: async ({ params, locals: { supabase, getUser } }) => {
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
            .select()
            .single();

        if (error) {
            console.error('[groups] Error creating invite:', error);
            return fail(500, { error: 'Failed to generate invite link' });
        }

        return {
            success: true,
            token: invite.token,
            inviteUrl: `/groups/${groupId}/join?token=${invite.token}`
        };
    },

    // ==================== FOCUS SESSION ACTIONS ====================
    scheduleSession: async ({ params, request, locals: { supabase, getUser } }) => {
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

        const data = await request.formData();
        const title = data.get('title')?.toString();
        const description = data.get('description')?.toString() || null;
        const startTime = data.get('start_time')?.toString();
        const durationMinutes = parseInt(data.get('duration_minutes')?.toString() || '30');
        const maxParticipants = parseInt(data.get('max_participants')?.toString() || '999');

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
            console.error('[groups] Error scheduling session:', error);
            return fail(500, { error: 'Failed to schedule session' });
        }

        return { success: true };
    },

    startNowSession: async ({ params, request, locals: { supabase, getUser } }) => {
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

        const data = await request.formData();
        const title = data.get('title')?.toString() || 'Group Focus Session';
        const description = data.get('description')?.toString() || null;
        const durationMinutes = parseInt(data.get('duration_minutes')?.toString() || '25');

        const { error } = await supabase
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
            });

        if (error) {
            console.error('[groups] Error starting session:', error);
            return fail(500, { error: 'Failed to start session' });
        }

        return { success: true };
    },

    joinSession: async ({ params, request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('session_id')?.toString();

        if (!sessionId) return fail(400, { error: 'Session ID is required' });

        // Check if already joined
        const { data: existingParticipant } = await supabase
            .from('group_session_participants')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (existingParticipant) {
            return fail(400, { error: 'You are already in this session' });
        }

        const { error } = await supabase
            .from('group_session_participants')
            .insert({
                session_id: sessionId,
                user_id: user.id,
                joined_at: new Date().toISOString()
            });

        if (error) {
            console.error('[groups] Error joining session:', error);
            return fail(500, { error: 'Failed to join session' });
        }

        return { success: true };
    },

    leaveSession: async ({ params, request, locals: { supabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const sessionId = data.get('session_id')?.toString();

        if (!sessionId) return fail(400, { error: 'Session ID is required' });

        const { error } = await supabase
            .from('group_session_participants')
            .update({ left_at: new Date().toISOString() })
            .eq('session_id', sessionId)
            .eq('user_id', user.id);

        if (error) {
            console.error('[groups] Error leaving session:', error);
            return fail(500, { error: 'Failed to leave session' });
        }

        return { success: true };
    }
};
