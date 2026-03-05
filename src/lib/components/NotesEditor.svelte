<script lang="ts">
    import { enhance } from "$app/forms";
    import { fade } from "svelte/transition";

    let {
        activeNote,
        notes = [],
        profile = null,
        showToast,
        updateActiveNoteContent,
        onBack,
    } = $props<{
        activeNote: any;
        notes: any[];
        profile?: any;
        showToast: (msg: string) => void;
        updateActiveNoteContent: (content: string) => void;
        onBack: () => void;
    }>();

    let isSidebarOpen = $state(true); // default to true on mobile so they see list first
    let saveTimeout: ReturnType<typeof setTimeout>;

    const autoSave = (content: string) => {
        if (!activeNote || activeNote.id === "mock") return;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const formData = new FormData();
            formData.append("id", activeNote.id);
            formData.append("content", content);
            await fetch("?/updateNote", {
                method: "POST",
                body: formData,
            });
            // Update title locally based on the first line
            const lines = content.split("\n");
            if (lines[0] && lines[0].startsWith("# ")) {
                activeNote.title = lines[0].replace("# ", "").trim();
            }
        }, 1000);
    };
</script>

<!-- ── Main Canvas ── -->
<main
    class="w-full h-screen pt-20 pb-4 px-4 sm:px-6 relative z-10 flex flex-col max-w-6xl mx-auto overflow-hidden"
