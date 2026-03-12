<script lang="ts">
    import MindMap from "$lib/components/MindMap.svelte";
    import { page } from "$app/stores";
    import { invalidateAll } from "$app/navigation";
    import { enhance } from "$app/forms";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";

    let { data } = $props();
    let notes = $derived($page.data.notes || []);
    let edges = $derived($page.data.edges || []);

    let mappedNotes = $derived(notes.filter((n: any) => n.is_on_map));
    let unmappedNotes = $derived(notes.filter((n: any) => !n.is_on_map));

    let showAutoSaveHint = $state(true);

    onMount(() => {
        // Auto-dismiss the hint after 4 seconds
        const timeout = setTimeout(() => {
            showAutoSaveHint = false;
        }, 4000);

        return () => clearTimeout(timeout);
    });

    const onDragStart = (e: DragEvent, note: any) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData("application/svelteflow", note.id);
            e.dataTransfer.effectAllowed = "move";
        }
    };

    const handleDropAction = async () => {
        // We invalidate all to resync $page.data with the server and force reactivity
        // this is simple, but we can also manually optimistically update if desired
        await invalidateAll();
    };
</script>

<div class="flex h-screen w-full overflow-hidden bg-resin-bg pt-[72px]">
    <!-- Sidebar for Unmapped Notes -->
    <div
        class="w-80 h-full border-r border-resin-forest/10 bg-white/50 backdrop-blur-md flex flex-col shadow-premium z-10 flex-shrink-0"
    >
        <div class="p-6 border-b border-resin-forest/5 bg-white/40">
            <h2 class="font-bold text-resin-charcoal font-serif text-lg">
                Saved Notes
            </h2>
            <p class="text-xs text-resin-earth/70 mt-1 font-light">
                Drag notes onto the canvas
            </p>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {#each unmappedNotes as note (note.id)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    draggable="true"
                    ondragstart={(e) => onDragStart(e, note)}
                    class="p-4 bg-white border border-resin-forest/10 rounded-xl shadow-sm cursor-grab hover:shadow-md hover:border-resin-forest/30 transition-all active:cursor-grabbing"
                >
                    <h3
                        class="font-semibold text-sm text-resin-charcoal truncate"
                    >
                        {note.title ||
                            (note.content
                                ? note.content
                                      .split("\n")[0]
                                      .replace("#", "")
                                      .trim()
                                : "Untitled Note")}
                    </h3>
                    <p class="text-xs text-resin-earth/70 mt-2 truncate">
                        {note.content ? note.content.substring(0, 40) : "..."}
                    </p>
                </div>
            {/each}

            {#if unmappedNotes.length === 0}
                <div
                    class="flex flex-col items-center justify-center p-8 text-center text-resin-earth/50"
                >
                    <p class="text-sm">All notes are on the map!</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Main Map Canvas -->
    <div class="flex-1 relative h-full">
        <MindMap
            notes={mappedNotes}
            initialEdges={edges}
            onNoteDropped={handleDropAction}
        />

        <!-- Auto-save Indicator Toast -->
        {#if showAutoSaveHint}
            <div
                transition:fade={{ duration: 200 }}
                class="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-resin-forest text-white rounded-full shadow-lg z-20 text-sm font-medium flex items-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Saves are automatic
            </div>
        {/if}
    </div>
</div>
