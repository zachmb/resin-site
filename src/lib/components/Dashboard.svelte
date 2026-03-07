<script lang="ts">
    import { fade } from "svelte/transition";
    import FocusControl from "./FocusControl.svelte";

    let {
        profile,
        recentNotes = [],
        todayTasks = [],
        weeklyStats = null,
    } = $props<{
        profile: any;
        recentNotes: any[];
        todayTasks: any[];
        weeklyStats: any;
    }>();

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    const feelingIcons: Record<string, string> = {
        "Flow State": "⚡",
        Proud: "⭐",
        Relieved: "🍃",
        Energized: "🔥",
        Drained: "🪫",
        Frustrated: "🌧️",
    };

    let today = new Date();

    function heatLevel(minutes: number): number {
        if (minutes === 0) return 0;
        if (minutes < 30) return 1;
        if (minutes < 60) return 2;
        if (minutes < 120) return 3;
        return 4;
    }

    const heatColors = [
        "bg-resin-forest/5",
        "bg-resin-forest/15",
        "bg-resin-forest/30",
        "bg-resin-forest/50",
        "bg-resin-forest/70",
    ];
</script>

<main
    class="w-full h-full min-h-screen pt-28 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-6xl mx-auto"
>
    <!-- Header -->
    <div
        class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
    >
        <div>
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-3"
            >
                Command Center
            </div>
            <h1
                class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight"
            >
                Welcome back, <span class="text-resin-forest italic serif"
                    >{profile?.email?.split("@")[0] || "explorer"}</span
                >
            </h1>
            <p class="text-resin-earth/60 font-medium mt-2">
                {formatDate(today)}
            </p>
        </div>

        <div class="flex items-center gap-8">
            <a href="/forest" class="text-center group">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1 group-hover:text-resin-amber transition-colors"
                >
                    Stones
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {profile?.total_stones || profile?.stones || 0}
                </p>
            </a>
            <div class="w-px h-8 bg-resin-forest/10"></div>
            <a href="/forest" class="text-center group">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1 group-hover:text-resin-amber transition-colors"
                >
                    Streak
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {profile?.current_streak || 0}d
                </p>
            </a>
            {#if weeklyStats?.avgRating > 0}
                <div class="w-px h-8 bg-resin-forest/10"></div>
                <div class="text-center">
                    <p
                        class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1"
                    >
                        Avg Rating
                    </p>
                    <p class="text-2xl font-bold text-resin-amber">
                        {weeklyStats.avgRating}/5
                    </p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Weekly Activity Heatmap -->
    {#if weeklyStats}
        <section class="mb-8">
            <div
                class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-premium relative bg-gradient-to-br from-white/40 to-transparent"
            >
                <div class="flex items-center justify-between mb-6">
                    <h3
                        class="text-lg font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-forest"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        This Week
                    </h3>
                    <div class="flex items-center gap-6">
                        <span
                            class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest"
                            >{weeklyStats.totalFocusMinutes}m focused</span
                        >
                        <span
                            class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest"
                            >{weeklyStats.totalSessions} sessions</span
                        >
                    </div>
                </div>

                <div class="grid grid-cols-7 gap-3">
                    {#each weeklyStats.heatmap as day}
                        <div class="flex flex-col items-center gap-2">
                            <span
                                class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-wider"
                                >{day.day}</span
                            >
                            <div
                                class="w-full aspect-square rounded-2xl {heatColors[
                                    heatLevel(day.focusMinutes)
                                ]} flex items-center justify-center transition-all hover:scale-105 cursor-default"
                                title="{day.focusMinutes}m focused, {day.sessions} session(s)"
                            >
                                {#if day.focusMinutes > 0}
                                    <span
                                        class="text-sm font-bold {heatLevel(
                                            day.focusMinutes,
                                        ) >= 3
                                            ? 'text-white'
                                            : 'text-resin-forest/60'}"
                                        >{day.focusMinutes}m</span
                                    >
                                {/if}
                            </div>
                            <span
                                class="text-[9px] text-resin-earth/30 font-medium"
                                >{day.sessions}
                                {day.sessions === 1 ? "plan" : "plans"}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>
        </section>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Focus, Taste, Timeline -->
        <div class="lg:col-span-7 space-y-8">
            <FocusControl />

            <!-- Taste Insights Card -->
            {#if weeklyStats && (weeklyStats.topFeeling || weeklyStats.enjoyedThings.length > 0)}
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-resin-amber/15 shadow-premium relative bg-gradient-to-br from-resin-amber/5 to-transparent overflow-hidden"
                >
                    <div
                        class="absolute -right-16 -bottom-16 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl"
                    ></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-6">
                            <div
                                class="w-10 h-10 rounded-2xl bg-resin-amber/10 flex items-center justify-center"
                            >
                                <span class="text-lg">✦</span>
                            </div>
                            <div>
                                <h3
                                    class="text-lg font-bold text-resin-charcoal"
                                >
                                    Taste Profile
                                </h3>
                                <p
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                                >
                                    What energizes you
                                </p>
                            </div>
                        </div>

                        {#if weeklyStats.topFeeling}
                            <div
                                class="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-white/40"
                            >
                                <span class="text-2xl"
                                    >{feelingIcons[
                                        weeklyStats.topFeeling
                                    ] || "✦"}</span
                                >
                                <div>
                                    <p
                                        class="text-xs font-bold text-resin-earth/50 uppercase tracking-wider"
                                    >
                                        Dominant feeling after sessions
                                    </p>
                                    <p
                                        class="text-lg font-bold text-resin-charcoal"
                                    >
                                        {weeklyStats.topFeeling}
                                    </p>
                                </div>
                            </div>
                        {/if}

                        {#if Object.keys(weeklyStats.feelingCounts).length > 1}
                            <div class="flex flex-wrap gap-2 mb-5">
                                {#each Object.entries(weeklyStats.feelingCounts) as [feeling, count]}
                                    <div
                                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 border border-resin-forest/5"
                                    >
                                        <span class="text-sm"
                                            >{feelingIcons[feeling] ||
                                                "·"}</span
                                        >
                                        <span
                                            class="text-xs font-semibold text-resin-earth"
                                            >{feeling}</span
                                        >
                                        <span
                                            class="text-[10px] font-bold text-resin-earth/40"
                                            >×{count}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        {#if weeklyStats.enjoyedThings.length > 0}
                            <div>
                                <p
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                                >
                                    Things you've enjoyed
                                </p>
                                <div class="space-y-2">
                                    {#each weeklyStats.enjoyedThings as thing}
                                        <div
                                            class="flex items-start gap-2 text-sm text-resin-earth/80"
                                        >
                                            <span
                                                class="text-resin-amber mt-0.5"
                                                >→</span
                                            >
                                            <span class="italic"
                                                >"{thing}"</span
                                            >
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </section>
            {/if}

            <!-- Timeline -->
            <section
                class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-premium relative bg-gradient-to-br from-white/40 to-transparent"
            >
                <div class="flex items-center justify-between mb-8">
                    <h3
                        class="text-xl font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-amber"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Today's Timeline
                    </h3>
                    <span
                        class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest"
                        >{todayTasks.length} Events</span
                    >
                </div>

                {#if todayTasks.length > 0}
                    <div
                        class="space-y-0 relative before:absolute before:inset-0 before:left-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-resin-amber/40 before:via-resin-forest/10 before:to-transparent"
                    >
                        {#each todayTasks as task}
                            <div class="relative pl-10 pb-8 last:pb-0 group">
                                <div
                                    class="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#F8F5EE] bg-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-125"
                                >
                                    <div
                                        class="w-2 h-2 rounded-full {task.requires_focus
                                            ? 'bg-resin-amber'
                                            : 'bg-resin-forest/30'}"
                                    ></div>
                                </div>
                                <div
                                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                    <div>
                                        <p
                                            class="text-[10px] font-bold text-resin-amber tracking-wider uppercase mb-0.5"
                                        >
                                            {formatTime(task.start_time)} – {formatTime(
                                                task.end_time,
                                            )}
                                        </p>
                                        <h4
                                            class="font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                                        >
                                            {task.title}
                                        </h4>
                                    </div>
                                    {#if task.requires_focus}
                                        <span
                                            class="inline-flex items-center px-2 py-0.5 rounded-lg bg-resin-amber/5 border border-resin-amber/10 text-[10px] font-bold text-resin-amber uppercase"
                                            >Shield Active</span
                                        >
                                    {/if}
                                </div>
                                {#if task.description}
                                    <p
                                        class="text-sm text-resin-earth/70 mt-2 leading-relaxed whitespace-pre-line line-clamp-3"
                                    >
                                        {task.description}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="text-center py-12">
                        <div
                            class="w-16 h-16 rounded-3xl bg-resin-forest/5 flex items-center justify-center mx-auto mb-4 border border-dashed border-resin-forest/20"
                        >
                            <svg
                                class="w-8 h-8 text-resin-earth/30"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="1.5"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p class="text-resin-charcoal font-medium">
                            Nothing scheduled yet
                        </p>
                        <p class="text-xs text-resin-earth/60 mt-1">
                            Activate a note from the app to see your day take
                            shape.
                        </p>
                    </div>
                {/if}
            </section>
        </div>

        <!-- Right: Quick Stats + Recent Notes -->
        <div class="lg:col-span-5 space-y-8">
            {#if weeklyStats}
                <div class="grid grid-cols-2 gap-4">
                    <a
                        href="/forest"
                        class="glass-card rounded-2xl p-5 border border-white/20 hover:border-resin-amber/30 transition-all group text-center"
                    >
                        <p
                            class="text-2xl font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                        >
                            {weeklyStats.scheduledPlans}
                        </p>
                        <p
                            class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mt-1"
                        >
                            Plans This Week
                        </p>
                    </a>
                    <a
                        href="/forest"
                        class="glass-card rounded-2xl p-5 border border-white/20 hover:border-resin-amber/30 transition-all group text-center"
                    >
                        <p
                            class="text-2xl font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                        >
                            {Math.round(
                                (weeklyStats.totalFocusMinutes / 60) * 10,
                            ) / 10}h
                        </p>
                        <p
                            class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mt-1"
                        >
                            Focus Time
                        </p>
                    </a>
                </div>
            {/if}

            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-resin-charcoal font-serif">
                    Recent Dump Archive
                </h3>
                <a
                    href="/notes"
                    class="text-xs font-bold text-resin-forest/50 hover:text-resin-amber transition-colors uppercase tracking-widest"
                    >View All</a
                >
            </div>

            <div class="grid grid-cols-1 gap-4">
                {#each recentNotes as note}
                    <a
                        href="/notes?id={note.id}"
                        class="glass-card rounded-3xl p-6 border border-white/20 hover:border-resin-amber/30 hover:shadow-xl transition-all group"
                    >
                        <div class="flex items-center justify-between mb-3">
                            <h4
                                class="font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors truncate pr-4"
                            >
                                {note.display_title ||
                                    note.title ||
                                    "Untitled Thought"}
                            </h4>
                            <span
                                class="text-[10px] font-bold text-resin-earth/40 whitespace-nowrap"
                            >
                                {new Date(note.created_at).toLocaleDateString(
                                    [],
                                    { month: "short", day: "numeric" },
                                )}
                            </span>
                        </div>
                        <p
                            class="text-sm text-resin-earth/70 line-clamp-2 leading-relaxed"
                        >
                            {note.raw_text || note.content || "..."}
                        </p>
                        <div class="mt-4 flex items-center gap-2">
                            {#if note.status === "scheduled"}
                                <span
                                    class="w-1.5 h-1.5 rounded-full bg-resin-amber"
                                ></span>
                                <span
                                    class="text-[10px] font-bold text-resin-amber uppercase tracking-wider"
                                    >Active Plan</span
                                >
                            {:else}
                                <span
                                    class="w-1.5 h-1.5 rounded-full bg-resin-forest/20"
                                ></span>
                                <span
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-wider"
                                    >Draft</span
                                >
                            {/if}
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    </div>
</main>
