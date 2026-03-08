<script lang="ts">
    import { enhance } from "$app/forms";

    let { profile, recentSessions = [] } = $props<{
        profile: any;
        recentSessions: any[];
    }>();

    let selectedSessionId = $state<string | null>(null);
    let activeFilter = $state<'all'|'scheduled'|'completed'|'draft'|'canceled'>('all');

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(":");
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-resin-amber';
            case 'completed': return 'bg-resin-forest';
            case 'canceled': return 'bg-red-300/60';
            default: return 'bg-resin-earth/30';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Active';
            case 'completed': return 'Completed';
            case 'canceled': return 'Canceled';
            case 'draft': return 'Draft';
            case 'failed': return 'Failed';
            default: return status;
        }
    };

    const filteredSessions = $derived(
        activeFilter === 'all'
            ? recentSessions
            : recentSessions.filter((s: any) => s.status === activeFilter)
    );

    const selectedSession = $derived(
        filteredSessions.find((s: any) => s.id === selectedSessionId)
        ?? filteredSessions[0]
        ?? null
    );

    const sessionFocusMinutes = $derived(
        (selectedSession?.amber_tasks || []).reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0)
    );

    let today = new Date().toISOString();
</script>

<main
    class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-7xl mx-auto"
>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-serif font-bold text-resin-charcoal">
                Amber Sessions
            </h1>
            <p class="text-resin-earth/70 mt-1">{formatDate(today)}</p>
        </div>
    </div>

    <!-- Two-Panel Layout -->
    <div class="flex gap-6 flex-1 relative min-h-[600px]">
        <!-- Left Panel: Session Browser -->
        <div
            class="flex-shrink-0 w-full sm:w-72 flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden"
        >
            <!-- Browser Header -->
            <div class="p-4 border-b border-resin-forest/5 bg-white/40">
                <h2 class="text-sm font-bold text-resin-charcoal">
                    Sessions
                    <span class="text-xs font-normal text-resin-earth/60">({filteredSessions.length})</span>
                </h2>
            </div>

            <!-- Filter Tabs -->
            <div class="px-3 py-3 border-b border-resin-forest/5 flex gap-1 overflow-x-auto scroll-smooth">
                {#each ['all', 'scheduled', 'completed', 'draft', 'canceled'] as filter}
                    <button
                        onclick={() => activeFilter = filter}
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeFilter === filter
                            ? 'bg-resin-forest text-white'
                            : 'text-resin-earth/60 hover:bg-black/5'}"
                    >
                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                {/each}
            </div>

            <!-- Session List -->
            <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {#if filteredSessions.length > 0}
                    {#each filteredSessions as session (session.id)}
                        <button
                            onclick={() => selectedSessionId = session.id}
                            class="w-full text-left p-3 rounded-lg transition-all border border-transparent {selectedSessionId === session.id
                                ? 'bg-resin-forest/5 border-resin-forest/10 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-resin-forest before:rounded-r-md'
                                : 'hover:bg-black/5'}"
                        >
                            <div class="flex items-start gap-2 mb-1">
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-sm text-resin-charcoal truncate">
                                        {session.title || session.display_title || 'Focus Session'}
                                    </h3>
                                </div>
                                <div class="flex-shrink-0 text-[9px] font-bold text-white px-1.5 py-0.5 rounded {getStatusColor(session.status)}">
                                    {getStatusLabel(session.status)}
                                </div>
                            </div>
                            <div class="flex items-center justify-between text-xs text-resin-earth/60 gap-2">
                                <span>
                                    {new Date(session.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span class="font-mono">
                                    {(session.amber_tasks || []).reduce((acc, t) => acc + (t.estimated_minutes || 0), 0)}m
                                </span>
                            </div>
                        </button>
                    {/each}
                {:else}
                    <div class="flex items-center justify-center h-full text-center p-6 text-resin-earth/50">
                        <div>
                            <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p class="text-xs">No sessions</p>
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right Panel: Session Detail -->
        <div
            class="flex-1 hidden sm:flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden"
        >
            {#if selectedSession}
                <!-- Detail Header -->
                <div class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-3">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <h2 class="text-2xl font-serif font-bold text-resin-charcoal truncate">
                                {selectedSession.title || selectedSession.display_title || 'Focus Session'}
                            </h2>
                            <p class="text-sm text-resin-earth/60 mt-1">
                                {new Date(selectedSession.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <div class="flex-shrink-0 inline-block px-3 py-1.5 rounded-lg bg-resin-forest/10 text-resin-forest text-[10px] font-bold uppercase tracking-widest">
                            {getStatusLabel(selectedSession.status)}
                        </div>
                    </div>
                </div>

                <!-- Daily Focus Window -->
                {#if profile?.availability_start && profile?.availability_end}
                    <section
                        class="flex-shrink-0 px-6 py-4 border-b border-resin-forest/5 bg-white/30"
                    >
                        <div class="flex items-center gap-4">
                            <div class="text-xs">
                                <div class="text-resin-earth/40 font-semibold mb-1">Focus Window</div>
                                <div class="font-semibold text-resin-charcoal">
                                    {formatTime(profile.availability_start)} – {formatTime(profile.availability_end)}
                                </div>
                            </div>
                        </div>
                    </section>
                {/if}

                <!-- Content Scroll -->
                <div class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">
                    <!-- Brain Dump -->
                    <section>
                        <h3 class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3">
                            Brain Dump
                        </h3>
                        <div class="bg-resin-earth/5 rounded-xl p-4 font-mono text-sm text-resin-charcoal/80 whitespace-pre-wrap leading-relaxed border border-resin-earth/10 max-h-48 overflow-y-auto">
                            {selectedSession.content || selectedSession.raw_text || 'No content'}
                        </div>
                    </section>

                    <!-- Plan Steps -->
                    {#if selectedSession.amber_tasks && selectedSession.amber_tasks.length > 0}
                        <section>
                            <h3 class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3">
                                Plan Steps ({selectedSession.amber_tasks.length})
                            </h3>
                            <div class="space-y-2">
                                {#each selectedSession.amber_tasks as task, i}
                                    <div class="flex gap-3 p-3 bg-white/50 rounded-lg border border-resin-forest/5">
                                        <div
                                            class="w-6 h-6 rounded-full bg-resin-forest/10 flex items-center justify-center text-xs font-bold text-resin-forest flex-shrink-0 mt-0.5"
                                        >
                                            {i + 1}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 mb-1">
                                                <span class="text-sm font-semibold text-resin-charcoal">{task.title}</span>
                                                <span class="text-xs text-resin-earth/50 font-mono">{task.estimated_minutes}m</span>
                                            </div>
                                            {#if task.requires_focus}
                                                <span class="inline-block text-[9px] font-bold text-resin-amber uppercase tracking-widest px-2 py-0.5 rounded bg-resin-amber/10 border border-resin-amber/20">
                                                    🛡 Shield
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}

                    <!-- Reflection (if available) -->
                    {#if selectedSession.rating || selectedSession.reflection}
                        <section>
                            <h3 class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3">
                                Reflection
                            </h3>
                            {#if selectedSession.rating}
                                <div class="mb-2">
                                    <span class="text-sm">{'⭐'.repeat(selectedSession.rating)}</span>
                                    <span class="text-xs text-resin-earth/50 ml-1">{selectedSession.rating}/5</span>
                                </div>
                            {/if}
                            {#if selectedSession.reflection}
                                <p class="text-sm text-resin-charcoal/80 italic bg-white/50 p-3 rounded-lg border border-resin-forest/5">
                                    {selectedSession.reflection}
                                </p>
                            {/if}
                        </section>
                    {/if}
                </div>

                <!-- Action Bar -->
                <div class="flex-shrink-0 px-6 py-4 border-t border-resin-forest/5 bg-white/30 flex items-center justify-end gap-3">
                    {#if selectedSession.status !== "scheduled" && selectedSession.status !== "completed"}
                        <form
                            method="POST"
                            action="?/activate"
                            use:enhance
                        >
                            <input
                                type="hidden"
                                name="sessionId"
                                value={selectedSession.id}
                            />
                            <button
                                type="submit"
                                class="px-5 py-2.5 bg-resin-amber text-white font-bold rounded-xl shadow-lg shadow-resin-amber/20 hover:shadow-resin-amber/40 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Activate Plan</span>
                            </button>
                        </form>
                    {:else}
                        <div class="text-xs font-medium text-resin-forest">
                            {selectedSession.status === 'scheduled' ? '🔥 Plan is active' : '✓ Completed'}
                        </div>
                    {/if}
                </div>
            {:else}
                <!-- Empty State -->
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <svg class="w-12 h-12 mx-auto text-resin-earth/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="text-resin-charcoal font-medium">No session selected</p>
                        <p class="text-sm text-resin-earth mt-1">Choose a session to view details</p>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</main>
