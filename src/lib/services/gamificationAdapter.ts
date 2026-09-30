/**
 * Supabase adapter for @resin/core
 *
 * Implements DatabaseAdapter interface so resin-core's database-aware functions
 * can work with Supabase
 */

import { adminClient } from '$lib/server/auth';
import type { DatabaseAdapter } from '@resin/core';

const MAX_GAMIFICATION_SESSION_DATES = 5000;

interface GameState {
    totalStones: number;
    currentStreak: number;
    longestStreak: number;
    longestStreakAt: string | null;
    forestHealth: number;
    lastSessionDate: Date | null;
    lastActiveDate: Date | null;
    timezone: string;
    sesionsCompletedCount: number;
}

/**
 * Create a Supabase-based database adapter for @resin/core
 */
export function createSupabaseGamificationAdapter(): DatabaseAdapter {
    return {
        async fetchUserProfile(userId: string) {
            const { data: profile, error } = await adminClient
                .from('profiles')
                .select('total_stones, current_streak, longest_streak, longest_streak_at, forest_health, last_session_date, last_active_date, timezone, sessions_completed_count')
                .eq('id', userId)
                .single();

            if (error || !profile) return null;

            return {
                totalStones: profile.total_stones || 0,
                currentStreak: profile.current_streak || 0,
                longestStreak: profile.longest_streak || 0,
                longestStreakAt: profile.longest_streak_at || null,
                forestHealth: profile.forest_health || 100,
                lastSessionDate: profile.last_session_date ? new Date(profile.last_session_date) : null,
                lastActiveDate: profile.last_active_date ? new Date(profile.last_active_date) : null,
                timezone: profile.timezone || 'UTC',
                sesionsCompletedCount: profile.sessions_completed_count || 0
            };
        },

        async fetchSessionCount(userId: string): Promise<number> {
            const { count, error } = await adminClient
                .from('amber_sessions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed');

            if (error) {
                console.error('[GamificationAdapter] Error counting sessions');
                return 0;
            }

            return count || 0;
        },

        async fetchSessionDates(userId: string): Promise<string[]> {
            const { data: sessions, error } = await adminClient
                .from('amber_sessions')
                .select('created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(MAX_GAMIFICATION_SESSION_DATES);

            if (error || !sessions) return [];

            return sessions
                .map(s => {
                    const d = new Date(s.created_at);
                    if (Number.isNaN(d.getTime())) return null;
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                })
                .filter(Boolean)
                .reverse() as string[];
        },

        async updateProfile(userId: string, updates: Partial<GameState>): Promise<void> {
            const body: Record<string, any> = {
                updated_at: new Date().toISOString()
            };

            if (updates.totalStones !== undefined) body.total_stones = updates.totalStones;
            if (updates.currentStreak !== undefined) body.current_streak = updates.currentStreak;
            if (updates.longestStreak !== undefined) body.longest_streak = updates.longestStreak;
            if (updates.longestStreakAt !== undefined) body.longest_streak_at = updates.longestStreakAt;
            if (updates.forestHealth !== undefined) body.forest_health = updates.forestHealth;
            if (updates.lastSessionDate !== undefined) body.last_session_date = updates.lastSessionDate?.toISOString();
            if (updates.lastActiveDate !== undefined) body.last_active_date = updates.lastActiveDate?.toISOString();

            await adminClient
                .from('profiles')
                .update(body)
                .eq('id', userId);
        },

        async updateSession(userId: string, sessionId: string, updates: any): Promise<void> {
            const body: Record<string, any> = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await adminClient
                .from('amber_sessions')
                .update(body)
                .eq('id', sessionId)
                .eq('user_id', userId)
                .select('id')
                .maybeSingle();

            if (error || !data) {
                throw new Error('Session not found or unauthorized');
            }
        },

        async insertAchievement(userId: string, achievementId: string): Promise<void> {
            await adminClient
                .from('user_achievements')
                .upsert({
                    user_id: userId,
                    achievement_id: achievementId,
                    unlocked_at: new Date().toISOString(),
                    notified: false
                }, {
                    onConflict: 'user_id,achievement_id',
                    ignoreDuplicates: true
                });
        },

        async insertForestEvent(
            userId: string,
            eventType: string,
            amount: number,
            sessionId?: string
        ): Promise<void> {
            await adminClient
                .from('forest_events')
                .insert({
                    user_id: userId,
                    event_type: eventType,
                    amount,
                    related_session_id: sessionId,
                    created_at: new Date().toISOString()
                });
        }
    };
}

export default createSupabaseGamificationAdapter;
