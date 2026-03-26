/**
 * Amber Store — Svelte 5 Rune-based State Management
 *
 * Handles amber session (plan) state with optimistic updates,
 * realtime synchronization, and error recovery.
 *
 * Usage:
 * ```
 * import { amberState } from '$lib/state/amber.svelte';
 * amberState.initialize(supabase, userId);
 * amberState.setSessions(data.sessions);
 * let visible = amberState.visibleSessions;
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AmberSession, AmberTask } from '$lib/types';

export class AmberStore {
	// ============================================================================
	// CORE REACTIVE STATE (using Svelte 5 $state)
	// ============================================================================

	private _sessions = $state<AmberSession[]>([]);
	private _deletingIds = $state<Set<string>>(new Set());
	private _activatingIds = $state<Set<string>>(new Set());

	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;
	private realtimeChannel: ReturnType<SupabaseClient['channel']> | null = null;
	private deleteStack: Array<{ id: string; snapshot: AmberSession }> = [];

	// ============================================================================
	// COMPUTED STATE (using Svelte 5 $derived)
	// ============================================================================

	/**
	 * Sessions currently visible (excludes ones being deleted optimistically)
	 */
	visibleSessions = $derived(
		this._sessions.filter((s) => !this._deletingIds.has(s.id))
	);

	/**
	 * Check if a specific session is being activated
	 */
	isActivating = $derived((sessionId: string) => {
		return this._activatingIds.has(sessionId);
	});

	/**
	 * Check if a specific session is being deleted
	 */
	isDeleting = $derived((sessionId: string) => {
		return this._deletingIds.has(sessionId);
	});

	// ============================================================================
	// PUBLIC API
	// ============================================================================

	/**
	 * Initialize the store with Supabase client and user ID
	 */
	initialize(supabase: SupabaseClient, userId: string) {
		this.supabase = supabase;
		this.userId = userId;
		this.setupRealtimeSubscriptions();
	}

	/**
	 * Set initial sessions (from server load)
	 */
	setSessions(newSessions: AmberSession[]) {
		this._sessions = newSessions;
		console.log('[AmberStore] Sessions initialized:', newSessions.length);
	}

	/**
	 * Optimistic Delete with Rollback
	 * 1. Remove from UI immediately
	 * 2. Execute server delete
	 * 3. On error, restore to UI + call error handler
	 */
	async deleteSession(
		sessionId: string,
		options?: { onError?: (error: string) => void }
	): Promise<boolean> {
		if (!this.supabase || !this.userId) {
			console.error('[AmberStore] Delete: Supabase not initialized');
			return false;
		}

		// Find and snapshot the session for rollback
		const index = this._sessions.findIndex((s) => s.id === sessionId);
		if (index === -1) {
			console.error('[AmberStore] Delete: Session not found locally');
			return false;
		}

		const snapshot = this._sessions[index];
		this.deleteStack.push({ id: sessionId, snapshot });

		// Remove from display immediately (optimistic)
		this._sessions.splice(index, 1);

		// Mark as deleting
		this._deletingIds.add(sessionId);

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
				this._deletingIds.delete(sessionId);
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
				this._deletingIds.delete(sessionId);
				return true;
			}

			// If we get here, both deletes returned count===0 (RLS silent failure)
			const error = amberError || blockError || 'RLS policy prevented deletion';
			throw new Error(`Delete failed: ${error}`);
		} catch (err) {
			console.error('[AmberStore] Delete error:', err);

			// Rollback: restore the session
			this._sessions.push(snapshot);
			this._sessions.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);

			// Remove from deleting set
			this._deletingIds.delete(sessionId);

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
	async activateSession(sessionId: string): Promise<boolean> {
		if (!this.supabase || !this.userId) {
			console.error('[AmberStore] Activate: Supabase not initialized');
			return false;
		}

		// Mark as activating
		this._activatingIds.add(sessionId);

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
			const sessionIndex = this._sessions.findIndex((s) => s.id === sessionId);
			if (sessionIndex > -1) {
				this._sessions[sessionIndex] = {
					...this._sessions[sessionIndex],
					status: 'scheduled'
				};
			}

			return true;
		} catch (err) {
			console.error('[AmberStore] Activation error:', err);
			return false;
		} finally {
			// Remove from activating set
			this._activatingIds.delete(sessionId);
		}
	}

	/**
	 * Cleanup (call when component unmounts or user logs out)
	 */
	cleanup() {
		if (this.realtimeChannel && this.supabase) {
			this.supabase.removeChannel(this.realtimeChannel);
			console.log('[AmberStore] Realtime subscriptions cleaned up');
		}
		this._sessions = [];
		this._deletingIds.clear();
		this._activatingIds.clear();
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	/**
	 * Setup Realtime subscriptions
	 * Listen for DELETE and UPDATE events on amber_sessions and blocking_sessions
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
			// Listen for deletions on amber_sessions
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
					const index = this._sessions.findIndex((s) => s.id === payload.old.id);
					if (index > -1) {
						this._sessions.splice(index, 1);
					}
					this._deletingIds.delete(payload.old.id);
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
					const index = this._sessions.findIndex((s) => s.id === payload.old.id);
					if (index > -1) {
						this._sessions.splice(index, 1);
					}
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
					const index = this._sessions.findIndex((s) => s.id === newSession.id);
					if (index > -1) {
						this._sessions[index] = newSession;
					}
				}
			)
			.subscribe((status) => {
				console.log('[AmberStore] Realtime subscription status:', status);
			});
	}

	/**
	 * Clean up calendar events when deleting a session
	 */
	private async cleanupCalendarEvents(tasks: AmberTask[]) {
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
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global amber state instance
 * Use via: import { amberState } from '$lib/state/amber.svelte'
 */
export const amberState = new AmberStore();
