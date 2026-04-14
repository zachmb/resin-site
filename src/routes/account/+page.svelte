<script lang="ts">
    import AccountView from "$lib/components/account/AccountView.svelte";
    import { page } from "$app/stores";

    let { data } = $props<any>();
    let session = $derived($page.data.session);
    let profile = $derived(data.profile);
    let tasteData = $derived(data.tasteData);
    let deviceTokens = $derived(data.deviceTokens);
    let commandConfigs = $derived(data.commandConfigs);
    let friends = $derived(data.friends);
    let incomingRequests = $derived(data.incomingRequests);
    let outgoingRequests = $derived(data.outgoingRequests);
</script>

<AccountView {session} {profile} {tasteData} {deviceTokens} {commandConfigs} {friends} {incomingRequests} {outgoingRequests} />
