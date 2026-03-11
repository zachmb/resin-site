<script lang="ts">
    import AccountView from "$lib/components/AccountView.svelte";
    import { page } from "$app/stores";

    let { data } = $props<any>();
    let session = $derived($page.data.session);
    let profile = $derived(data.profile);
    let tasteData = $derived(data.tasteData);
    let deviceTokens = $derived(data.deviceTokens);
    let commandConfigs = $derived(data.commandConfigs);
</script>

<AccountView {session} {profile} {tasteData} {deviceTokens} {commandConfigs} />
