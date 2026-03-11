<script lang="ts">
    import AmberView from "$lib/components/AmberView.svelte";

    let { data } = $props();
    let notes = $derived(data.notes || []);
    let profile = $derived(data.profile);
</script>

<AmberView {profile} recentSessions={notes} />
