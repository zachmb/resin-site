<script lang="ts">
    import AmberView from "$lib/components/AmberView.svelte";
    import { page } from "$app/stores";

    let { data } = $props();
    let notes = $derived($page.data.notes || []);
    let profile = $derived($page.data.profile);
</script>

<AmberView {profile} recentSessions={notes} />
