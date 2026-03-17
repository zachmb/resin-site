/**
 * Achievement definitions — safe for client use (no server-only imports)
 * Shared between web and iOS gamification systems
 */

export interface AchievementContext {
    totalSessions: number;
    currentStreak: number;
    totalStones: number;
    unlockedSpeciesCount: number;
    forestHealth: number;
    sessionHour?: number; // 0-23
    hasSaturdaySession: boolean;
    hasSundaySession: boolean;
}

export interface AchievementDefinition {
    id: string;
    name: string;
    description: string;
    icon: string; // lucide icon key
    check: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first session',
        icon: 'sprout',
        check: (ctx) => ctx.totalSessions >= 1,
    },
    {
        id: 'steady',
        name: 'Steady',
        description: '3-day streak',
        icon: 'flame',
        check: (ctx) => ctx.currentStreak >= 3,
    },
    {
        id: 'week_streak',
        name: 'Week Streak',
        description: '7-day streak',
        icon: 'flame',
        check: (ctx) => ctx.currentStreak >= 7,
    },
    {
        id: 'fortnight',
        name: 'Fortnight',
        description: '14-day streak',
        icon: 'flame',
        check: (ctx) => ctx.currentStreak >= 14,
    },
    {
        id: 'monthly_dedication',
        name: 'Monthly Dedication',
        description: '30-day streak',
        icon: 'trophy',
        check: (ctx) => ctx.currentStreak >= 30,
    },
    {
        id: 'centurion',
        name: 'Centurion',
        description: '100-day streak',
        icon: 'crown',
        check: (ctx) => ctx.currentStreak >= 100,
    },
    {
        id: 'stone_collector',
        name: 'Stone Collector',
        description: 'Earn 50 stones',
        icon: 'gem',
        check: (ctx) => ctx.totalStones >= 50,
    },
    {
        id: 'stone_hoarder',
        name: 'Stone Hoarder',
        description: 'Earn 250 stones',
        icon: 'gem',
        check: (ctx) => ctx.totalStones >= 250,
    },
    {
        id: 'rich_in_stone',
        name: 'Rich in Stone',
        description: 'Earn 1000 stones',
        icon: 'diamond',
        check: (ctx) => ctx.totalStones >= 1000,
    },
    {
        id: 'gardener',
        name: 'Gardener',
        description: 'Unlock 20 tree species',
        icon: 'leaf',
        check: (ctx) => ctx.unlockedSpeciesCount >= 20,
    },
    {
        id: 'forest_keeper',
        name: 'Forest Keeper',
        description: 'Maintain 80%+ forest health',
        icon: 'tree',
        check: (ctx) => ctx.forestHealth >= 80,
    },
    {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Complete a session after 10 PM',
        icon: 'sparkles',
        check: (ctx) => (ctx.sessionHour ?? -1) >= 22,
    },
    {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete a session before 7 AM',
        icon: 'sun',
        check: (ctx) => (ctx.sessionHour ?? 24) < 7,
    },
    {
        id: 'weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Sessions on both Saturday and Sunday',
        icon: 'zap',
        check: (ctx) => ctx.hasSaturdaySession && ctx.hasSundaySession,
    },
    {
        id: 'prolific',
        name: 'Prolific',
        description: '100 total sessions',
        icon: 'star',
        check: (ctx) => ctx.totalSessions >= 100,
    },
];

/**
 * Lucide icon to emoji fallback mapping for quick display
 * Used where lucide components aren't available
 */
export const ACHIEVEMENT_ICON_EMOJI: Record<string, string> = {
    sprout: '🌱',
    flame: '🔥',
    trophy: '🏆',
    crown: '👑',
    gem: '💎',
    diamond: '💠',
    leaf: '🍃',
    tree: '🌲',
    sparkles: '✨',
    sun: '🌅',
    zap: '⚡',
    star: '⭐',
};
