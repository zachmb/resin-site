<script lang="ts">
    import AmberView from "$lib/components/AmberView.svelte";
    import { onMount } from "svelte";
    import { createAmberDataManager } from "$lib/services/DataManager";
    import type { DataManager } from "$lib/services/DataManager";

    // Data manager for amber - handles cache + sync
    let dataManager: DataManager;

    // Initialize state from cache
    let notes = $state<any[]>([]);
    let profile = $state<any>(null);
    let executionStats = $state<any>(null);
    let jointPlans = $state<any[]>([]);

    // Load cached data and start background sync on mount
    onMount(() => {
        // Create data manager with callbacks
        dataManager = createAmberDataManager(
            // onDataUpdate callback - called when fresh data arrives
            (freshData) => {
                console.log('[amber:page] Received fresh data from DataManager');
                notes = freshData.sessions || [];
                profile = freshData.profile || null;
                jointPlans = freshData.jointPlans || [];
                executionStats = null; // Computed server-side, skipping for now
            },
            // onError callback - called if sync fails
            (error) => {
                console.error('[amber:page] DataManager sync error:', error);
            }
        );

        // Load initial data from cache (instant)
        const cachedData = dataManager.getInitialData();
        if (cachedData) {
            console.log('[amber:page] Loaded from cache');
            notes = cachedData.sessions || [];
            profile = cachedData.profile || null;
            jointPlans = cachedData.jointPlans || [];
        }

        // Start background sync (silent)
        console.log('[amber:page] Starting background sync...');
        dataManager.syncInBackground();
    });

    // Helper function called by AmberView when a new session is created
    export const addNewSession = async (session: any) => {
        // Optimistically add the new session to the list
        if (!notes.some((n: any) => n.id === session.id)) {
            notes = [session, ...notes];
            console.log('[amber:page] Optimistically added new session:', session.id);
        }
        // Sync fresh data in background
        if (dataManager) {
            dataManager.syncInBackground();
        }
    };

    // Optimistic delete: remove from local state immediately, sync in background
    export const deleteSession = async (sessionId: string) => {
        const deletedIndex = notes.findIndex((n: any) => n.id === sessionId);

        if (deletedIndex > -1) {
            // Optimistic update: remove from UI immediately
            notes = notes.filter((n: any) => n.id !== sessionId);
            console.log('[amber:page] Optimistically deleted session:', sessionId);
        }

        // Sync fresh data in background
        if (dataManager) {
            dataManager.syncInBackground();
        }
    };
</script>

<svelte:head>
    <title>Amber | Resin</title>
</svelte:head>

<AmberView {profile} recentSessions={notes} {executionStats} onDelete={deleteSession} />
