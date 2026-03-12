<script lang="ts">
    import LandingPage from "$lib/components/LandingPage.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";

    let { data } = $props();
</script>

{#if data.session}
    <Dashboard
        session={data.session}
        profile={data.profile}
        recentNotes={data.recentNotes}
        todayTasks={data.todayTasks}
        weeklyStats={data.weeklyStats}
        automations={data.automations}
        isNewUser={data.isNewUser}
        groups={data.groups}
    />
{:else}
    <LandingPage />
{/if}
