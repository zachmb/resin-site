<script lang="ts">
    import AccountView from "$lib/components/AccountView.svelte";
    import { page } from "$app/stores";

    let { data } = $props();
    let session = $derived($page.data.session);
    let profile = $derived(data.profile);
    let tasteData = $derived(data.tasteData);
</script>

<AccountView {session} {profile} {tasteData} />
