<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import { enhance } from '$app/forms';

    let { 
        sessions = [], 
        externalEvents = [], 
        onSelectSession, 
        selectedSessionIds = [],
        onToggleSelect,
        onClearDay
    } = $props<{
        sessions: any[];
        externalEvents: any[];
        onSelectSession: (id: string) => void;
        selectedSessionIds: string[];
        onToggleSelect: (id: string) => void;
        onClearDay: (day: Date) => void;
    }>();

    let viewDays = $state(7);
    let startDate = $state(new Date(new Date().setHours(0, 0, 0, 0)));

    const days = $derived(
        Array.from({ length: viewDays }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            return d;
        })
    );

    // Calculate min and max hours from scheduled sessions
    const hourRange = $derived.by(() => {
        let minHour = 24;
        let maxHour = -1;

        sessions.forEach((s: any) => {
            const taskStart = s.amber_tasks?.[0]?.start_time || s.created_at;
            const taskEnd = s.amber_tasks?.[s.amber_tasks.length - 1]?.end_time;

            if (taskStart) {
                const startHour = new Date(taskStart).getHours();
                minHour = Math.min(minHour, startHour);
            }
            if (taskEnd) {
                const endHour = new Date(taskEnd).getHours();
                maxHour = Math.max(maxHour, endHour);
            }
        });

        // If no sessions, show business hours (9-17)
        if (minHour === 24) {
            minHour = 9;
            maxHour = 17;
        }

        return { minHour, maxHour: Math.max(maxHour, minHour) };
    });

    const hours = $derived(
        Array.from({ length: hourRange.maxHour - hourRange.minHour + 1 }, (_, i) => hourRange.minHour + i)
    );

    const getPosition = (dateStr: string) => {
        const d = new Date(dateStr);
        const totalMins = d.getHours() * 60 + d.getMinutes();
        const minHourMins = hourRange.minHour * 60;
        const rangeMins = (hourRange.maxHour - hourRange.minHour + 1) * 60;
        return ((totalMins - minHourMins) / rangeMins) * 100;
    };

    const getDurationHeight = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diff = (e.getTime() - s.getTime()) / (1000 * 60);
        const rangeMins = (hourRange.maxHour - hourRange.minHour + 1) * 60;
        return (diff / rangeMins) * 100;
    };

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const getSessionsForDay = (day: Date) => 
        sessions.filter((s: any) => {
            const taskStart = s.amber_tasks?.[0]?.start_time || s.created_at;
            return isSameDay(new Date(taskStart), day);
        });

    const getExternalEventsForDay = (day: Date) =>
        externalEvents.filter((e: any) => isSameDay(new Date(e.start), day));

    let isDeleting = $state(false);
    let clearingDate = $state<string | null>(null);

    const confirmClearDay = (day: Date) => {
        onClearDay(day);
    };
</script>

