<script lang="ts">
    import { enhance } from '$app/forms';
    import { fade, slide } from 'svelte/transition';
    import FocusControl from '$lib/components/FocusControl.svelte';

    let { data } = $props();

    let activeSessions = $state(data.activeSessions || []);
    let scheduledSessions = $state(data.scheduledSessions || []);
    let showScheduleForm = $state(false);
    let showAutomationForm = $state(false);

    let scheduleTitle = $state('');
    let scheduleDate = $state(new Date().toISOString().split('T')[0]);
    let scheduleTime = $state('09:00');
    let scheduleDuration = $state(30);

    let automationTitle = $state('');
    let automationDuration = $state(25);
    let automationDaysOfWeek = $state<string[]>(['Monday', 'Wednesday', 'Friday']);
    let automationTime = $state('09:00');

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const toggleDayOfWeek = (day: string) => {
        if (automationDaysOfWeek.includes(day)) {
            automationDaysOfWeek = automationDaysOfWeek.filter(d => d !== day);
        } else {
            automationDaysOfWeek = [...automationDaysOfWeek, day];
        }
    };
</script>

<main class="w-full min-h-screen pt-28 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-4">
            Focus & Automation
        </div>
        <h1 class="text-5xl font-bold text-resin-charcoal mb-2">
            Focus Sessions
        </h1>
        <p class="text-resin-earth/60">
            Control when your phone blocks distractions. All sessions sync instantly to your device.
        </p>
    </div>

    <!-- Quick Focus (FocusControl) -->
    <section class="mb-12">
        <FocusControl />
    </section>

    <!-- Active Sessions -->
    {#if activeSessions.length > 0}
        <section class="mb-12" transition:fade>
            <h2 class="text-2xl font-bold text-resin-charcoal mb-6 flex items-center gap-3">
                <svg class="w-6 h-6 text-resin-amber" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 112 0 1 1 0 01-2 0z" />
                </svg>
                Active Now ({activeSessions.length})
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each activeSessions as session (session.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-amber/30 bg-resin-amber/5" transition:slide>
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <h3 class="font-bold text-resin-charcoal">{session.title}</h3>
                                <p class="text-xs text-resin-earth/60 mt-1">
                                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                </p>
                            </div>
                            <div class="w-3 h-3 rounded-full bg-resin-amber animate-pulse"></div>
                        </div>

                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs mb-2">
                                <span class="text-resin-earth/60">Progress</span>
                                <span class="font-bold text-resin-charcoal">
                                    {Math.round((new Date().getTime() - new Date(session.start_time).getTime()) / (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) * 100)}%
                                </span>
                            </div>
                            <div class="h-2 bg-resin-earth/10 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-resin-amber transition-all"
                                    style="width: {Math.round((new Date().getTime() - new Date(session.start_time).getTime()) / (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) * 100)}%"
                                ></div>
                            </div>
                        </div>

                        <form method="POST" action="?/cancelSession" use:enhance>
                            <input type="hidden" name="sessionId" value={session.id} />
                            <button
                                type="submit"
                                class="w-full text-xs font-bold text-resin-amber hover:text-red-500 transition-colors py-2"
                            >
                                End Session Early
                            </button>
                        </form>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Scheduled Sessions -->
    <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <svg class="w-6 h-6 text-resin-forest" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5H4v9a2 2 0 002 2h12a2 2 0 002-2V7h-2v1a1 1 0 11-2 0V7H9v1a1 1 0 11-2 0V7H6v1a1 1 0 11-2 0V7z" />
                </svg>
                Scheduled Sessions
            </h2>
            <button
                onclick={() => showScheduleForm = !showScheduleForm}
                class="px-4 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all"
            >
                + Schedule
            </button>
        </div>

        {#if showScheduleForm}
            <form
                method="POST"
                action="?/scheduleSession"
                use:enhance
                class="glass-card rounded-2xl p-6 mb-6 border border-resin-forest/20 bg-resin-forest/5"
                transition:slide
            >
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                            What are you focusing on?
                        </label>
                        <input
                            type="text"
                            name="title"
                            bind:value={scheduleTitle}
                            placeholder="e.g., Deep Work Session"
                            required
                            class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                name="date"
                                bind:value={scheduleDate}
                                required
                                class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                name="time"
                                bind:value={scheduleTime}
                                required
                                class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-3">
                            Duration: {scheduleDuration} minutes
                        </label>
                        <input
                            type="range"
                            name="duration"
                            bind:value={scheduleDuration}
                            min="15"
                            max="480"
                            step="15"
                            class="w-full"
                        />
                        <div class="flex justify-between text-xs text-resin-earth/60 mt-2">
                            <span>15 min</span>
                            <span>8 hours</span>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!scheduleTitle.trim()}
                            class="flex-1 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all disabled:opacity-50"
                        >
                            Schedule Session
                        </button>
                        <button
                            type="button"
                            onclick={() => showScheduleForm = false}
                            class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        {/if}

        {#if scheduledSessions.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each scheduledSessions as session (session.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-forest/20" transition:slide>
                        <h3 class="font-bold text-resin-charcoal mb-1">{session.title}</h3>
                        <p class="text-xs text-resin-earth/60 mb-4">
                            {formatDateTime(session.start_time)} • {session.duration_minutes || Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)} min
                        </p>

                        <form method="POST" action="?/cancelSession" use:enhance>
                            <input type="hidden" name="sessionId" value={session.id} />
                            <button
                                type="submit"
                                class="text-xs font-bold text-resin-earth/60 hover:text-red-500 transition-colors"
                            >
                                Remove Schedule
                            </button>
                        </form>
                    </div>
                {/each}
            </div>
        {:else if !showScheduleForm}
            <p class="text-resin-earth/60 text-sm">No scheduled sessions yet.</p>
        {/if}
    </section>

    <!-- Automations -->
    <section>
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <svg class="w-6 h-6 text-resin-lavender" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM5.757 4.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" />
                </svg>
                Automations & Recurring
            </h2>
            <button
                onclick={() => showAutomationForm = !showAutomationForm}
                class="px-4 py-2 bg-resin-lavender text-white rounded-lg text-xs font-bold hover:bg-resin-lavender/80 transition-all"
            >
                + Create
            </button>
        </div>

        {#if showAutomationForm}
            <form
                method="POST"
                action="?/createAutomation"
                use:enhance
                class="glass-card rounded-2xl p-6 mb-6 border border-resin-lavender/20 bg-resin-lavender/5"
                transition:slide
            >
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                            Automation Name
                        </label>
                        <input
                            type="text"
                            name="title"
                            bind:value={automationTitle}
                            placeholder="e.g., Morning Focus Block"
                            required
                            class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-3">
                            Repeats On
                        </label>
                        <div class="flex flex-wrap gap-2">
                            {#each daysOfWeek as day}
                                <button
                                    type="button"
                                    onclick={() => toggleDayOfWeek(day)}
                                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {automationDaysOfWeek.includes(day)
                                        ? 'bg-resin-lavender text-white'
                                        : 'bg-resin-earth/10 text-resin-earth hover:bg-resin-earth/20'}"
                                >
                                    {day.slice(0, 3)}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                name="time"
                                bind:value={automationTime}
                                required
                                class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Duration (min)
                            </label>
                            <input
                                type="number"
                                name="duration"
                                bind:value={automationDuration}
                                min="15"
                                max="480"
                                required
                                class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                            />
                        </div>
                    </div>

                    <input type="hidden" name="daysOfWeek" value={automationDaysOfWeek.join(',')} />

                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!automationTitle.trim() || automationDaysOfWeek.length === 0}
                            class="flex-1 py-2 bg-resin-lavender text-white rounded-lg text-xs font-bold hover:bg-resin-lavender/80 transition-all disabled:opacity-50"
                        >
                            Create Automation
                        </button>
                        <button
                            type="button"
                            onclick={() => showAutomationForm = false}
                            class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        {/if}

        {#if data.automations && data.automations.length > 0}
            <div class="space-y-3">
                {#each data.automations as automation (automation.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-lavender/20" transition:slide>
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="font-bold text-resin-charcoal">{automation.title}</h3>
                            <form method="POST" action="?/deleteAutomation" use:enhance>
                                <input type="hidden" name="automationId" value={automation.id} />
                                <button
                                    type="submit"
                                    class="text-resin-earth/60 hover:text-red-500 transition-colors"
                                >
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                        <p class="text-xs text-resin-earth/60">
                            {automation.days_of_week.split(',').join(', ')} at {automation.time} • {automation.duration_minutes} min
                        </p>
                    </div>
                {/each}
            </div>
        {:else if !showAutomationForm}
            <p class="text-resin-earth/60 text-sm">No automations yet. Create one to block distractions on a schedule.</p>
        {/if}
    </section>
</main>

<style>
</style>
