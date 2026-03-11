<script lang="ts">
    import { enhance } from "$app/forms";
    import { parseCommands } from "$lib/utils/commandParser";
    import CommandPalette from "./CommandPalette.svelte";

    import ConnectedNotesSection from "./ConnectedNotesSection.svelte";

    let {
        activeNote,
        notes = [],
        profile = null,
        friends = [],
        connections = {},
        showToast,
        updateActiveNoteContent,
        onBack,
        onSaveSuccess,
        onSelectNote,
    } = $props<{
        activeNote: any;
        notes: any[];
        profile?: any;
        friends?: any[];
        connections?: Record<string, any>;
        showToast: (msg: string) => void;
        updateActiveNoteContent: (content: string) => void;
        onBack: () => void;
        onSaveSuccess: (result: { note: any; isNew: boolean }) => void;
        onSelectNote: (note: any) => void;
    }>();

    let isSidebarOpen = $state(true);
    let searchQuery = $state('');
    let activeTitle = $state<string>('');
    let lastSaved = $state<Date | null>(null);
    let isSaving = $state(false);
    let saveTimeout: ReturnType<typeof setTimeout>;
    let showShareModal = $state(false);
    let selectedShareFriend: any = $state(null);
    let lastRewardTime = $state<number>(0);
    let activationError = $state<string | null>(null);
    let isRetryingActivation = $state(false);

    $effect(() => {
        activeTitle = activeNote?.title || '';
        // Update lastSaved to show the actual creation time of the active note
        if (activeNote?.created_at) {
            lastSaved = new Date(activeNote.created_at);
        }
    });

    const toggleSidebar = () => {
        isSidebarOpen = !isSidebarOpen;
    };

    const filteredNotes = $derived(
        notes.filter((n: any) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (n.title || '').toLowerCase().includes(q) ||
                   (n.content || '').toLowerCase().includes(q);
        })
    );

    const wordCount = $derived(
        (activeNote?.content || '').trim().split(/\s+/).filter((w: string) => w).length
    );

    const charCount = $derived(
        (activeNote?.content || '').length
    );

    const parsedCommands = $derived(
        parseCommands(activeNote?.content || '')
    );

    const autoSave = (content: string) => {
        if (!activeNote || activeNote.id === "mock") return;
        clearTimeout(saveTimeout);
        isSaving = true;
        saveTimeout = setTimeout(async () => {
            const formData = new FormData();
            formData.append("id", activeNote.id);
            formData.append("content", content);
            await fetch("?/updateNote", {
                method: "POST",
                body: formData,
            });
            lastSaved = new Date();
            isSaving = false;
            const lines = content.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    activeNote.title = trimmed
                        .replace(/^#+\s*/, "")
                        .substring(0, 60);
                    activeTitle = activeNote.title;
                    break;
                }
            }
        }, 1000);
    };

    const formatTimeSince = (date: Date | null): string => {
        if (!date) return '';
        const now = new Date();
        const secs = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (secs < 60) return 'Just now';
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
        return `${Math.floor(secs / 86400)}d ago`;
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
        <!-- Toggle Button (Desktop only) -->
        <button
            onclick={toggleSidebar}
            class="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-white/80 backdrop-blur-sm border border-resin-forest/10 rounded-r-xl shadow-sm items-center justify-center text-resin-earth hover:text-resin-amber transition-all shadow-premium {isSidebarOpen
                ? 'translate-x-80'
                : 'translate-x-0'}"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
            <svg
                class="w-4 h-4 transition-transform duration-300 {isSidebarOpen
                    ? 'rotate-180'
                    : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M9 5l7 7-7 7"
                ></path></svg
            >
        </button>

        <!-- Sidebar Navigation Drawer -->
        <div
            class="h-full flex-shrink-0 flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] {isSidebarOpen
                ? 'w-full sm:w-80 opacity-100 translate-x-0 sm:relative absolute z-20'
                : 'w-0 opacity-0 -translate-x-12 pointer-events-none absolute sm:w-0 sm:relative sm:opacity-0 sm:-translate-x-12'}"
        >
            <!-- Sidebar Header with Search & New Note -->
            <div
                class="p-4 border-b border-resin-forest/5 bg-white/40 space-y-3"
            >
                <div class="flex justify-between items-center">
                    <h2 class="font-serif font-bold text-resin-charcoal">Archive</h2>
                    <span
                        class="text-xs font-sans text-resin-earth/60 font-medium px-2 py-1 bg-black/5 rounded-md"
                        >{notes.length} saved</span
                    >
                </div>

                <!-- Search Input -->
                <input
                    type="text"
                    placeholder="Search notes..."
                    bind:value={searchQuery}
                    class="w-full px-3 py-2 rounded-lg border border-resin-forest/10 bg-white/70 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:border-resin-forest/30 focus:bg-white transition-all"
                />

                <!-- New Note Button -->
                <form method="POST" action="?/createNote" class="w-full">
                    <button
                        type="submit"
                        class="w-full px-3 py-2.5 rounded-lg bg-resin-forest/10 text-resin-forest font-semibold text-xs border border-resin-forest/20 hover:bg-resin-forest/15 transition-all flex items-center justify-center gap-2"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        New Note
                    </button>
                </form>
            </div>

            <!-- Notes List -->
            <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {#each filteredNotes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as note (note.id)}
                    {@const noteTitle = !note.title || note.title.toLowerCase().startsWith("untitled") ? (note.content ? note.content.split("\n").map((l: string) => l.trim()).find((l: string) => l && l !== "#")?.replace(/^#+\s*/, "").substring(0, 60) : "Untitled Note") : note.title}
                    {@const noteWords = (note.content || '').trim().split(/\s+/).filter((w: string) => w).length}
                    <button
                        class="w-full text-left p-3 rounded-xl transition-all duration-200 border border-transparent {activeNote?.id ===
                        note.id
                            ? 'bg-resin-forest/5 border-resin-forest/10 shadow-sm relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-resin-forest before:rounded-r-md'
                            : 'hover:bg-black/5'}"
                        onclick={() => {
                            if (window.innerWidth < 640) isSidebarOpen = false;
                            onSelectNote(note);
                        }}
                    >
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <h3
                                class="font-semibold text-sm text-resin-charcoal truncate flex-1"
                            >
                                {noteTitle}
                            </h3>
                            {#if note.status === 'scheduled'}
                                <span class="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-resin-amber flex-shrink-0">
                                    ACTIVE
                                </span>
                            {:else if note.status === 'canceled'}
                                <span class="text-[8px] font-bold text-red-600 px-1.5 py-0.5 rounded bg-red-300/30 flex-shrink-0">
                                    ✕
                                </span>
                            {/if}
                        </div>
                        <div class="flex justify-between items-center mt-1">
                            <p
                                class="text-xs text-resin-earth/70 truncate mr-2 flex-1"
                            >
                                {note.content
                                    ? note.content.substring(0, 40)
                                    : "No content"}
                            </p>
                        </div>
                        <div class="mt-2 text-right">
                            <span
                                class="text-[10px] text-resin-earth/40 font-medium bg-resin-earth/5 px-2 py-0.5 rounded"
                            >
                                {formatTimeSince(new Date(note.created_at))}
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
            <!-- Editor Header: Mobile Back Button + Title + Right Panel Toggle -->
            <div
                class="flex-shrink-0 px-4 sm:px-8 py-4 border-b border-resin-forest/5 bg-white/40 space-y-3 sm:space-y-0"
            >
                <div class="flex items-center justify-between gap-4">
                    <!-- Mobile Back Button -->
                    <button
                        onclick={() => {
                            isSidebarOpen = true;
                            onBack();
                        }}
                        class="sm:hidden flex items-center gap-2 text-resin-earth/70 hover:text-resin-charcoal font-medium text-sm transition-colors shrink-0"
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
                        Back
                    </button>

                    <!-- Title Input -->
                    <input
                        type="text"
                        placeholder="Untitled Note"
                        bind:value={activeTitle}
                        class="flex-1 text-2xl font-serif font-bold text-resin-charcoal bg-transparent focus:outline-none placeholder:text-resin-earth/30"
                    />
                </div>
            </div>

            <!-- svelte-ignore a11y_autofocus -->
            <textarea
                autofocus
                class="flex-1 w-full bg-transparent resize-none font-sans text-[17px] leading-relaxed text-[#2B4634] focus:outline-none p-6 sm:p-10 placeholder:text-[#5C4B3C]/60"
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

            <!-- Automation Commands Section -->
            {#if parsedCommands.hasCommands}
                <div class="px-6 sm:px-10 py-4 border-t border-blue-100">
                    <CommandPalette commands={parsedCommands.commands} />
                </div>
            {/if}

            <!-- Connected Notes Section -->
            {#if activeNote?.id && connections[activeNote.id]}
                <div class="px-6 sm:px-10 py-4 border-t border-resin-forest/5 bg-white/20">
                    <ConnectedNotesSection
                        outgoing={connections[activeNote.id]?.outgoing || []}
                        incoming={connections[activeNote.id]?.incoming || []}
                        onNavigateToNote={(noteId) => onSelectNote(notes.find((n: any) => n.id === noteId))}
                    />
                </div>
            {/if}

            <!-- Status Bar -->
            <div
                class="flex-shrink-0 px-4 sm:px-8 py-3 border-t border-resin-forest/5 bg-white/30 flex items-center justify-between text-xs text-resin-earth/60 font-mono"
            >
                <div class="flex items-center gap-4">
                    <span>{wordCount} words</span>
                    <span>·</span>
                    <span>{charCount} chars</span>
                </div>
                <div class="text-right">
                    {#if isSaving}
                        <span class="text-resin-amber font-semibold">Saving...</span>
                    {:else if lastSaved}
                        <span>Last saved {formatTimeSince(lastSaved)}</span>
                    {:else}
                        <span class="text-resin-earth/40">Unsaved</span>
                    {/if}
                </div>
            </div>

            <!-- ── Action Bar ── -->
            <div
                class="w-full px-4 sm:px-8 pb-6 pt-4 border-t border-[#5C4B3C]/10 bg-white/40 rounded-b-2xl"
            >
                <div class="flex flex-col sm:flex-row items-center gap-3">
                    <form
                        method="POST"
                        action="?/saveNote"
                        class="flex-1 w-full"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                if (
                                    result.type === "success" &&
                                    result.data?.success
                                ) {
                                    // Show stone reward on successful save with 60s debouncing
                                    const now = Date.now();
                                    if (now - lastRewardTime > 60000) {
                                        showToast("⭐ Earned +3 Stones for saving!");
                                        lastRewardTime = now;
                                        // Store reward to localStorage for forest page display
                                        localStorage.setItem('recentReward', JSON.stringify({
                                            text: 'Earned +3 Stones for saving!',
                                            icon: '⭐',
                                            timestamp: now
                                        }));
                                    } else {
                                        showToast("Note saved!");
                                    }

                                    onSaveSuccess({
                                        note: result.data.note,
                                        isNew: result.data.isNew,
                                    });
                                } else if (
                                    result.type === "failure" ||
                                    result.type === "success"
                                ) {
                                    // success type can still have success: false in some cases if not using fail()
                                    showToast(
                                        result.data?.error ||
                                            "Failed to save note.",
                                    );
                                } else if (result.type === "error") {
                                    showToast(
                                        result.error?.message ||
                                            "An error occurred.",
                                    );
                                }
                                await update({ reset: false });
                            };
                        }}
                    >
                        <input type="hidden" name="id" value={activeNote?.id} />
                        <input
                            type="hidden"
                            name="content"
                            value={activeNote?.content}
                        />
                        <button
                            type="submit"
                            class="w-full py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all
                            border border-[#2B4634]/30 text-[#2B4634] bg-[#2B4634]/5 hover:bg-[#2B4634]/15
                            disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-[#2B4634]/5"
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
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                ></path></svg
                            >
                            Save Note
                        </button>
                    </form>

                    {#if activeNote?.status === 'scheduled'}
                        <!-- Cancel Active Plan -->
                        <form
                            method="POST"
                            action="?/cancelNote"
                            class="flex-1 w-full"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        showToast("Plan canceled");
                                    } else if (result.type === "failure") {
                                        showToast(
                                            result.data?.error ||
                                                "Failed to cancel. Please try again.",
                                        );
                                    } else if (result.type === "error") {
                                        showToast(
                                            result.error?.message ||
                                                "An error occurred.",
                                        );
                                    }
                                    await update();
                                };
                            }}
                        >
                            <input type="hidden" name="id" value={activeNote?.id} />
                            <button
                                type="submit"
                                class="w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all
                                bg-red-400 text-white hover:opacity-90 active:opacity-100 shadow-sm hover:shadow text-center"
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
                                    d="M6 18L18 6M6 6l12 12"
                                ></path></svg
                                >
                                Cancel Plan
                            </button>
                        </form>
                    {:else if activeNote?.status === 'completed'}
                        <!-- Completed State -->
                        <div class="w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 bg-resin-forest/10 text-resin-forest">
                            <svg
                                class="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            ><path
                                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                                ></path></svg
                            >
                            Completed
                        </div>
                    {:else if activeNote?.status === 'canceled'}
                        <!-- Canceled State -->
                        <div class="w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 bg-red-300/20 text-red-600">
                            <svg
                                class="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            ><path
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                                ></path></svg
                            >
                            Canceled
                        </div>
                    {:else}
                        <!-- Activation error banner -->
                        {#if activationError}
                            <div class="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                <div class="flex gap-3">
                                    <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                    <div class="flex-1">
                                        <h3 class="text-sm font-semibold text-red-900">Scheduling Failed</h3>
                                        <p class="text-sm text-red-700 mt-1">{activationError}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onclick={() => activationError = null}
                                        class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div class="flex gap-2 mt-3">
                                    <form method="POST" action="?/activateNote" class="flex-1" use:enhance={() => {
                                        isRetryingActivation = true;
                                        return async ({ result }) => {
                                            isRetryingActivation = false;
                                            if (result.type === "success") {
                                                activationError = null;
                                            } else {
                                                activationError = (result.data?.error || result.error?.message || "Retry failed.") as any;
                                            }
                                        };
                                    }}>
                                        <input type="hidden" name="id" value={activeNote?.id} />
                                        <input type="hidden" name="noteContent" value={activeNote?.content} />
                                        <button
                                            type="submit"
                                            disabled={isRetryingActivation}
                                            class="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                                        >
                                            {#if isRetryingActivation}
                                                <svg class="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Retrying...
                                            {:else}
                                                Retry
                                            {/if}
                                        </button>
                                    </form>
                                    <button
                                        type="button"
                                        onclick={() => activationError = null}
                                        class="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-md hover:bg-red-200 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        {/if}

                        <!-- Activate (Draft/Default) -->
                        <div class="flex-1 w-full flex flex-col gap-2">
                            <form
                                method="POST"
                                action="?/activateNote"
                                class="w-full"
                                use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === "success") {
                                            showToast(
                                                result.data?.message ||
                                                    "DeepSeek activated! Plan generated and scheduled.",
                                            );
                                            // Store reward to localStorage for forest page display
                                            const now = Date.now();
                                            localStorage.setItem('recentReward', JSON.stringify({
                                                text: 'Plan activated! DeepSeek generating...',
                                                icon: '🚀',
                                                timestamp: now
                                            }));
                                        } else if (result.type === "failure") {
                                            activationError = result.data?.error || "Failed to activate. Please try again.";
                                            showToast(activationError);
                                        } else if (result.type === "error") {
                                            activationError = String(result.error?.message || "An error occurred.");
                                            showToast(activationError);
                                        }
                                        await update();
                                    };
                                }}
                            >
                                <input type="hidden" name="id" value={activeNote?.id} />
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
                    {/if}
                </div>
            </div>
        </div>
    </div>
</main>

<!-- Share Modal -->
{#if showShareModal}
    <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
        onclick={() => showShareModal = false}
        role="dialog"
        aria-modal="true"
    >
        <div
            class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
            onclick={(e) => e.stopPropagation()}
        >
            <h3 class="text-lg font-bold text-resin-charcoal mb-4">Share Note</h3>
            <p class="text-sm text-resin-earth/60 mb-4">
                Share this note with a friend for collaborative editing.
            </p>

            <div class="space-y-2 mb-6">
                {#each friends as friend (friend.id)}
                    <form method="POST" action="?/shareNote" use:enhance={() => {
                        showShareModal = false;
                        showToast('Note shared!');
                    }}>
                        <input type="hidden" name="note_id" value={activeNote.id} />
                        <input type="hidden" name="shared_with_id" value={friend.id} />
                        <button
                            type="submit"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-resin-forest/10 transition-all border border-resin-earth/10 text-resin-charcoal font-medium"
                        >
                            Share with Friend
                        </button>
                    </form>
                {/each}
            </div>

            <button
                onclick={() => showShareModal = false}
                class="w-full px-4 py-2 rounded-lg border border-resin-earth/20 text-resin-charcoal font-medium hover:bg-black/5 transition-all"
            >
                Close
            </button>
        </div>
    </div>
{/if}
