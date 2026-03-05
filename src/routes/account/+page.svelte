<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    onMount(() => {
        goto("/?tab=account", { replaceState: true });
    });
</script>

<div class="min-h-screen bg-resin-bg flex items-center justify-center">
    <div class="animate-pulse flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-resin-forest"></span>
        <span class="text-resin-forest font-semibold">Loading...</span>
    </div>
</div>
