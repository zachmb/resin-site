<script lang="ts">
    import LandingPage from "$lib/components/landing/LandingPage.svelte";
    import Dashboard from "$lib/components/dashboard/Dashboard.svelte";

    let { data } = $props();
</script>

<svelte:head>
    <title>Resin</title>
</svelte:head>

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
        burnoutRisk={data.burnoutRisk}
    />
{:else}
    <LandingPage />
{/if}
