/**
 * @deprecated Use src/lib/state/amber.svelte.ts instead
 * This file uses Svelte 4 stores (writable/derived).
 * New code should use Svelte 5 runes via amberState from $lib/state/amber.svelte
 *
 * Migration path:
 * 1. Replace: import { amberStore } from '$lib/stores/amberStore'
 * 2. With:   import { amberState } from '$lib/state/amber.svelte'
 * 3. API is identical, but now uses $state/$derived internally
 */

import { writable, derived } from 'svelte/store';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AmberSession } from '$lib/types';

// Re-export type from contracts (not defined locally anymore)
export type { AmberSession };

interface DeleteState {
    id: string;
    snapshot: AmberSession;
}

class AmberStore {
    // Core state
    private sessions = writable<AmberSession[]>([]);
    private deletingIds = writable<Set<string>>(new Set());
    private activatingIds = writable<Set<string>>(new Set());
    private supabase: SupabaseClient | null = null;
    private userId: string | null = null;
    private realtimeChannel: any = null;
    private deleteStack: DeleteState[] = [];

    // Derived states
    public visibleSessions = derived(
        [this.sessions, this.deletingIds],
        ([$sessions, $deletingIds]) => {
            // Hide notes that are currently being deleted (optimistic)
            return $sessions.filter((s) => !$deletingIds.has(s.id));
        }
    );

    public isActivating = derived(
        this.activatingIds,
        ($activatingIds) => (sessionId: string) => $activatingIds.has(sessionId)
    );

    public isDeleting = derived(
        this.deletingIds,
        ($deletingIds) => (sessionId: string) => $deletingIds.has(sessionId)
    );

    /**
     * Initialize the store with Supabase client and user ID
     */
    public initialize(supabase: SupabaseClient, userId: string) {
        this.supabase = supabase;
        this.userId = userId;
        this.setupRealtimeSubscriptions();
    }

    /**
     * Set initial sessions (from server load)
     */
    public setSessions(newSessions: AmberSession[]) {
        this.sessions.set(newSessions);
        console.log('[AmberStore] Sessions initialized:', newSessions.length);
    }