>
    <!-- Active Area Split View -->
    <div
        class="flex-1 flex gap-6 relative overflow-hidden transition-all duration-500"
    >
        <!-- Sidebar Navigation Drawer -->
        <div
            class="h-full flex-shrink-0 flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] {isSidebarOpen
                ? 'w-full sm:w-80 opacity-100 translate-x-0 sm:relative absolute z-20'
                : 'w-0 opacity-0 -translate-x-12 pointer-events-none absolute sm:w-80 sm:relative sm:opacity-100 sm:translate-x-0 sm:pointer-events-auto'}"
        >
            <div
                class="p-4 border-b border-resin-forest/5 font-serif font-bold text-resin-charcoal flex justify-between items-center bg-white/40"
            >
                <h2>Your Archive</h2>
                <span
                    class="text-xs font-sans text-resin-earth/60 font-medium px-2 py-1 bg-black/5 rounded-md"
                    >{notes.length} saved</span
                >
            </div>
            <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {#each notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as note (note.id)}
                    <button
                        class="w-full text-left p-3 rounded-xl transition-all duration-200 border border-transparent {activeNote?.id ===
                        note.id
                            ? 'bg-resin-forest/5 border-resin-forest/10 shadow-sm relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-resin-forest before:rounded-r-md'
                            : 'hover:bg-black/5'}"
                        onclick={() => {
                            if (window.innerWidth < 640) isSidebarOpen = false; // Auto-close on mobile
                            activeNote = note;
                        }}
                    >
                        <h3
                            class="font-semibold text-sm text-resin-charcoal truncate pr-2"
                        >
                            {note.title ||
                                (note.content
                                    ? note.content
                                          .split("\n")[0]
                                          .replace("#", "")
                                          .trim()
                                    : "Untitled Note")}
                        </h3>
                        <div class="flex justify-between items-center mt-1">
                            <p
                                class="text-xs text-resin-earth/70 truncate mr-2 w-3/4"
                            >
                                {note.content
                                    ? note.content.substring(0, 40)
                                    : "..."}
                            </p>
                            <span
                                class="text-[10px] text-resin-earth/50 whitespace-nowrap bg-white/50 px-1.5 rounded"
                            >
                                {new Date(note.created_at).toLocaleDateString(
                                    [],
                                    { month: "short", day: "numeric" },
                                )}
                            </span>
                        </div>
                    </button>
                {/each}
                {#if notes.length === 0}
                    <div
                        class="flex flex-col items-center justify-center h-full text-center p-6 text-resin-earth/50"
                    >
                        <svg
                            class="w-12 h-12 mb-3 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            /></svg
                        >
                        <p class="text-sm">Empty archive.</p>
                        <p class="text-xs mt-1">
                            Start typing to build a library.
                        </p>
                    </div>
                {/if}
            </div>

            <!-- Sync Prompt -->
            {#if profile && !profile.sync_notes}
                <div
                    class="mt-auto p-4 border-t border-resin-forest/5 bg-gradient-to-tr from-resin-ember/10 to-transparent"
                >
                    <a
                        href="/account"
                        class="block w-full text-left bg-white/60 hover:bg-white p-3 rounded-xl border border-resin-forest/10 shadow-sm transition-all group"
                    >
                        <div class="flex items-center justify-between mb-1">
                            <span
                                class="text-xs font-bold text-resin-amber tracking-wider uppercase"
                                >Sync Disabled</span
                            >
                            <svg
                                class="w-4 h-4 text-resin-earth/50 group-hover:text-resin-amber transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                ></path></svg
                            >
                        </div>
                        <p class="text-[11px] text-resin-earth/80">
                            Connect to the Resin app to read & write notes
                            securely anywhere.
                        </p>
                    </a>
                </div>
            {/if}
        </div>

        <!-- Editor Block -->
        <div
            class="flex-1 flex flex-col w-full bg-white/60 backdrop-blur-md rounded-2xl shadow-premium relative group transition-all duration-300 min-w-0 {isSidebarOpen
                ? 'hidden sm:flex'
                : 'flex'}"
        >
            <!-- Mobile Back Button -->
            <div
                class="sm:hidden px-4 py-3 border-b border-resin-forest/5 bg-white/40"
            >
                <button
                    onclick={() => {
                        isSidebarOpen = true;
                        onBack();
                    }}
                    class="flex items-center gap-2 text-resin-earth/70 hover:text-resin-charcoal font-medium text-sm transition-colors"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 19l-7-7 7-7"
                        ></path></svg
                    >
                    Back to Archive
                </button>
            </div>

            <!-- svelte-ignore a11y_autofocus -->
            <textarea
                autofocus
                class="flex-1 w-full bg-transparent resize-none font-sans text-[16px] leading-relaxed text-[#2B4634] focus:outline-none p-6 sm:p-10 placeholder:text-[#5C4B3C]/60"
                placeholder="Dump your chaotic thoughts, code snippets, and scattered ideas here..."
                value={activeNote?.content ===
                "Dump your chaotic thoughts, code snippets, and scattered ideas here..."
                    ? ""
                    : activeNote?.content}
                oninput={(e) => {
                    const newVal = e.currentTarget.value;
                    updateActiveNoteContent(newVal);
                    autoSave(newVal);
                }}
            ></textarea>

            <!-- Character Count -->
            <div
                class="absolute top-4 right-6 text-[12px] font-mono font-medium {(
                    activeNote?.content || ''
                ).length >= 10000
                    ? 'text-red-500'
                    : 'text-[#5C4B3C]/60'}"
            >
                {(activeNote?.content || "").length} / 10,000
            </div>

            <!-- ── Attached Bottom Bar ── -->
            <div
                class="w-full px-4 sm:px-8 pb-6 pt-4 border-t border-[#5C4B3C]/10 bg-white/40 rounded-b-2xl"
            >
                <div class="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        class="flex-1 w-full py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all
                        border border-[#2B4634]/30 text-[#2B4634] bg-[#2B4634]/5 hover:bg-[#2B4634]/15
                        disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-[#2B4634]/5"
                        disabled={!(activeNote?.content || "").trim()}
                        onclick={() => showToast("Note saved")}
                    >
                        <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2.5"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            ></path></svg
                        >
                        Save Note
                    </button>

                    <form
                        method="POST"
                        action="?/activateNote"
                        class="flex-1 w-full"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                if (result.type === "success") {
                                    showToast(
                                        "DeepSeek activated! Plan generated and scheduled.",
                                    );
                                } else {
                                    showToast(
                                        "Failed to activate. Please try again.",
                                    );
                                }
                                await update();
                            };
                        }}
                    >
                        <input
                            type="hidden"
                            name="noteContent"
                            value={activeNote?.content}
                        />
                        <button
                            type="submit"
                            class="w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all
                            bg-[#2B4634] text-white hover:opacity-90 active:opacity-100 shadow-sm hover:shadow text-center
                            disabled:opacity-45 disabled:cursor-not-allowed"
                            disabled={!(activeNote?.content || "").trim()}
                        >
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                stroke-width="2.5"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                ></path></svg
                            >
                            Activate
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</main>
