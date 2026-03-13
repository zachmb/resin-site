<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/stores";
    import { invalidateAll } from "$app/navigation";
    import { fly } from "svelte/transition";
    import SessionCelebration from './SessionCelebration.svelte';
    import AmberIgniteRitual from './AmberIgniteRitual.svelte';
    import ForestDecayAnimation from './ForestDecayAnimation.svelte';
    import ConfirmDeleteModal from './ConfirmDeleteModal.svelte';
    import { setCache, invalidateCache, clearCache } from '$lib/cache';

    let { profile, recentSessions = [], executionStats = null } = $props<{
        profile: any;
        recentSessions: any[];
        executionStats?: any;
    }>();

    let selectedSessionId = $state<string | null>(null);
    let showCelebration = $state(false);
    let celebrationData = $state<any>(null);
    let showRecoverySuggestion = $state(false);
    let showIgniteRitual = $state(false);
    let showDecayAnimation = $state(false);
    let decayAnimationData = $state<any>(null);
    let pendingSessionFailure = $state<string | null>(null);
    let pendingSessionCompletion = $state<string | null>(null);

    // Pre-select session from URL query parameter or auto-select first
    $effect(() => {
        const sessionIdFromUrl = $page.url.searchParams.get('sessionId');
        if (sessionIdFromUrl && !selectedSessionId) {
            selectedSessionId = sessionIdFromUrl;
        } else if (!selectedSessionId && filteredSessions.length > 0) {
            selectedSessionId = filteredSessions[0].id;
        }
    });
    let activeFilter = $state<'all'|'scheduled'|'completed'|'canceled'>('all');
    let showGoogleSignIn = $state(false);
    let googleSignInError = $state<string | null>(null);
    let activatingId = $state<string | null>(null);
    let successId = $state<string | null>(null);
    let showInsights = $state(false);
    let insightsLoading = $state(false);
    let insightsData = $state<any>(null);
    let editingTaskId = $state<string | null>(null);
    let editingTitle = $state('');
    let editingDuration = $state(0);
    let editingDescription = $state('');
    let savingTask = $state(false);
    let intensityValue = $state(0.5);
    let totalDuration = $state(0);
    let startTimeDate = $state('');
    let startTimeOffset = $state(0);
    let isSavingAdjustments = $state(false);
    let showDeleteModal = $state(false);
    let deleteFormRef = $state<HTMLFormElement | null>(null);
    let adjustmentSaveTimeout: ReturnType<typeof setTimeout>;

    const intensityLabels = ['Relaxed', 'Focused', 'Strict', 'Max'];
    const intensityColors = ['#2B4634', '#D97706', '#EA580C', '#DC2626'];

    const intensityLabel = $derived(intensityLabels[Math.min(3, Math.floor(intensityValue / 0.25))]);
    const intensityColor = $derived(intensityColors[Math.min(3, Math.floor(intensityValue / 0.25))]);

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60), m = mins % 60;
        return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
    };

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

    const handleSessionMissed = () => {
        if (!selectedSession) return;
        // Show decay animation with estimated losses
        const estimatedDecay = 15; // base decay amount
        const estimatedStonesLost = Math.floor(Math.random() * 3) + 1; // 1-3 stones

        showDecayAnimation = true;
        decayAnimationData = {
            decayAmount: estimatedDecay,
            stonesLost: estimatedStonesLost
        };

        // Submit form after animation completes
        pendingSessionFailure = selectedSession.id;
    };

    const submitSessionFailure = () => {
        if (pendingSessionFailure && selectedSessionId === pendingSessionFailure) {
            const form = document.querySelector(`#missed-form-${pendingSessionFailure}`) as HTMLFormElement;
            if (form) form.submit();
            pendingSessionFailure = null;
        }
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

    const isSessionPastEnd = $derived(
        selectedSession
            && selectedSession.status === 'scheduled'
            && selectedSession.amber_tasks?.at(-1)?.end_time
            && new Date(selectedSession.amber_tasks.at(-1).end_time) < new Date()
    );

    let today = new Date().toISOString();

    // Initialize adjustment controls when session changes
    $effect(() => {
        if (selectedSession) {
            intensityValue = selectedSession.intensity ?? 0.5;
            totalDuration = (selectedSession.amber_tasks || []).reduce((s: number, t: any) => s + (t.estimated_minutes ?? 0), 0);
            const firstTask = selectedSession.amber_tasks?.[0];
            startTimeDate = firstTask?.start_time ? firstTask.start_time.slice(0, 16) : '';
            startTimeOffset = 0;
        }
    });

    const saveIntensity = async () => {
        if (!selectedSession) return;
        isSavingAdjustments = true;
        try {
            const formData = new FormData();
            formData.append('sessionId', selectedSession.id);
            formData.append('intensity', intensityValue.toString());
            await fetch('?/updateIntensity', { method: 'POST', body: formData });
        } finally {
            isSavingAdjustments = false;
        }
    };

    const scaleDurations = async () => {
        if (!selectedSession) return;
        isSavingAdjustments = true;
        try {
            const currentTotal = (selectedSession.amber_tasks || []).reduce((s: number, t: any) => s + (t.estimated_minutes ?? 0), 0);
            if (currentTotal === 0) return;
            const formData = new FormData();
            formData.append('sessionId', selectedSession.id);
            formData.append('newTotal', totalDuration.toString());
            await fetch('?/scaleDurations', { method: 'POST', body: formData });
        } finally {
            isSavingAdjustments = false;
        }
    };

    const saveStartTime = async () => {
        if (!selectedSession || !startTimeDate) return;
        isSavingAdjustments = true;
        try {
            const formData = new FormData();
            formData.append('sessionId', selectedSession.id);
            formData.append('startTime', startTimeDate);
            await fetch('?/shiftStartTimes', { method: 'POST', body: formData });
        } finally {
            isSavingAdjustments = false;
        }
    };

    const shiftTimes = async () => {
        if (!selectedSession) return;
        isSavingAdjustments = true;
        try {
            const formData = new FormData();
            formData.append('sessionId', selectedSession.id);
            formData.append('offsetMinutes', startTimeOffset.toString());
            await fetch('?/shiftStartTimes', { method: 'POST', body: formData });
        } finally {
            isSavingAdjustments = false;
        }
    };
</script>

<main
    class="w-full h-screen pt-20 pb-4 px-4 sm:px-6 relative z-10 flex flex-col max-w-6xl mx-auto overflow-hidden"
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
    <div class="flex gap-6 flex-1 relative overflow-hidden">
        <!-- Left Panel: Session Browser -->
        <div
            class="flex-shrink-0 w-full sm:w-80 flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden"
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
                {#each (['all', 'scheduled', 'completed', 'canceled'] as const) as filter}
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
                            class="w-full text-left p-3 rounded-lg transition-all border {selectedSessionId === session.id
                                ? session.sessionType === 'focus'
                                    ? 'bg-resin-amber/5 border-resin-amber/20 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-resin-amber before:rounded-r-md'
                                    : 'bg-resin-forest/5 border-resin-forest/10 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-resin-forest before:rounded-r-md'
                                : session.sessionType === 'focus'
                                    ? 'border-transparent hover:bg-resin-amber/5'
                                    : 'border-transparent hover:bg-black/5'}"
                        >
                            <div class="flex items-start gap-2 mb-1">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <h3 class="font-semibold text-sm text-resin-charcoal truncate">
                                            {session.title || session.display_title || 'Focus Session'}
                                        </h3>
                                        {#if session.sessionType === 'focus'}
                                            <span class="flex-shrink-0 text-[9px] font-bold text-resin-amber px-1 py-0 rounded bg-resin-amber/15 border border-resin-amber/30 uppercase tracking-wider">
                                                🔥 Focus
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-shrink-0 text-[9px] font-bold text-white px-1.5 py-0.5 rounded {getStatusColor(session.status)}">
                                    {getStatusLabel(session.status)}
                                </div>
                            </div>
                            <div class="flex items-center justify-between text-xs text-resin-earth/60 gap-2">
                                <span>
                                    {new Date(session.amber_tasks?.[0]?.start_time || session.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span class="font-mono">
                                    {(session.amber_tasks || []).reduce((acc: number, t: any) => acc + (t.estimated_minutes || 0), 0)}m
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
                <div class="flex-shrink-0 px-6 py-6 border-b {selectedSession.sessionType === 'focus' ? 'border-resin-amber/10 bg-resin-amber/5' : 'border-resin-forest/5 bg-white/40'} space-y-3">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h2 class="text-2xl font-serif font-bold text-resin-charcoal truncate">
                                    {selectedSession.title || selectedSession.display_title || 'Focus Session'}
                                </h2>
                                {#if selectedSession.sessionType === 'focus'}
                                    <span class="flex-shrink-0 text-[10px] font-bold text-resin-amber px-1.5 py-0.5 rounded bg-resin-amber/20 border border-resin-amber/30 uppercase tracking-wider">
                                        🔥 Focus Block
                                    </span>
                                {/if}
                            </div>
                            <p class="text-sm text-resin-earth/60 mt-1">
                                {new Date(selectedSession.amber_tasks?.[0]?.start_time || selectedSession.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                            {#if executionStats && selectedSession.sessionType !== 'focus'}
                                <p class="text-xs text-resin-earth/50 italic mt-2">
                                    💡 {executionStats.label}
                                </p>
                            {/if}
                        </div>
                        <div class="flex-shrink-0 inline-block px-3 py-1.5 rounded-lg {selectedSession.sessionType === 'focus' ? 'bg-resin-amber/20 text-resin-amber' : 'bg-resin-forest/10 text-resin-forest'} text-[10px] font-bold uppercase tracking-widest">
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

                    <!-- Completion Prompt Banner -->
                    {#if isSessionPastEnd}
                        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                            <p class="font-semibold text-amber-800">Session ended — did you complete it?</p>
                            <div class="flex gap-2 flex-wrap">
                                <form method="POST" action="?/complete" use:enhance>
                                    <input type="hidden" name="sessionId" value={selectedSession.id} />
                                    <button class="px-4 py-2 bg-resin-forest text-white rounded-lg text-sm font-semibold hover:bg-resin-forest/90 transition">
                                        ✓ Yes, Completed
                                    </button>
                                </form>
                                <button
                                    onclick={handleSessionMissed}
                                    class="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition"
                                >
                                    ✗ Missed It
                                </button>
                                <!-- Hidden form for decay animation completion -->
                                <form
                                    id="missed-form-{selectedSession.id}"
                                    method="POST"
                                    action="?/markFailed"
                                    use:enhance
                                    style="display: none;"
                                >
                                    <input type="hidden" name="sessionId" value={selectedSession.id} />
                                </form>
                                <form method="POST" action="?/extendSession" use:enhance>
                                    <input type="hidden" name="sessionId" value={selectedSession.id} />
                                    <input type="hidden" name="extraMinutes" value="15" />
                                    <button class="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-200 transition">
                                        +15 min
                                    </button>
                                </form>
                            </div>
                        </div>
                    {/if}

                    <!-- Plan Steps -->
                    {#if selectedSession.amber_tasks && selectedSession.amber_tasks.length > 0}
                        <section>
                            <h3 class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3">
                                Plan Steps ({selectedSession.amber_tasks.length})
                            </h3>
                            <div class="space-y-2">
                                {#each selectedSession.amber_tasks as task, i (task.id)}
                                    {#if editingTaskId === task.id}
                                        <!-- Edit Mode -->
                                        <div class="space-y-3 p-4 bg-resin-forest/5 rounded-lg border border-resin-forest/20">
                                            <div>
                                                <label class="text-xs font-bold text-resin-earth/60 uppercase">Title</label>
                                                <input
                                                    type="text"
                                                    bind:value={editingTitle}
                                                    class="w-full mt-1 px-3 py-2 rounded-lg border border-resin-forest/10 bg-white text-sm font-semibold text-resin-charcoal focus:outline-none focus:border-resin-forest/30"
                                                />
                                            </div>
                                            <div>
                                                <label class="text-xs font-bold text-resin-earth/60 uppercase">Description (Optional)</label>
                                                <textarea
                                                    bind:value={editingDescription}
                                                    class="w-full mt-1 px-3 py-2 rounded-lg border border-resin-forest/10 bg-white text-sm text-resin-charcoal focus:outline-none focus:border-resin-forest/30 resize-none"
                                                    style="min-height: auto; height: {Math.min(200, Math.max(50, editingDescription.split('\n').length * 20 + 30))}px"
                                                />
                                            </div>
                                            <div class="flex gap-2 pt-2">
                                                <button
                                                    onclick={async () => {
                                                        savingTask = true;
                                                        try {
                                                            const formData = new FormData();
                                                            formData.append('sessionId', selectedSession.id);
                                                            formData.append('taskId', task.id);
                                                            formData.append('title', editingTitle);
                                                            formData.append('description', editingDescription);
                                                            formData.append('estimatedMinutes', editingDuration.toString());

                                                            const res = await fetch('?/updateTask', {
                                                                method: 'POST',
                                                                body: formData
                                                            });

                                                            if (res.ok) {
                                                                task.title = editingTitle;
                                                                task.description = editingDescription;
                                                                task.estimated_minutes = editingDuration;
                                                                editingTaskId = null;
                                                            }
                                                        } finally {
                                                            savingTask = false;
                                                        }
                                                    }}
                                                    disabled={savingTask}
                                                    class="flex-1 px-3 py-2 bg-resin-forest text-white text-xs font-bold rounded-lg hover:bg-resin-charcoal transition-colors disabled:opacity-50"
                                                >
                                                    {savingTask ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                    onclick={() => editingTaskId = null}
                                                    class="flex-1 px-3 py-2 border border-resin-earth/20 text-resin-earth/60 text-xs font-bold rounded-lg hover:bg-resin-earth/5 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    {:else}
                                        <!-- View Mode -->
                                        <div class="flex gap-3 p-3 bg-white/50 rounded-lg border border-resin-forest/5 group hover:border-resin-forest/10 transition-colors">
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
                                                {#if task.start_time && task.end_time}
                                                    <div class="text-xs text-resin-forest/70 font-semibold mb-1">
                                                        {new Date(task.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {' '}
                                                        {new Date(task.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {new Date(task.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                {/if}
                                                {#if task.description}
                                                    <p class="text-xs text-resin-earth/60 mb-1 whitespace-pre-wrap">{task.description}</p>
                                                {/if}
                                                {#if task.requires_focus}
                                                    <span class="inline-block text-[9px] font-bold text-resin-amber uppercase tracking-widest px-2 py-0.5 rounded bg-resin-amber/10 border border-resin-amber/20">
                                                        🛡 Shield
                                                    </span>
                                                {/if}
                                            </div>
                                            <button
                                                onclick={() => {
                                                    editingTaskId = task.id;
                                                    editingTitle = task.title;
                                                    editingDescription = task.description || '';
                                                    editingDuration = task.estimated_minutes;
                                                }}
                                                class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-resin-earth/50 hover:text-resin-charcoal hover:bg-black/5 rounded text-xs font-bold"
                                            >
                                                ✎ Edit
                                            </button>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                        </section>
                    {/if}

                    <!-- Adjustments (for scheduled amber sessions only - not focus blocks) -->
                    {#if selectedSession.status === 'scheduled' && selectedSession.sessionType !== 'focus'}
                        <div class="mt-4 pt-4 border-t border-resin-earth/10 space-y-5">
                            <div class="flex items-center justify-between">
                                <p class="text-xs font-semibold text-resin-earth/50 uppercase tracking-wider">Adjustments</p>
                                {#if isSavingAdjustments}
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-1.5 h-1.5 rounded-full bg-resin-forest animate-pulse"></div>
                                        <span class="text-[10px] text-resin-forest font-bold uppercase">Saving...</span>
                                    </div>
                                {/if}
                            </div>

                            <!-- Intensity -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs font-medium text-resin-earth/70">Enforcement Intensity</span>
                                    <span class="text-xs font-bold" style="color: {intensityColor}">
                                        {intensityLabel} · {Math.round(intensityValue * 100)}%
                                    </span>
                                </div>
                                <input type="range" min="0" max="1" step="0.05"
                                       bind:value={intensityValue}
                                       oninput={() => {
                                           clearTimeout(adjustmentSaveTimeout);
                                           adjustmentSaveTimeout = setTimeout(() => saveIntensity(), 800);
                                       }}
                                       class="w-full accent-resin-forest" />
                            </div>

                            <!-- Duration -->
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs font-medium text-resin-earth/70">Total Duration</span>
                                    <span class="text-xs font-bold text-resin-forest">{formatDuration(totalDuration)}</span>
                                </div>
                                <input type="range" min="5" max="480" step="5"
                                       bind:value={totalDuration}
                                       oninput={() => {
                                           clearTimeout(adjustmentSaveTimeout);
                                           adjustmentSaveTimeout = setTimeout(() => scaleDurations(), 800);
                                       }}
                                       class="w-full accent-resin-forest" />
                            </div>

                            <!-- Start Time -->
                            {#if startTimeDate}
                            <div class="space-y-2">
                                <span class="text-xs font-medium text-resin-earth/70">Start Time</span>
                                <input type="datetime-local" bind:value={startTimeDate} onchange={saveStartTime}
                                       class="w-full text-sm border border-resin-earth/20 rounded-lg px-2 py-1 focus:outline-none focus:border-resin-forest/50" />
                                <div class="space-y-1">
                                    <input type="range" min="-120" max="120" step="15"
                                           bind:value={startTimeOffset}
                                           oninput={() => {
                                               clearTimeout(adjustmentSaveTimeout);
                                               adjustmentSaveTimeout = setTimeout(() => shiftTimes(), 800);
                                           }}
                                           class="w-full accent-amber-500" />
                                    <div class="flex justify-between text-xs text-resin-earth/40">
                                        <span>-2h</span>
                                        <span class="font-semibold text-amber-600">
                                            {startTimeOffset === 0 ? 'No shift' : startTimeOffset > 0 ? `+${startTimeOffset}m` : `${startTimeOffset}m`}
                                        </span>
                                        <span>+2h</span>
                                    </div>
                                </div>
                            </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- Info for Focus Sessions -->
                    {#if selectedSession.sessionType === 'focus'}
                        <div class="mt-4 pt-4 border-t border-resin-amber/20 bg-resin-amber/5 p-3 rounded-lg">
                            <p class="text-xs text-resin-amber/80">
                                <span class="font-semibold">Focus Block:</span> This is an automated focus session from your schedule. It will automatically mark as completed when the timer reaches zero.
                            </p>
                        </div>
                    {/if}

                    <!-- Action Buttons (amber sessions only) -->
                    {#if selectedSession.status === 'scheduled' && selectedSession.sessionType === 'amber'}
                        <div class="pt-4 space-y-3">
                            <!-- Hidden form for actual submission -->
                            <form
                                id="complete-form-{selectedSession.id}"
                                method="POST"
                                action="?/complete"
                                use:enhance={() => {
                                    return async ({ result }: any) => {
                                        if (result.type === 'success' && result.data?.reward) {
                                            const reward = result.data.reward as any;
                                            celebrationData = {
                                                totalStones: reward.totalStones || 3,
                                                bonusStones: reward.bonusStones || 0,
                                                forestHealthGain: reward.forestHealthGain || 3,
                                                celebrationLevel: reward.celebrationLevel || 'standard',
                                                message: reward.message || 'Session completed!'
                                            };
                                            showCelebration = true;
                                            setTimeout(() => { showCelebration = false; }, 3000);

                                            // Show recovery suggestion if session was long without bonus
                                            if (result.data?.suggestRecovery) {
                                                setTimeout(() => {
                                                    showRecoverySuggestion = true;
                                                    setTimeout(() => { showRecoverySuggestion = false; }, 5000);
                                                }, 4000);
                                            }
                                        }
                                    };
                                }}
                            >
                                <input
                                    type="hidden"
                                    name="sessionId"
                                    value={selectedSession.id}
                                />
                            </form>

                            <!-- Button triggers ritual instead of form -->
                            <button
                                onclick={() => {
                                    showIgniteRitual = true;
                                    pendingSessionCompletion = selectedSession.id;
                                }}
                                class="w-full px-4 py-2.5 bg-resin-forest text-white font-bold rounded-xl hover:bg-resin-charcoal transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Complete
                            </button>
                            <form
                                method="POST"
                                action="?/cancel"
                                use:enhance
                            >
                                <input
                                    type="hidden"
                                    name="sessionId"
                                    value={selectedSession.id}
                                />
                                <button
                                    type="submit"
                                    class="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-600 font-bold rounded-xl hover:bg-red-500/20 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                            </form>
                        </div>
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
                <div class="flex-shrink-0 px-6 py-4 border-t border-resin-forest/5 bg-white/30 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                        {#if selectedSession.status === 'scheduled'}
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-resin-amber/10 border border-resin-amber/20 rounded-full">
                                <div class="w-1.5 h-1.5 rounded-full bg-resin-amber animate-pulse"></div>
                                <span class="text-[10px] font-bold uppercase tracking-widest text-resin-amber">Scheduled · {formatDuration(sessionFocusMinutes)}</span>
                            </div>
                        {:else if selectedSession.status === 'completed'}
                            <div class="flex items-center gap-2 px-4 py-2 bg-resin-forest/10 rounded-xl border border-resin-forest/20">
                                <svg class="w-4 h-4 text-resin-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span class="text-xs font-bold text-resin-forest uppercase">Completed</span>
                            </div>
                        {:else if selectedSession.status === 'canceled'}
                            <div class="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span class="text-xs font-bold text-red-600 uppercase">Canceled</span>
                            </div>
                        {/if}
                    </div>

                    <div class="flex items-center justify-end gap-2">
                        {#if selectedSession.status === 'failed'}
                            <form
                                method="POST"
                                action="?/activate"
                                use:enhance={({ formElement, cancel }) => {
                                    activatingId = selectedSession.id;
                                    // Optimistic update - show success immediately
                                    if (selectedSession) {
                                        const updatedSession = { ...selectedSession, status: 'scheduled' };
                                        setCache(`session-${selectedSession.id}`, updatedSession, 60000);
                                    }
                                    return async ({ result }) => {
                                        if (result.type === 'failure' && result.data?.code === 'google_not_connected') {
                                            activatingId = null;
                                            showGoogleSignIn = true;
                                            googleSignInError = result.data?.error as string;
                                        } else if (result.type === 'success') {
                                            // Cache the confirmed session
                                            if (selectedSession) {
                                                setCache(`session-${selectedSession.id}`, selectedSession, 60000);
                                                invalidateCache('sessions-list');
                                            }
                                            successId = selectedSession.id;
                                            setTimeout(() => {
                                                activatingId = null;
                                                successId = null;
                                            }, 1200);
                                        } else {
                                            activatingId = null;
                                        }
                                    };
                                }}
                            >
                                <input
                                    type="hidden"
                                    name="sessionId"
                                    value={selectedSession.id}
                                />
                                <button
                                    type="submit"
                                    disabled={activatingId === selectedSession.id}
                                    class="px-5 py-2.5 bg-resin-amber text-white font-bold rounded-xl shadow-lg shadow-resin-amber/20 hover:shadow-resin-amber/40 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 disabled:opacity-90 disabled:cursor-not-allowed active:scale-95 relative overflow-hidden"
                                >
                                    {#if activatingId === selectedSession.id}
                                        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    {:else if successId === selectedSession.id}
                                        <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    {/if}
                                    <span>{successId === selectedSession.id ? 'Activated!' : 'Activate Plan'}</span>
                                </button>
                            </form>
                        {/if}
                        <form
                            method="POST"
                            action="?/delete"
                            bind:this={deleteFormRef}
                            use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        selectedSessionId = null;
                                        clearCache();
                                        await invalidateAll();
                                    } else if (result.type === 'failure') {
                                        console.error('Delete failed:', result.data?.error);
                                    } else if (result.type === 'error') {
                                        console.error('Delete error:', result.error?.message);
                                    }
                                };
                            }}
                        >
                            <input
                                type="hidden"
                                name="sessionId"
                                value={selectedSession.id}
                            />
                            <button
                                type="button"
                                onclick={() => (showDeleteModal = true)}
                                class="px-3 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all text-sm font-bold flex items-center justify-center gap-1.5"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </button>
                        </form>
                        {#if selectedSession.status === 'completed'}
                            <button
                                onclick={async () => {
                                    if (insightsLoading || showInsights) return;
                                    insightsLoading = true;
                                    try {
                                        const res = await fetch('/api/insights/generate', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ sessionId: selectedSession.id })
                                        });
                                        if (res.ok) {
                                            insightsData = await res.json();
                                            showInsights = true;
                                        }
                                    } finally {
                                        insightsLoading = false;
                                    }
                                }}
                                disabled={insightsLoading}
                                class="px-4 py-2.5 bg-resin-amber/10 border border-resin-amber/30 text-resin-amber font-semibold rounded-xl hover:bg-resin-amber/20 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {#if insightsLoading}
                                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Loading...</span>
                                {:else}
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Insights</span>
                                {/if}
                            </button>
                        {/if}
                    </div>
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

    <!-- Google Sign In Modal -->
    {#if showGoogleSignIn}
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
                <!-- Icon -->
                <div class="flex justify-center">
                    <div class="w-16 h-16 bg-resin-amber/10 rounded-full flex items-center justify-center">
                        <svg class="w-8 h-8 text-resin-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m6 2a6 6 0 11-12 0 6 6 0 0112 0zM12 9v2m-2-2h4" />
                        </svg>
                    </div>
                </div>

                <!-- Title -->
                <div class="text-center">
                    <h2 class="text-2xl font-bold text-resin-charcoal mb-2">
                        Connect Google Calendar
                    </h2>
                    <p class="text-sm text-resin-earth/70">
                        To schedule your plans, we need access to your Google Calendar.
                    </p>
                </div>

                {#if googleSignInError}
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p class="text-sm text-red-700">{googleSignInError}</p>
                    </div>
                {/if}

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <button
                        onclick={() => {
                            showGoogleSignIn = false;
                            googleSignInError = null;
                        }}
                        class="flex-1 px-4 py-2.5 border border-resin-earth/20 rounded-lg text-resin-charcoal font-semibold hover:bg-resin-earth/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <form method="POST" action="/account?/signInWithGoogle" class="flex-1">
                        <button
                            type="submit"
                            class="w-full px-4 py-2.5 bg-resin-amber text-white font-semibold rounded-lg hover:bg-resin-amber/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>
                    </form>
                </div>

                <p class="text-xs text-resin-earth/50 text-center">
                    We use your Google Calendar to find the best time to schedule your focus sessions.
                </p>
            </div>
        </div>
    {/if}

    <!-- Insights Modal -->
    {#if showInsights && insightsData}
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6">
                <!-- Header -->
                <div class="flex items-start justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-2">
                            <svg class="w-6 h-6 text-resin-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Session Insights
                        </h2>
                        <p class="text-sm text-resin-earth/60 mt-1">{selectedSession?.display_title}</p>
                    </div>
                    <button
                        onclick={() => showInsights = false}
                        aria-label="Close insights"
                        class="text-resin-earth/40 hover:text-resin-earth/60 transition-colors"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Metrics -->
                <div class="grid grid-cols-4 gap-4">
                    <div class="bg-resin-forest/5 rounded-lg p-4">
                        <p class="text-xs text-resin-earth/60 font-semibold">Est. Time</p>
                        <p class="text-2xl font-bold text-resin-charcoal">{insightsData.insights.totalEstimated}m</p>
                    </div>
                    <div class="bg-resin-amber/5 rounded-lg p-4">
                        <p class="text-xs text-resin-earth/60 font-semibold">Actual</p>
                        <p class="text-2xl font-bold text-resin-amber">{insightsData.insights.totalActual}m</p>
                    </div>
                    <div class="bg-resin-forest/5 rounded-lg p-4">
                        <p class="text-xs text-resin-earth/60 font-semibold">Completed</p>
                        <p class="text-2xl font-bold text-resin-charcoal">{insightsData.insights.completedTasks}/{insightsData.insights.taskCount}</p>
                    </div>
                    <div class="bg-blue-100/50 rounded-lg p-4">
                        <p class="text-xs text-resin-earth/60 font-semibold">Accuracy</p>
                        <p class="text-2xl font-bold text-blue-600">{insightsData.insights.accuracy}%</p>
                    </div>
                </div>

                <!-- AI Insights -->
                {#if insightsData.aiInsights}
                    <div class="bg-gradient-to-br from-resin-amber/10 to-orange-100/20 rounded-xl p-6 border border-resin-amber/20">
                        <h3 class="font-bold text-resin-charcoal mb-3 flex items-center gap-2">
                            <span>💡</span>
                            AI Feedback
                        </h3>
                        <div class="text-sm text-resin-charcoal/80 whitespace-pre-wrap leading-relaxed font-light">
                            {insightsData.aiInsights}
                        </div>
                    </div>
                {/if}

                <!-- Close Button -->
                <div class="flex gap-3">
                    <button
                        onclick={() => showInsights = false}
                        class="flex-1 px-4 py-3 border border-resin-earth/20 rounded-lg text-resin-charcoal font-semibold hover:bg-resin-earth/5 transition-colors"
                    >
                        Done
                    </button>
                    <button
                        onclick={() => {
                            if (typeof window !== 'undefined') {
                                window.location.href = '/insights';
                            }
                        }}
                        class="flex-1 px-4 py-3 bg-resin-forest/10 border border-resin-forest/20 rounded-lg text-resin-forest font-semibold hover:bg-resin-forest/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <span>View All Stats</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    {/if}
</main>

<!-- Ignite ritual before session completion -->
{#if selectedSession && pendingSessionCompletion === selectedSession.id}
    <AmberIgniteRitual
        visible={showIgniteRitual}
        planTitle={selectedSession.display_title || 'Amber Session'}
        durationMinutes={selectedSession.ai_plan?.[0]?.duration_minutes || 30}
        onIgnite={() => {
            showIgniteRitual = false;
            pendingSessionCompletion = null;
            // Submit the hidden form
            const form = document.getElementById(`complete-form-${selectedSession.id}`) as HTMLFormElement;
            if (form) form.submit();
        }}
    />
{/if}

<!-- Celebration overlay on session completion -->
{#if celebrationData}
    <SessionCelebration
        visible={showCelebration}
        totalStones={celebrationData.totalStones}
        bonusStones={celebrationData.bonusStones}
        forestHealthGain={celebrationData.forestHealthGain}
        celebrationLevel={celebrationData.celebrationLevel}
        message={celebrationData.message}
    />
{/if}

<!-- Decay animation overlay on session failure -->
{#if decayAnimationData}
    <ForestDecayAnimation
        visible={showDecayAnimation}
        decayAmount={decayAnimationData.decayAmount}
        stonesLost={decayAnimationData.stonesLost}
        message="Session missed — your forest weakens..."
        onComplete={submitSessionFailure}
    />
{/if}

<!-- Recovery suggestion toast -->
{#if showRecoverySuggestion}
    <div
        class="fixed bottom-8 right-8 max-w-sm z-40 rounded-xl p-4 bg-gradient-to-r from-resin-forest/90 to-resin-forest/80 text-white shadow-lg border border-white/20"
        transition:fly={{ x: 400, duration: 300 }}
    >
        <div class="flex items-center gap-3">
            <span class="text-2xl">☕</span>
            <div>
                <p class="font-semibold text-sm">Great work! 🎯</p>
                <p class="text-xs text-white/80 mt-1">Consider a 10-min break before your next session.</p>
            </div>
        </div>
    </div>
{/if}

<!-- Delete confirmation modal -->
<ConfirmDeleteModal
    isOpen={showDeleteModal}
    title="Delete This Plan?"
    message="Deleting this plan will permanently remove it and all its tasks. This action cannot be undone."
    onConfirm={() => {
        showDeleteModal = false;
        deleteFormRef?.requestSubmit();
    }}
    onCancel={() => (showDeleteModal = false)}
/>

<style>
    :global {
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @keyframes bounce {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-4px);
            }
        }

        .animate-spin {
            animation: spin 1s linear infinite;
        }

        .animate-bounce {
            animation: bounce 0.6s ease-in-out;
        }
    }
</style>