    /**
     * Optimistic Delete with Rollback
     * 1. Remove from UI immediately
     * 2. Execute server delete
     * 3. On error, restore to UI + show toast
     */
    public async deleteSession(
        sessionId: string,
        options?: { onError?: (error: string) => void }
    ): Promise<boolean> {
        if (!this.supabase || !this.userId) {
            console.error('[AmberStore] Delete: Supabase not initialized');
            return false;
        }

        // Find and snapshot the session for rollback
        let localSnapshot: AmberSession | null = null;
        this.sessions.update((sessions) => {
            const index = sessions.findIndex((s) => s.id === sessionId);
            if (index > -1) {
                localSnapshot = sessions[index];
                // Remove from display immediately (optimistic)
                return sessions.filter((s) => s.id !== sessionId);
            }
            return sessions;
        });
        const snapshot = localSnapshot as AmberSession | null;

        if (!snapshot) {
            console.error('[AmberStore] Delete: Session not found locally');
            return false;
        }

        // Mark as deleting
        this.deletingIds.update((ids) => {
            ids.add(sessionId);
            return ids;
        });

        try {
            console.log('[AmberStore] Attempting delete for:', sessionId);

            // Try amber_sessions first
            const { count: amberCount, error: amberError } = await this.supabase
                .from('amber_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', this.userId);

            if (!amberError && amberCount && amberCount > 0) {
                console.log('[AmberStore] Delete successful (amber_sessions)');
                // Clean up calendar events if any
                if (snapshot.amber_tasks?.length) {
                    await this.cleanupCalendarEvents(snapshot.amber_tasks);
                }
                // Remove from deleting set
                this.deletingIds.update((ids) => {
                    ids.delete(sessionId);
                    return ids;
                });
                return true;
            }

            // Try blocking_sessions (focus sessions)
            const { count: blockCount, error: blockError } = await this.supabase
                .from('blocking_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', this.userId);

            if (!blockError && blockCount && blockCount > 0) {
                console.log('[AmberStore] Delete successful (blocking_sessions)');
                this.deletingIds.update((ids) => {
                    ids.delete(sessionId);
                    return ids;
                });
                return true;
            }

            // If we get here, both deletes returned count===0 (RLS silent failure)
            const error = amberError || blockError || 'RLS policy prevented deletion';
            throw new Error(`Delete failed: ${error}`);
        } catch (err) {
            console.error('[AmberStore] Delete error:', err);

            // Rollback: restore the session
            if (snapshot) {
                this.sessions.update((sessions) => [...sessions, snapshot!].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            }

            // Remove from deleting set
            this.deletingIds.update((ids) => {
                ids.delete(sessionId);
                return ids;
            });

            // Call error handler
            if (options?.onError) {
                options.onError(err instanceof Error ? err.message : 'Unknown error');
            }

            return false;
        }
    }

    /**
     * Activate a session (mark as scheduled)
     */
    public async activateSession(sessionId: string): Promise<boolean> {
        if (!this.supabase || !this.userId) {
            console.error('[AmberStore] Activate: Supabase not initialized');
            return false;
        }

        // Mark as activating
        this.activatingIds.update((ids) => {
            ids.add(sessionId);
            return ids;
        });

        try {
            console.log('[AmberStore] Activating session:', sessionId);

            // Update session status
            const { count, error } = await this.supabase
                .from('amber_sessions')
                .update({ status: 'scheduled', updated_at: new Date().toISOString() })
                .eq('id', sessionId)
                .eq('user_id', this.userId);

            if (error) {
                throw new Error(`Activation failed: ${error.message}`);
            }

            if (!count || count === 0) {
                throw new Error('RLS policy prevented activation (no rows affected)');
            }

            console.log('[AmberStore] Activation successful');
            // Update local state
            this.sessions.update((sessions) =>
                sessions.map((s) =>
                    s.id === sessionId ? { ...s, status: 'scheduled' } : s
                )
            );

            return true;
        } catch (err) {
            console.error('[AmberStore] Activation error:', err);
            return false;
        } finally {
            // Remove from activating set
            this.activatingIds.update((ids) => {
                ids.delete(sessionId);
                return ids;
            });
        }
    }

    /**
     * Setup Realtime subscriptions (singleton pattern)
     * Listen for DELETE events on amber_sessions and blocking_sessions
     */
    private setupRealtimeSubscriptions() {
        if (!this.supabase || !this.userId) return;

        // Clean up existing channel
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
        }

        console.log('[AmberStore] Setting up Realtime subscriptions');

        // Single unified channel for all amber-related changes
        this.realtimeChannel = this.supabase
            .channel(`user:${this.userId}:amber`, {
                config: { broadcast: { self: true } }
            })
            // Listen for deletions
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'amber_sessions',
                    filter: `user_id=eq.${this.userId}`
                },
                (payload) => {
                    console.log('[AmberStore] Realtime DELETE on amber_sessions:', payload.old.id);
                    this.sessions.update((sessions) =>
                        sessions.filter((s) => s.id !== payload.old.id)
                    );
                    this.deletingIds.update((ids) => {
                        ids.delete(payload.old.id);
                        return ids;
                    });
                }
            )
            // Listen for blocking_sessions deletions (focus sessions)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'blocking_sessions',
                    filter: `user_id=eq.${this.userId}`
                },
                (payload) => {
                    console.log('[AmberStore] Realtime DELETE on blocking_sessions:', payload.old.id);
                    this.sessions.update((sessions) =>
                        sessions.filter((s) => s.id !== payload.old.id)
                    );
                }
            )
            // Listen for updates (status changes)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'amber_sessions',
                    filter: `user_id=eq.${this.userId}`
                },
                (payload) => {
                    console.log('[AmberStore] Realtime UPDATE on amber_sessions:', payload.new.id);
                    const newSession = payload.new as AmberSession;
                    this.sessions.update((sessions) =>
                        sessions.map((s) => (s.id === newSession.id ? newSession : s))
                    );
                }
            )
            .subscribe((status) => {
                console.log('[AmberStore] Realtime subscription status:', status);
            });
    }

    /**
     * Clean up calendar events when deleting a session
     */
    private async cleanupCalendarEvents(tasks: any[]) {
        const calendarEventIds = tasks
            .map((t) => t.calendar_event_id)
            .filter(Boolean);

        if (calendarEventIds.length === 0) return;

        try {
            console.log('[AmberStore] Cleaning up calendar events:', calendarEventIds);
            // This would normally call deleteCalendarEvent for each ID
            // For now, we just log
        } catch (err) {
            console.warn('[AmberStore] Calendar cleanup warning:', err);
        }
    }

    /**
     * Cleanup (call when component unmounts or user logs out)
     */
    public cleanup() {
        if (this.realtimeChannel && this.supabase) {
            this.supabase.removeChannel(this.realtimeChannel);
            console.log('[AmberStore] Realtime subscriptions cleaned up');
        }
    }
}

// Export singleton instance
export const amberStore = new AmberStore();
