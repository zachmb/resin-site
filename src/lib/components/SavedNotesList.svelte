<script lang="ts">
    import { enhance } from "$app/forms";

    let { notes = [], sharedWithMe = [], setActiveNote } = $props<{
        notes: any[];
        sharedWithMe?: any[];
        setActiveNote: (note: any) => void;
    }>();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const getInitial = (ownerEmail: string): string => {
        return (ownerEmail.charAt(0) || 'U').toUpperCase();
    };
</script>

<main
    class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-4xl mx-auto"
>
    <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-serif font-bold text-resin-charcoal">
            Saved Notes
        </h1>
        <form
            method="POST"
            action="?/createNote"
            use:enhance={() => {
                return async ({ result, update }) => {
                    if (result.type === "success" && result.data?.note) {
                        setActiveNote(result.data.note);
                    }
                    await update();
                };
            }}
        >
            <button
                type="submit"
                class="px-5 py-2.5 bg-resin-forest text-white rounded-xl font-semibold hover:bg-resin-charcoal transition-all shadow-sm flex items-center gap-2"
            >
                <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    ></path>
                </svg>
                New Note
            </button>
        </form>
    </div>

    {#if sharedWithMe && sharedWithMe.length > 0}
        <div class="mb-12">
            <h2 class="text-xl font-bold text-resin-charcoal mb-4 flex items-center gap-2">
                <span class="text-resin-amber">⚡</span> Shared with Me
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each sharedWithMe as note (note.id)}
                    <div class="group relative">
                        <button
                            onclick={() => setActiveNote(note)}
                            class="w-full text-left glass-card rounded-2xl p-6 border border-resin-amber/20 hover:border-resin-amber/40 shadow-sm hover:shadow-md transition-all h-full flex flex-col group relative bg-resin-amber/5"
                        >
                            <div class="flex items-start gap-3 mb-3">
                                <div
                                    class="w-8 h-8 rounded-lg bg-resin-amber/20 text-resin-amber font-bold flex items-center justify-center text-sm flex-shrink-0"
                                >
                                    {getInitial(note.owner_email || 'U')}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3
                                        class="text-sm font-semibold text-resin-amber/80"
                                    >
                                        Shared by {note.owner_email?.split('@')[0] || 'Someone'}
                                    </h3>
                                </div>
                            </div>
                            <h4
                                class="text-lg font-bold text-resin-charcoal mb-2 line-clamp-1"
                            >
                                {note.title || "Untitled"}
                            </h4>
                            <p
                                class="text-resin-earth/80 text-sm line-clamp-3 mb-4 flex-1"
                            >
                                {note.content.substring(0, 150)}{note.content
                                    .length > 150
                                    ? "..."
                                    : ""}
                            </p>
                            <div
                                class="flex items-center justify-between mt-auto pt-4 border-t border-resin-amber/10"
                            >
                                <span
                                    class="text-xs font-semibold text-resin-earth/60"
                                    >{formatDate(note.created_at)}</span
                                >
                                {#if note.status}
                                    <span
                                        class="text-xs font-semibold px-2 py-1 rounded-full {note.status === 'scheduled'
                                            ? 'bg-resin-amber/20 text-resin-amber'
                                            : note.status === 'completed'
                                                ? 'bg-resin-forest/20 text-resin-forest'
                                                : 'bg-resin-earth/20 text-resin-earth'}"
                                    >
                                        {note.status}
                                    </span>
                                {/if}
                            </div>
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if notes.length === 0 && (!sharedWithMe || sharedWithMe.length === 0)}
        <div
            class="glass-card rounded-[2rem] p-12 text-center border border-resin-forest/5 flex flex-col items-center justify-center"
        >
            <div
                class="w-16 h-16 rounded-full bg-resin-amber/10 flex items-center justify-center mb-4 text-resin-amber"
            >
                <svg
                    class="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                </svg>
            </div>
            <h3 class="text-xl font-bold text-resin-charcoal mb-2">
                No notes yet
            </h3>
            <p class="text-resin-earth/70 max-w-sm">
                When you create a brain dump, it will be automatically saved
                here. You can also receive notes shared by your friends.
            </p>
            <form
                method="POST"
                action="?/createNote"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === "success" && result.data?.note) {
                            setActiveNote(result.data.note);
                        }
                        await update();
                    };
                }}
                class="mt-6"
            >
                <button
                    type="submit"
                    class="px-6 py-3 bg-resin-forest/10 text-resin-forest rounded-xl font-semibold hover:bg-resin-forest/20 transition-all"
                >
                    Create your first note
                </button>
            </form>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each notes as note (note.id)}
                <div class="group relative">
                    <button
                        onclick={() => setActiveNote(note)}
                        class="w-full text-left glass-card rounded-2xl p-6 border border-resin-forest/5 hover:border-resin-forest/20 shadow-sm hover:shadow-md transition-all h-full flex flex-col group relative"
                    >
                        <h3
                            class="text-lg font-bold text-resin-charcoal mb-2 line-clamp-1"
                        >
                            {note.title || "Untitled"}
                        </h3>
                        <p
                            class="text-resin-earth/80 text-sm line-clamp-3 mb-4 flex-1"
                        >
                            {note.content.substring(0, 150)}{note.content
                                .length > 150
                                ? "..."
                                : ""}
                        </p>
                        <div
                            class="flex items-center justify-between mt-auto pt-4 border-t border-resin-earth/10"
                        >
                            <span
                                class="text-xs font-semibold text-resin-earth/60"
                                >{formatDate(note.created_at)}</span
                            >
                        </div>
                    </button>
                    <!-- Delete button overlay -->
                    <form
                        method="POST"
                        action="?/deleteNote"
                        use:enhance
                        class="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <input type="hidden" name="id" value={note.id} />
                        <button
                            type="submit"
                            class="p-2 text-resin-earth/60 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-colors border border-resin-forest/5 shadow-sm"
                            aria-label="Delete note"
                            onclick={(e) => {
                                if (
                                    !confirm(
                                        "Are you sure you want to delete this note?",
                                    )
                                ) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                            </svg>
                        </button>
                    </form>
                </div>
            {/each}
        </div>
    {/if}
</main>
