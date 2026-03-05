<script lang="ts">
    import NotesEditor from "$lib/components/NotesEditor.svelte";
    import { page } from "$app/stores";
    import { fade } from "svelte/transition";

    let { data } = $props();
    let notes = $derived($page.data.notes || []);
    let profile = $derived($page.data.profile || null);

    let toastMessage = $state("");
    const showToast = (msg: string) => {
        toastMessage = msg;
        setTimeout(() => (toastMessage = ""), 3000);
    };

    let rawActiveNote = $state<any>(null);

    // Reset view if the user clicks the "Notes" link in the header explicitly
    $effect(() => {
        if (
            $page.url.pathname === "/notes" &&
            $page.url.searchParams.has("reset")
        ) {
            rawActiveNote = null;
        }
    });

    let activeNote = $derived(
        rawActiveNote ||
            (notes.length > 0
                ? notes[0]
                : {
                      id: "mock",
                      title: "Project Phoenix",
                      content: "# Project Phoenix\n\nStarting a new project...",
                      created_at: new Date().toISOString(),
                  }),
    );

    const updateActiveNoteContent = (content: string) => {
        if (rawActiveNote) {
            rawActiveNote.content = content;
        } else if (notes.length > 0) {
            rawActiveNote = notes[0];
            rawActiveNote.content = content;
        }
    };
</script>

<NotesEditor
    {activeNote}
    {notes}
    {profile}
    {showToast}
    {updateActiveNoteContent}
    onBack={() => (rawActiveNote = null)}
/>

{#if toastMessage}
    <div
        transition:fade={{ duration: 200 }}
        class="fixed bottom-[100px] left-1/2 -translate-x-1/2 px-5 py-3 bg-white text-[#2B4634] rounded-[22px] shadow-premium z-[100] font-semibold text-[14px] flex items-center gap-2"
    >
        <svg
            class="w-4 h-4 text-[#2B4634]"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
            ></path>
        </svg>
        {toastMessage}
    </div>
{/if}
