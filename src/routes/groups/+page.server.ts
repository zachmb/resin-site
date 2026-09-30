import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const MAX_GROUPS = 100;
const MAX_GROUP_MEMBERS = 100;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;

function cleanDisplayName(value: unknown): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHARS_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
        : '';
}

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getUser } }) => {
    const supabase = await getAuthenticatedSupabase();
    const user = await getUser();

    if (!user) {
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
                description
            )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(MAX_GROUPS);

    const groups = (userGroups || []).map((membership: any) => {
        const group = Array.isArray(membership.focus_groups)
            ? membership.focus_groups[0]
            : membership.focus_groups;
        return {
            id: group?.id,
            name: group?.name,
            description: group?.description,
            userRole: membership.role,
            joinedAt: membership.joined_at
        };
    }).filter((group) => group.id);

    // For each group, fetch member profiles
    const groupsWithMembers = await Promise.all(
        groups.map(async (group: any) => {
            const { data: members } = await supabase
                .from('focus_group_members')
                .select(`
                    user_id,
                    role,
                    profiles (
                        username,
                        full_name,
                        total_stones,
                        current_streak
                    )
                `)
                .eq('group_id', group.id)
                .limit(MAX_GROUP_MEMBERS);

            return {
                ...group,
                members: (members || []).map((membership: any) => {
                    const profile = Array.isArray(membership.profiles)
                        ? membership.profiles[0]
                        : membership.profiles;
                    return {
                        userId: membership.user_id,
                        role: membership.role,
                        displayName: cleanDisplayName(profile?.full_name)
                            || cleanDisplayName(profile?.username)
                            || 'Member',
                        totalStones: Number.isFinite(profile?.total_stones) ? profile.total_stones : 0,
                        currentStreak: Number.isFinite(profile?.current_streak) ? profile.current_streak : 0
                    };
                })
            };
        })
    );

    return {
        groups: groupsWithMembers
    };
};
