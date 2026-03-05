<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import LandingPage from "$lib/components/LandingPage.svelte";
    import NotesEditor from "$lib/components/NotesEditor.svelte";
    import AmberView from "$lib/components/AmberView.svelte";
    import AccountView from "$lib/components/AccountView.svelte";
    import MindMap from "$lib/components/MindMap.svelte";
    import { fade } from "svelte/transition";

    let { data } = $props();

    // Session comes from $page.data which merges layout + page server data.
    // This ensures the tab view shows immediately after OAuth redirect
    // without needing the page server to return session (it may not on first render).
    let session = $derived($page.data.session);
    let profile = $derived(data.profile ?? $page.data.profile);

    let notes = $derived(($page.data.notes ?? data.notes) || []);
    let edges = $derived(($page.data.edges ?? data.edges) || []);

    let toastMessage = $state("");

    const showToast = (msg: string) => {
        toastMessage = msg;
        setTimeout(() => (toastMessage = ""), 3000);
    };

    let rawActiveNote = $state<any>(null);
    let activeNote = $derived(
        rawActiveNote ||
            (notes.length > 0
                ? notes[0]
                : {
                      id: "mock",
                      title: "Project Phoenix: Retrieval Strategy",
                      content:
                          "# Project Phoenix\n\n## Context\nThis archive contains the brain dump from Feb 20, 2026 regarding the *Phoenix* retrieval protocol.\n\n### Tasks\n- [x] Scan local cache\n- [ ] Reconfigure amber nodes\n- [ ] Sync with core orchestrator\n\n> Note: The latency spike in the northern quadrant remains unexplained.",
                      created_at: new Date().toISOString(),
                  }),
    );

    const setActiveNote = (note: any) => {
        rawActiveNote = note;
        goto("/?tab=notes");
    };

    const updateActiveNoteContent = (content: string) => {
        if (rawActiveNote) {
            rawActiveNote.content = content;
        } else if (notes.length > 0) {
            rawActiveNote = notes[0];
            rawActiveNote.content = content;
        }
    };

    let activeTab = $derived($page.url.searchParams.get("tab") || "notes");
</script>

<svelte:head>
    <title>Resin</title>
</svelte:head>

{#if session}
    <div
        class="bg-[#FCF9F2] min-h-screen text-[#222222] font-sans selection:bg-[#E89A3C]/20 relative w-full overflow-hidden"
    >
        {#if activeTab === "notes"}
            <NotesEditor
                {activeNote}
                {notes}
                {showToast}
                {updateActiveNoteContent}
            />
        {:else if activeTab === "map"}
            <MindMap {notes} initialEdges={edges} {setActiveNote} />
        {:else if activeTab === "amber"}
            <AmberView {profile} recentSessions={notes} />
        {:else if activeTab === "account"}
            <AccountView {session} {profile} />
        {/if}

        <!-- Toast UI -->
        {#if toastMessage}
            <div
                transition:fade={{ duration: 200 }}
                class="fixed bottom-[100px] left-1/2 -translate-x-1/2 px-5 py-3 bg-white text-[#2B4634] rounded-[22px] shadow-premium z-[100] font-semibold text-[14px] flex items-center gap-2"
            >
                <svg
                    class="w-4 h-4 text-[#2B4634]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    ><path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                    ></path></svg
                >
                {toastMessage}
            </div>
        {/if}
    </div>
{:else}
    <div class="bg-[#FCF9F2] min-h-screen">
        <LandingPage />
    </div>
{/if}
