<script lang="ts">
    import AmberView from "$lib/components/AmberView.svelte";
    import { invalidateAll } from "$app/navigation";
    import { setCache } from "$lib/cache";

    let { data } = $props();
    let notes = $state<any[]>([]);
    let profile = $derived(data.profile);
    let executionStats = $derived(data.executionStats);

    // Sync server data to local state whenever data changes
    $effect(() => {
        notes = data?.notes || [];
    });

    // Helper function called by AmberView when a new session is created
    export const addNewSession = async (session: any) => {
        // Optimistically add the new session to the list
        if (!notes.some((n: any) => n.id === session.id)) {
            notes = [session, ...notes];
            // Cache the updated sessions list
            setCache('amber-sessions', notes, 5 * 60 * 1000);
        }
        // Reload from server to stay in sync
        await invalidateAll();
    };

    // Optimistic delete: remove from local state immediately, sync with server
    export const deleteSession = async (sessionId: string) => {
        // Store the deleted item in case we need to rollback
        const deletedIndex = notes.findIndex((n: any) => n.id === sessionId);
        const deletedNote = notes[deletedIndex];

        if (deletedIndex > -1) {
            // Optimistic update: remove from UI immediately
            notes = notes.filter((n: any) => n.id !== sessionId);
            setCache('amber-sessions', notes, 5 * 60 * 1000);
            console.log('[Page] Optimistically deleted session:', sessionId);
        }

        // Sync with server - invalidateAll will re-run load and fetch fresh data
        await invalidateAll();
        console.log('[Page] Invalidated all data after delete');
    };
</script>

<svelte:head>
    <title>Amber | Resin</title>
</svelte:head>

<AmberView {profile} recentSessions={notes} {executionStats} onDelete={deleteSession} />
