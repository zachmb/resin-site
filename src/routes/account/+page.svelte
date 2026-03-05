<script lang="ts">
    import AccountView from "$lib/components/AccountView.svelte";
    import { page } from "$app/stores";

    let { data } = $props();
    let session = $derived($page.data.session);
    let profile = $derived($page.data.profile);
</script>

<AccountView {session} {profile} />
