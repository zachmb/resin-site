<script lang="ts">
    import AccountView from "$lib/components/account/AccountView.svelte";
    import { page } from "$app/stores";

    let { data } = $props<any>();
    let session = $derived($page.data.session);
    let profile = $derived(data.profile);
    let profileSettingsLoadFailed = $derived(data.profileSettingsLoadFailed);
    let tasteData = $derived(data.tasteData);
    let deviceTokens = $derived(data.deviceTokens);
    let deviceTokensLoadFailed = $derived(data.deviceTokensLoadFailed);
    let commandConfigs = $derived(data.commandConfigs);
    let commandConfigsLoadFailed = $derived(data.commandConfigsLoadFailed);
    let friends = $derived(data.friends);
    let friendsLoadFailed = $derived(data.friendsLoadFailed);
    let incomingRequests = $derived(data.incomingRequests);
    let outgoingRequests = $derived(data.outgoingRequests);
</script>

<AccountView {session} {profile} {profileSettingsLoadFailed} {tasteData} {deviceTokens} {deviceTokensLoadFailed} {commandConfigs} {commandConfigsLoadFailed} {friends} {friendsLoadFailed} {incomingRequests} {outgoingRequests} />
