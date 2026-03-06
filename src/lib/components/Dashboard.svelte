<script lang="ts">
    import { fade } from "svelte/transition";
    import FocusControl from "./FocusControl.svelte";

    let {
        profile,
        recentNotes = [],
        todayTasks = [],
    } = $props<{
        profile: any;
        recentNotes: any[];
        todayTasks: any[];
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

    let today = new Date();
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
                Power User Dashboard
            </div>
            <h1
                class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight"
            >
                Welcome back, <span class="text-resin-forest italic serif"
                    >{profile.email.split("@")[0]}</span
                >
            </h1>
            <p class="text-resin-earth/60 font-medium mt-2">
                {formatDate(today)}
            </p>
        </div>

        <div class="flex items-center gap-10">
            <div class="text-center">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1"
                >
                    Stones
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {profile.stones || 0}
                </p>
            </div>
            <div class="w-px h-8 bg-resin-forest/10"></div>
            <div class="text-center">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1"
                >
                    Streak
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">7 days</p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Focus & Timeline -->
        <div class="lg:col-span-7 space-y-8">
            <FocusControl />

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
                                        class="text-sm text-resin-earth/70 mt-1 line-clamp-1"
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
                            Activate a note to see your day take shape.
                        </p>
                    </div>
                {/if}
            </section>
        </div>

        <!-- Right: Recent Notes -->
        <div class="lg:col-span-5">
            <div class="flex items-center justify-between mb-6">
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
