import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, `/login?next=/groups/${params.id}`);
    }

    const groupId = params.id;

    // Verify user is a member of this group
    const { data: membership } = await supabase
        .from('focus_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', session.user.id)
        .single();

    if (!membership) {
        throw redirect(303, '/groups');
    }

    // Fetch group details
    const { data: group } = await supabase
        .from('focus_groups')
        .select('*')
        .eq('id', groupId)
        .single();

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

    // Fetch active challenges for this group
    const { data: challenges } = await supabase
        .from('group_challenges')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

    // Compute challenge progress for each member
    const challengeProgress: any = {};
    if (challenges && challenges.length > 0) {
        for (const challenge of challenges) {
            challengeProgress[challenge.id] = {};
            for (const member of memberList) {
                let progress = 0;
                if (challenge.metric === 'sessions_completed') {
                    // Count completed sessions in the challenge window
                    const { count } = await supabase
                        .from('amber_sessions')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', member.userId)
                        .eq('status', 'completed')
                        .gte('created_at', challenge.start_at)
                        .lte('created_at', challenge.end_at || new Date().toISOString());
                    progress = count || 0;
                } else if (challenge.metric === 'stones') {
                    progress = member.total_stones || 0;
                } else if (challenge.metric === 'streak') {
                    progress = member.current_streak || 0;
                }
                challengeProgress[challenge.id][member.userId] = progress;
            }
        }
    }

    // Sort members by stones for leaderboard
    const sortedMembers = [...memberList].sort((a, b) => (b.total_stones || 0) - (a.total_stones || 0));

    return {
        group,
        members: memberList,
        sortedMembers,
        challenges: challenges || [],
        challengeProgress,
        userRole: membership.role
    };
};

export const actions: Actions = {
    invite: async ({ params, request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify user is admin of this group
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', session.user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return fail(403, { error: 'Only admins can invite members' });
        }

        const data = await request.formData();
        const email = data.get('email')?.toString()?.toLowerCase();

        if (!email) {
            return fail(400, { error: 'Email is required' });
        }

        // Find user by email
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (!profile) {
            return fail(404, { error: 'User not found' });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('focus_group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .eq('user_id', profile.id)
            .single();

        if (existingMember) {
            return fail(400, { error: 'User is already a member of this group' });
        }

        // Add user to group
        const { error: insertError } = await supabase
            .from('focus_group_members')
            .insert({
                group_id: groupId,
                user_id: profile.id,
                role: 'member'
            });

        if (insertError) {
            console.error('Error inviting member:', insertError);
            return fail(500, { error: 'Failed to invite member' });
        }

        return { success: true, message: `${email} has been added to the group` };
    },
    createChallenge: async ({ params, request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const groupId = params.id;

        // Verify user is admin of this group
        const { data: membership } = await supabase
            .from('focus_group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', session.user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return fail(403, { error: 'Only admins can create challenges' });
        }

        const formData = await request.formData();
        const title = formData.get('title')?.toString();
        const description = formData.get('description')?.toString() || null;
        const metric = formData.get('metric')?.toString() || 'sessions_completed';
        const targetValue = parseInt(formData.get('target_value')?.toString() || '5');
        const endAt = formData.get('end_at')?.toString();

        if (!title || !metric) {
            return fail(400, { error: 'Title and metric are required' });
        }

        const { error: insertError } = await supabase
            .from('group_challenges')
            .insert({
                group_id: groupId,
                title,
                description,
                metric,
                target_value: targetValue,
                end_at: endAt || null,
                created_by: session.user.id
            });

        if (insertError) {
            console.error('Error creating challenge:', insertError);
            return fail(500, { error: 'Failed to create challenge' });
        }

        return { success: true, message: 'Challenge created successfully' };
    }
};