<div class="flex flex-col bg-white/40 backdrop-blur-xl rounded-2xl border border-resin-forest/10 shadow-premium mb-12">
    <!-- Calendar Header -->
    <div class="p-4 border-b border-resin-forest/5 bg-white/40 flex items-center justify-between sticky top-[80px] z-30">
        <div class="flex items-center gap-4">
            <h2 class="text-lg font-serif font-bold text-resin-charcoal">Calendar View</h2>
            <div class="flex bg-resin-earth/5 p-1 rounded-lg">
                <button
                    onclick={() => viewDays = 7}
                    class="px-3 py-1 text-xs font-bold rounded-md transition-all {viewDays === 7 ? 'bg-white shadow-sm text-resin-forest' : 'text-resin-earth/50 hover:text-resin-earth'}"
                >7D</button>
            </div>
        </div>

        <div class="flex items-center gap-2">
            {#if selectedSessionIds.length > 0}
                <form 
                    method="POST" 
                    action="?/bulkDelete" 
                    use:enhance={() => {
                        isDeleting = true;
                        return async ({ result }) => {
                            isDeleting = false;
                        };
                    }}
                    transition:fade
                >
                    <input type="hidden" name="sessionIds" value={JSON.stringify(selectedSessionIds)} />
                    <button 
                        type="submit"
                        disabled={isDeleting}
                        class="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-2"
                    >
                        {#if isDeleting}
                            <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
                        {:else}
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        {/if}
                        Delete ({selectedSessionIds.length})
                    </button>
                </form>
            {/if}
            
            <button 
                onclick={() => {
                    const d = new Date();
                    d.setHours(0,0,0,0);
                    startDate = d;
                }}
                class="px-3 py-2 text-xs font-bold text-resin-forest hover:bg-resin-forest/5 rounded-xl transition-all"
            >
                Today
            </button>
            <div class="flex gap-1">
                <button 
                    onclick={() => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() - viewDays);
                        startDate = d;
                    }}
                    aria-label="Previous days"
                    class="p-2 hover:bg-black/5 rounded-full transition-all text-resin-earth/60"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    onclick={() => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() + viewDays);
                        startDate = d;
                    }}
                    aria-label="Next days"
                    class="p-2 hover:bg-black/5 rounded-full transition-all text-resin-earth/60"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Calendar Grid -->
    <div class="flex min-w-[800px] relative" style="height: {(hourRange.maxHour - hourRange.minHour + 1) * 60}px;">
        <!-- Time Sidebar -->
        <div class="w-16 border-r border-resin-forest/5 flex-shrink-0 bg-white/20 relative z-20">
            {#each hours as hour}
                <div class="h-[60px] border-b border-resin-forest/5 flex items-start justify-center pt-2">
                    <span class="text-[10px] font-mono font-bold text-resin-earth/40 uppercase">
                        {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                    </span>
                </div>
            {/each}
        </div>

        <!-- Days -->
        {#each days as day, i}
            <div class="flex-1 border-r border-resin-forest/5 relative group">
                <!-- Day Header -->
                <div class="sticky top-[137px] z-10 bg-white/60 backdrop-blur-md p-3 border-b border-resin-forest/5 text-center">
                    <div class="text-[10px] uppercase font-bold tracking-widest text-resin-earth/50">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div class="text-lg font-serif font-bold text-resin-charcoal">
                        {day.getDate()}
                    </div>
                    
                    <!-- Clear Day Button -->
                    <button 
                        type="button"
                        onclick={() => confirmClearDay(day)}
                        disabled={clearingDate === day.toISOString()}
                        class="absolute top-2 right-2 opacity-40 hover:opacity-100 transition-opacity p-1.5 px-3 text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white rounded-lg bg-white shadow-premium border border-red-100 uppercase tracking-tighter flex items-center gap-1 disabled:opacity-50"
                    >
                        {#if clearingDate === day.toISOString()}
                            <div class="w-2.5 h-2.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                        {/if}
                        Clear
                    </button>
                </div>

                <!-- Grid Lines -->
                {#each hours as hour}
                    <div class="h-[60px] border-b border-resin-forest/5 opacity-30"></div>
                {/each}

                <!-- Amber Sessions -->
                {#each getSessionsForDay(day) as session}
                    {@const start = session.amber_tasks?.[0]?.start_time || session.created_at}
                    {@const end = session.amber_tasks?.at(-1)?.end_time || new Date(new Date(start).getTime() + 30 * 60000).toISOString()}
                    <button 
                        onclick={(e) => {
                            if (e.shiftKey) {
                                onToggleSelect(session.id);
                            } else {
                                onSelectSession(session.id);
                            }
                        }}
                        class="absolute left-1 right-1 rounded-lg border p-1 px-2 overflow-hidden transition-all text-left z-1 {selectedSessionIds.includes(session.id) ? 'ring-2 ring-resin-forest ring-offset-1 border-resin-forest bg-resin-forest text-white' : session.sessionType === 'focus' ? 'bg-resin-amber/10 border-resin-amber/30 text-resin-amber hover:bg-resin-amber/20' : 'bg-resin-forest/10 border-resin-forest/20 text-resin-forest hover:bg-resin-forest/20'}"
                        style="top: {getPosition(start)}%; height: {getDurationHeight(start, end)}%; min-height: 24px;"
                    >
                        <div class="flex items-center gap-1">
                            {#if selectedSessionIds.includes(session.id)}
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                            {/if}
                            <span class="text-[10px] font-bold truncate leading-tight">
                                {session.title || 'Focus'}
                            </span>
                        </div>
                        {#if getDurationHeight(start, end) > 5}
                            <div class="text-[8px] opacity-70 font-mono mt-0.5">
                                {new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                        {/if}
                    </button>
                {/each}

                <!-- External Events -->
                {#each getExternalEventsForDay(day) as event}
                    <div 
                        class="absolute left-1 right-1 rounded-lg bg-gray-100/50 border border-gray-200/50 text-gray-500 p-1 px-2 overflow-hidden pointer-events-none opacity-60"
                        style="top: {getPosition(event.start)}%; height: {getDurationHeight(event.start, event.end)}%; min-height: 20px;"
                    >
                        <span class="text-[9px] font-medium truncate block leading-tight">{event.title}</span>
                    </div>
                {/each}
            </div>
        {/each}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(43, 70, 52, 0.1);
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(43, 70, 52, 0.2);
    }
</style>
