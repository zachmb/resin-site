import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
    const session = await getSession();

    if (!session) {
        throw redirect(303, '/login?next=/groups');
    }

    // Fetch user's groups
    const { data: userGroups } = await supabase
        .from('focus_group_members')
        .select(`
            group_id,
            role,
            joined_at,
            focus_groups (
                id,
                name,
                description,
                created_by,
                created_at
            )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false });

    const groups = (userGroups || []).map((ug: any) => ({
        ...ug.focus_groups,
        userRole: ug.role,
        joinedAt: ug.joined_at
    }));

    // For each group, fetch member profiles
    const groupsWithMembers = await Promise.all(
        groups.map(async (group: any) => {
            const { data: members } = await supabase
                .from('focus_group_members')
                .select(`
                    user_id,
                    role,
                    profiles (
                        id,
                        email,
                        total_stones,
                        current_streak
                    )
                `)
                .eq('group_id', group.id);

            return {
                ...group,
                members: (members || []).map((m: any) => ({
                    userId: m.user_id,
                    role: m.role,
                    ...m.profiles
                }))
            };
        })
    );

    return {
        groups: groupsWithMembers
    };
};
