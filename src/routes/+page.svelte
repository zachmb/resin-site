<script lang="ts">
    import LandingPage from "$lib/components/LandingPage.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";

    let { data } = $props();
</script>

{#if data.session}
    <Dashboard
        profile={data.profile}
        recentNotes={data.recentNotes}
        todayTasks={data.todayTasks}
        weeklyStats={data.weeklyStats}
    />
{:else}
    <LandingPage />
{/if}
