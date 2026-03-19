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
</script>

<svelte:head>
    <title>Amber | Resin</title>
</svelte:head>

<AmberView {profile} recentSessions={notes} {executionStats} />
