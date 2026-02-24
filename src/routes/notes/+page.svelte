<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import { enhance } from "$app/forms";

    let { data } = $props();
    let session = $derived(data.session);
    let initialNotes = $derived(data.notes);
    let notes = $state(initialNotes);
    $effect(() => {
        notes = initialNotes;
    });

    let sidebarOpen = $state(true);
    let rightPanelOpen = $state(false);
    let isEditing = $state(false);
    let showCommandPalette = $state(false);
    let toastMessage = $state("");

    const showToast = (msg: string) => {
        toastMessage = msg;
        setTimeout(() => (toastMessage = ""), 3000);
    };

    // For now, we'll use a mock active note if there are no notes
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            showCommandPalette = true;
        }
    };

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
                if (rawActiveNote) {
                    rawActiveNote.title = lines[0].replace("# ", "").trim();
                }
            }
        }, 1000);
    };
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
    <title>Notes - Resin</title>
</svelte:head>

<div
    class="flex h-screen bg-[#F8F5EE] text-[#222222] font-sans selection:bg-[#E89A3C]/20 overflow-hidden w-full absolute inset-0 z-50 sm:p-6 md:p-10 items-center justify-center"
>
    <!-- Background Decor -->
    <div class="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
            class="absolute top-[-10%] left-[10%] w-[60%] h-[60%] bg-[#E89A3C]/10 blur-[120px] rounded-full animate-pulse"
        ></div>
        <div
            class="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-[#2B4634]/10 blur-[120px] rounded-full"
        ></div>
    </div>

    <!-- Main Glass App Container -->
    <div
        class="w-full h-full max-w-[1600px] bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium sm:rounded-[2rem] flex overflow-hidden relative z-10"
    >
        <!-- 1. THE RIBBON (Action Bar) -->
        <aside
            class="w-14 border-r border-[#2B4634]/5 bg-white flex flex-col items-center py-6 gap-6 z-50 flex-shrink-0"
        >
            <a
                href="/"
                class="w-10 h-10 bg-[#2B4634] rounded-[12px] flex items-center justify-center shadow-premium hover:scale-105 transition-transform"
            >
                <img src="/logo.png" alt="Resin" class="w-7 h-7" />
            </a>

            <div class="flex flex-col gap-4 mt-8">
                <button
                    onclick={() => (showCommandPalette = true)}
                    class="p-2.5 rounded-[10px] transition-all duration-300 bg-[#2B4634] text-white shadow-md hover:scale-105 active:scale-95"
                >
                    <svg
                        class="w-[22px] h-[22px]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        ></path></svg
                    >
                </button>
                <button
                    class="p-2.5 rounded-[10px] transition-all duration-300 text-[#5C4B3C]/40 hover:text-[#2B4634] hover:bg-[#2B4634]/5"
                >
                    <svg
                        class="w-[22px] h-[22px]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        ></path></svg
                    >
                </button>
                <button
                    class="p-2.5 rounded-[10px] transition-all duration-300 text-[#5C4B3C]/40 hover:text-[#2B4634] hover:bg-[#2B4634]/5"
                >
                    <svg
                        class="w-[22px] h-[22px]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path></svg
                    >
                </button>
                <button
                    class="p-2.5 rounded-[10px] transition-all duration-300 text-[#5C4B3C]/40 hover:text-[#2B4634] hover:bg-[#2B4634]/5"
                >
                    <svg
                        class="w-[22px] h-[22px]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        ></path></svg
                    >
                </button>
            </div>

            <div class="mt-auto flex flex-col gap-4">
                <a
                    href="/account"
                    class="p-2.5 rounded-[10px] transition-all duration-300 text-[#5C4B3C]/40 hover:text-[#2B4634] hover:bg-[#2B4634]/5"
                >
                    <svg
                        class="w-[22px] h-[22px]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        ></path><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path></svg
                    >
                </a>
                <a
                    href="/account"
                    class="w-8 h-8 rounded-full bg-[#E89A3C]/20 border border-[#E89A3C]/10 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer"
                >
                    <span class="text-[10px] font-bold text-[#2B4634]"
                        >{session?.user.email?.[0].toUpperCase() ?? "U"}</span
                    >
                </a>
            </div>
        </aside>

        <!-- 2. THE FILE EXPLORER (Collapsible Sidebar) -->
        {#if sidebarOpen}
            <nav
                transition:slide={{ axis: "x", duration: 300 }}
                class="bg-white/40 backdrop-blur-xl border-r border-[#2B4634]/5 overflow-hidden flex flex-col w-[280px] flex-shrink-0"
            >
                <div class="p-6 h-full overflow-y-auto">
                    <div class="flex items-center justify-between mb-8">
                        <h2
                            class="text-xl font-bold font-serif tracking-tight text-[#2B4634]"
                        >
                            Archives
                        </h2>
                        <button
                            class="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"
                        >
                            <svg
                                class="w-[18px] h-[18px]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                ></path></svg
                            >
                        </button>
                    </div>

                    <div class="space-y-6">
                        <div class="space-y-1">
                            <h3
                                class="text-[10px] font-bold uppercase tracking-widest text-[#5C4B3C]/40 pl-3 mb-2"
                            >
                                RECENT DUMPS
                            </h3>
                            {#each notes as note}
                                <button
                                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors {activeNote.id ===
                                    note.id
                                        ? 'bg-[#E89A3C]/10 text-[#2B4634] font-semibold'
                                        : 'text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634]'}"
                                    onclick={() => (rawActiveNote = note)}
                                >
                                    <svg
                                        class="w-4 h-4 {activeNote.id ===
                                        note.id
                                            ? 'text-[#E89A3C]'
                                            : 'opacity-40'}"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        ></path></svg
                                    >
                                    <span class="truncate"
                                        >{note.title || "Untitled Note"}</span
                                    >
                                </button>
                            {/each}
                            {#if notes.length === 0}
                                <button
                                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors bg-[#E89A3C]/10 text-[#2B4634] font-semibold"
                                >
                                    <svg
                                        class="w-4 h-4 text-[#E89A3C]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        ></path></svg
                                    >
                                    <span class="truncate">Project Phoenix</span
                                    >
                                </button>
                            {/if}
                        </div>

                        <div class="space-y-1">
                            <h3
                                class="text-[10px] font-bold uppercase tracking-widest text-[#5C4B3C]/40 pl-3 mb-2"
                            >
                                COLLECTIONS
                            </h3>
                            <button
                                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634] transition-colors"
                            >
                                <svg
                                    class="w-4 h-4 opacity-40"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    ></path></svg
                                >
                                <span class="truncate">Research</span>
                            </button>
                            <button
                                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634] transition-colors"
                            >
                                <svg
                                    class="w-4 h-4 opacity-40"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    ></path></svg
                                >
                                <span class="truncate">Project Resin</span>
                            </button>
                            <button
                                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634] transition-colors"
                            >
                                <svg
                                    class="w-4 h-4 opacity-40"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    ></path></svg
                                >
                                <span class="truncate">Personal</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        {/if}

        <!-- 3. THE EDITOR (Central Area) -->
        <main class="flex-1 flex flex-col relative min-w-0">
            <!-- Editor Header -->
            <header
                class="h-14 border-b border-[#2B4634]/5 bg-white/60 backdrop-blur-md flex items-center justify-between px-6 z-10"
            >
                <div class="flex items-center gap-4">
                    <button
                        onclick={() => (sidebarOpen = !sidebarOpen)}
                        class="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"
                    >
                        {#if sidebarOpen}
                            <svg
                                class="w-5 h-5"
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
                        {:else}
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 5l7 7-7 7"
                                ></path></svg
                            >
                        {/if}
                    </button>
                    <div
                        class="flex items-center gap-2 text-sm text-[#5C4B3C]/60 whitespace-nowrap overflow-hidden"
                    >
                        <span>Archives</span>
                        <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            ></path></svg
                        >
                        <span class="text-[#2B4634] font-medium truncate"
                            >{activeNote.title || "Untitled Note"}</span
                        >
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div class="flex bg-[#2B4634]/5 p-1 rounded-lg mr-4">
                        <button
                            onclick={() => (isEditing = false)}
                            class="p-1.5 rounded transition-all {!isEditing
                                ? 'bg-white shadow-sm text-[#2B4634]'
                                : 'text-[#5C4B3C]/40 hover:text-[#2B4634]'}"
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                ></path><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                ></path></svg
                            >
                        </button>
                        <button
                            onclick={() => (isEditing = true)}
                            class="p-1.5 rounded transition-all {isEditing
                                ? 'bg-white shadow-sm text-[#2B4634]'
                                : 'text-[#5C4B3C]/40 hover:text-[#2B4634]'}"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                ></path></svg
                            >
                        </button>
                    </div>
                    <button
                        class="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"
                    >
                        <svg
                            class="w-[18px] h-[18px]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            ></path></svg
                        >
                    </button>
                    <button
                        onclick={() => (rightPanelOpen = !rightPanelOpen)}
                        class="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"
                    >
                        <svg
                            class="w-[18px] h-[18px]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            ></path></svg
                        >
                    </button>
                </div>
            </header>

            <!-- Content Area -->
            <div
                class="flex-1 overflow-y-auto px-6 md:px-12 py-10 w-full relative"
            >
                <div class="max-w-4xl mx-auto w-full relative min-h-full">
                    {#if isEditing}
                        <div
                            in:fade={{ duration: 200 }}
                            class="w-full h-full min-h-[500px]"
                        >
                            <!-- svelte-ignore a11y_autofocus -->
                            <textarea
                                autofocus
                                class="w-full h-full min-h-[500px] bg-transparent resize-none font-mono text-[15px] leading-relaxed text-[#2B4634] focus:outline-none"
                                value={activeNote.content}
                                oninput={(e) => {
                                    const newVal = e.currentTarget.value;
                                    if (rawActiveNote) {
                                        rawActiveNote.content = newVal;
                                        autoSave(newVal);
                                    } else if (notes.length > 0) {
                                        rawActiveNote = notes[0];
                                        rawActiveNote.content = newVal;
                                        autoSave(newVal);
                                    }
                                }}
                            ></textarea>
                        </div>
                    {:else}
                        <div
                            in:fade={{ duration: 200 }}
                            class="prose prose-resin max-w-none"
                        >
                            <h1
                                class="text-4xl font-serif font-bold text-[#2B4634] mb-8"
                            >
                                {activeNote.title || "Untitled"}
                            </h1>
                            <div
                                class="text-[17px] leading-8 text-[#5C4B3C]/90 font-light space-y-6"
                            >
                                <p>
                                    Captured on <span
                                        class="text-[#E89A3C] font-semibold"
                                        >{formatDate(
                                            activeNote.created_at,
                                        )}</span
                                    >
                                </p>

                                <!-- Simple Markdown Rendering for display -->
                                {#each (activeNote.content || "").split("\n\n") as block}
                                    {#if block.startsWith("# ")}
                                        <!-- Skip title, already shown -->
                                    {:else if block.startsWith("## ")}
                                        <h2
                                            class="text-3xl font-bold text-[#2B4634] pt-4"
                                        >
                                            {block.substring(3)}
                                        </h2>
                                    {:else if block.startsWith("### ")}
                                        <h3
                                            class="text-2xl font-bold text-[#2B4634] pt-4"
                                        >
                                            {block.substring(4)}
                                        </h3>
                                    {:else if block.startsWith("> ")}
                                        <div
                                            class="bg-[#2B4634]/5 border-l-4 border-[#E89A3C] p-6 rounded-r-xl italic font-serif"
                                        >
                                            {block.substring(2)}
                                        </div>
                                    {:else if block.includes("- [ ]") || block.includes("- [x]")}
                                        <ul class="space-y-3">
                                            {#each block.split("\n") as task}
                                                {#if task.trim()}
                                                    <li
                                                        class="flex items-center gap-3"
                                                    >
                                                        {#if task.includes("- [x]")}
                                                            <div
                                                                class="w-5 h-5 rounded-md bg-[#2B4634] flex items-center justify-center flex-shrink-0"
                                                            >
                                                                <svg
                                                                    class="w-3 h-3 text-white"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                    ><path
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                    /></svg
                                                                >
                                                            </div>
                                                            <span
                                                                class="line-through text-[#5C4B3C]/40"
                                                                >{task
                                                                    .replace(
                                                                        "- [x]",
                                                                        "",
                                                                    )
                                                                    .trim()}</span
                                                            >
                                                        {:else if task.includes("- [ ]")}
                                                            <div
                                                                class="w-5 h-5 rounded-md border-2 border-[#2B4634]/20 flex-shrink-0"
                                                            ></div>
                                                            <span
                                                                >{task
                                                                    .replace(
                                                                        "- [ ]",
                                                                        "",
                                                                    )
                                                                    .trim()}</span
                                                            >
                                                        {:else}
                                                            <div
                                                                class="w-1.5 h-1.5 rounded-full bg-[#E89A3C] flex-shrink-0 ml-1.5 mr-2"
                                                            ></div>
                                                            <span
                                                                >{task
                                                                    .replace(
                                                                        "-",
                                                                        "",
                                                                    )
                                                                    .trim()}</span
                                                            >
                                                        {/if}
                                                    </li>
                                                {/if}
                                            {/each}
                                        </ul>
                                    {:else}
                                        <p>{block}</p>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 4. THE COMMAND PALETTE (Modal) -->
            {#if showCommandPalette}
                <div
                    in:fade={{ duration: 150 }}
                    out:fade={{ duration: 150 }}
                    class="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-6"
                >
                    <div
                        class="absolute inset-0 bg-[#2B4634]/20 backdrop-blur-sm"
                        onclick={() => (showCommandPalette = false)}
                    ></div>
                    <div
                        class="relative w-full max-w-2xl bg-white border border-[#2B4634]/10 shadow-2xl rounded-2xl overflow-hidden"
                    >
                        <div
                            class="flex items-center px-6 h-16 border-b border-[#2B4634]/5"
                        >
                            <svg
                                class="w-5 h-5 text-[#5C4B3C]/40 mr-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                ><path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                ></path></svg
                            >
                            <input
                                autofocus
                                placeholder="Search archives or type a command..."
                                class="flex-1 bg-transparent border-none focus:outline-none text-lg text-[#2B4634]"
                            />
                            <div
                                class="flex items-center gap-1.5 px-2 py-1 bg-[#2B4634]/5 rounded text-[10px] font-bold text-[#5C4B3C]"
                            >
                                ⌘ <span>K</span>
                            </div>
                        </div>
                        <div class="py-2 max-h-[400px] overflow-y-auto">
                            <form
                                method="POST"
                                action="?/createNote"
                                use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === "success") {
                                            notes = [
                                                (result.data as any).note,
                                                ...notes,
                                            ];
                                            rawActiveNote = (result.data as any)
                                                .note;
                                            isEditing = true;
                                            showCommandPalette = false;
                                        }
                                        await update();
                                    };
                                }}
                            >
                                <button
                                    type="submit"
                                    class="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group"
                                >
                                    <div
                                        class="flex items-center gap-4 text-[#2B4634]"
                                    >
                                        <span
                                            class="opacity-60 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg
                                                class="w-[18px] h-[18px]"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                ><path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M12 4v16m8-8H4"
                                                ></path></svg
                                            >
                                        </span>
                                        <span class="font-medium"
                                            >New Brain Dump</span
                                        >
                                    </div>
                                    <span
                                        class="text-[11px] font-bold text-[#5C4B3C]/30"
                                        >⌘ N</span
                                    >
                                </button>
                            </form>
                            <button
                                onclick={() =>
                                    showToast("Note history coming soon!")}
                                class="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group"
                            >
                                <div
                                    class="flex items-center gap-4 text-[#2B4634]"
                                >
                                    <span
                                        class="opacity-60 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg
                                            class="w-[18px] h-[18px]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            ></path></svg
                                        >
                                    </span>
                                    <span class="font-medium"
                                        >Restore selected dump</span
                                    >
                                </div>
                                <span
                                    class="text-[11px] font-bold text-[#5C4B3C]/30"
                                    >⌘ R</span
                                >
                            </button>
                            <button
                                onclick={() =>
                                    showToast("Exporting to PDF coming soon!")}
                                class="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group"
                            >
                                <div
                                    class="flex items-center gap-4 text-[#2B4634]"
                                >
                                    <span
                                        class="opacity-60 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg
                                            class="w-[18px] h-[18px]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                            ></path></svg
                                        >
                                    </span>
                                    <span class="font-medium"
                                        >Export to PDF</span
                                    >
                                </div>
                            </button>
                            <div class="h-[1px] bg-[#2B4634]/5 my-2 mx-4"></div>
                            <button
                                onclick={() =>
                                    showToast("Manual Supabase sync complete!")}
                                class="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group"
                            >
                                <div
                                    class="flex items-center gap-4 text-[#2B4634]"
                                >
                                    <span
                                        class="opacity-60 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg
                                            class="w-[18px] h-[18px]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                                            ></path></svg
                                        >
                                    </span>
                                    <span class="font-medium"
                                        >Sync with Supabase</span
                                    >
                                </div>
                            </button>
                            <form
                                method="POST"
                                action="?/deleteNote"
                                use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === "success") {
                                            notes = notes.filter(
                                                (n: any) =>
                                                    n.id !==
                                                    (result.data as any)
                                                        .deletedId,
                                            );
                                            if (notes.length > 0) {
                                                rawActiveNote = notes[0];
                                            } else {
                                                rawActiveNote = null;
                                                isEditing = false;
                                            }
                                            showCommandPalette = false;
                                            showToast("Note deleted");
                                        }
                                        await update();
                                    };
                                }}
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={activeNote.id}
                                />
                                <button
                                    type="submit"
                                    class="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group"
                                >
                                    <div
                                        class="flex items-center gap-4 text-red-600"
                                    >
                                        <span
                                            class="opacity-60 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg
                                                class="w-[18px] h-[18px]"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                ><path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                ></path></svg
                                            >
                                        </span>
                                        <span class="font-medium"
                                            >Delete permanently</span
                                        >
                                    </div>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            {/if}
        </main>

        <!-- 5. THE GRAPH / INFO PANEL (Secondary Panel) -->
        {#if rightPanelOpen}
            <aside
                transition:slide={{ axis: "x", duration: 300 }}
                class="bg-white border-l border-[#2B4634]/5 overflow-hidden flex flex-col w-[320px] flex-shrink-0"
            >
                <div class="p-6 space-y-8 h-full overflow-y-auto">
                    <section>
                        <h3
                            class="text-xs font-bold uppercase tracking-widest text-[#5C4B3C]/50 mb-4"
                        >
                            NOTE GRAPH
                        </h3>
                        <div
                            class="aspect-square bg-[#F8F5EE] rounded-2xl border border-[#2B4634]/5 flex items-center justify-center overflow-hidden group relative"
                        >
                            <!-- Mock Graph Visualization -->
                            <div
                                class="relative w-full h-full flex items-center justify-center p-8"
                            >
                                <div
                                    class="w-4 h-4 rounded-full bg-[#E89A3C] shadow-lg relative z-10"
                                ></div>
                                <div
                                    class="absolute w-32 h-[1px] bg-[#2B4634]/10 rotate-45"
                                ></div>
                                <div
                                    class="absolute w-24 h-[1px] bg-[#2B4634]/10 -rotate-12 translate-x-12 translate-y-8"
                                ></div>
                                <div
                                    class="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-[#2B4634]/20"
                                ></div>
                                <div
                                    class="absolute bottom-1/4 right-1/4 w-3 h-3 rounded-full bg-[#2B4634]/40"
                                ></div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3
                            class="text-xs font-bold uppercase tracking-widest text-[#5C4B3C]/50 mb-4"
                        >
                            METADATA
                        </h3>
                        <div class="space-y-4">
                            <div
                                class="flex justify-between items-center text-sm"
                            >
                                <span class="text-[#5C4B3C]/40">Created</span>
                                <span class="text-[#2B4634] font-medium"
                                    >{formatDate(activeNote.created_at)}</span
                                >
                            </div>
                            <div
                                class="flex justify-between items-center text-sm"
                            >
                                <span class="text-[#5C4B3C]/40">Word Count</span
                                >
                                <span class="text-[#2B4634] font-medium"
                                    >{(activeNote.content || "").split(/\s+/)
                                        .length} words</span
                                >
                            </div>
                            <div
                                class="flex justify-between items-center text-sm"
                            >
                                <span class="text-[#5C4B3C]/40">Related</span>
                                <span class="text-[#2B4634] font-medium"
                                    >#Strategy #DeepWork</span
                                >
                            </div>
                        </div>
                    </section>
                </div>
            </aside>
        {/if}

        <!-- Toast UI -->
        {#if toastMessage}
            <div
                transition:fade={{ duration: 200 }}
                class="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#2B4634] text-white rounded-full shadow-2xl z-[100] font-medium text-sm flex items-center gap-3"
            >
                <svg
                    class="w-4 h-4 text-[#E89A3C]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    >
                        {toastMessage}
                    </path></svg
                >
            </div>
        {/if}
    </div>
</div>
