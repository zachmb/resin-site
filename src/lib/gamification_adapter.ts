/**
 * Supabase adapter for @resin/core
 *
 * Implements DatabaseAdapter interface so resin-core's database-aware functions
 * can work with Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { DatabaseAdapter } from '@resin/core';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

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
            const { data: profile, error } = await admin
                .from('profiles')
                .select('*')
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
            const { count, error } = await admin
                .from('amber_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed');

            if (error) {
                console.error('[GamificationAdapter] Error counting sessions:', error);
                return 0;
            }

            return count || 0;
        },

        async fetchSessionDates(userId: string): Promise<string[]> {
            const { data: sessions, error } = await admin
                .from('amber_sessions')
                .select('created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error || !sessions) return [];

            return sessions
                .map(s => {
                    const d = new Date(s.created_at);
                    if (Number.isNaN(d.getTime())) return null;
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                })
                .filter(Boolean) as string[];
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

            await admin
                .from('profiles')
                .update(body)
                .eq('id', userId);
        },

        async updateSession(sessionId: string, updates: any): Promise<void> {
            const body: Record<string, any> = {
                updated_at: new Date().toISOString(),
                ...updates
            };

            await admin
                .from('amber_sessions')
                .update(body)
                .eq('id', sessionId);
        },

        async insertAchievement(userId: string, achievementId: string): Promise<void> {
            await admin
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
            await admin
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
