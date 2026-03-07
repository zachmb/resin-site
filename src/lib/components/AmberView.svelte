<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import { enhance } from "$app/forms";

    let expandedSessionId = $state<string | null>(null);

    const toggleExpand = (id: string) => {
        expandedSessionId = expandedSessionId === id ? null : id;
    };

    let { profile, recentSessions = [] } = $props<{
        profile: any;
        recentSessions: any[];
    }>();

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

    let today = new Date().toISOString();
</script>

<main
    class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-3xl mx-auto"
>
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-serif font-bold text-resin-charcoal">
                Amber Schedule
            </h1>
            <p class="text-resin-earth/70 mt-1">{formatDate(today)}</p>
        </div>
        <div
            class="px-4 py-2 bg-resin-amber/10 border border-resin-amber/20 rounded-full flex items-center gap-2"
        >
            <span class="w-2 h-2 rounded-full bg-resin-amber animate-pulse"
            ></span>
            <span
                class="text-xs font-bold text-resin-amber uppercase tracking-widest"
                >Active</span
            >
        </div>
    </div>

    <!-- Daily Focus Window -->
    <section
        class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-resin-amber/20 shadow-premium mb-8 relative overflow-hidden group"
    >
        <div
            class="absolute -right-20 -top-20 w-64 h-64 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-all duration-1000"
        ></div>
        <div
            class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6"
        >
            <div class="flex items-center gap-6">
                <div
                    class="w-16 h-16 rounded-2xl bg-resin-amber text-white flex items-center justify-center shadow-md"
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
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        ></path>
                    </svg>
                </div>
                <div>
                    <h2
                        class="text-xs font-bold text-resin-amber uppercase tracking-widest mb-1"
                    >
                        Daily Focus Window
                    </h2>
                    <p class="text-2xl font-bold text-resin-charcoal">
                        {#if profile?.availability_start && profile?.availability_end}
                            {formatTime(profile.availability_start)} – {formatTime(
                                profile.availability_end,
                            )}
                        {:else}
                            9:00 AM – 5:00 PM
                        {/if}
                    </p>
                </div>
            </div>

            <button
                class="px-5 py-2.5 bg-white border border-resin-forest/10 rounded-xl text-sm font-semibold text-resin-earth hover:text-resin-charcoal hover:border-resin-amber/40 transition-all whitespace-nowrap"
                onclick={() => {
                    /* Handled by active tab switch later */
                }}
            >
                Edit Schedule
            </button>
        </div>
    </section>

    <!-- Recent Focus Sessions -->
    <h2 class="text-xl font-bold text-resin-charcoal mb-4">Recent Sessions</h2>

    {#if recentSessions.length > 0}
        <div
            class="space-y-4 relative before:absolute before:inset-0 before:left-6 before:-ml-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-resin-amber/40 before:to-transparent"
        >
            {#each recentSessions as session}
                <div class="relative flex items-start gap-6 group">
                    <div
                        class="w-12 h-12 rounded-full border-4 border-[#FCF9F2] bg-white shadow-sm flex items-center justify-center z-10 shrink-0 mt-1 relative after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-resin-forest/10 group-hover:after:ring-resin-amber/40 transition-all {expandedSessionId ===
                        session.id
                            ? 'after:ring-resin-amber'
                            : ''}"
                    >
                        {#if session.status === "scheduled"}
                            <span
                                class="w-3 h-3 rounded-full bg-resin-amber animate-pulse"
                            ></span>
                        {:else if session.status === "completed"}
                            <span class="w-3 h-3 rounded-full bg-resin-forest"
                            ></span>
                        {:else}
                            <span class="w-3 h-3 rounded-full bg-resin-earth/30"
                            ></span>
                        {/if}
                    </div>

                    <div
                        class="glass-card rounded-2xl p-5 border text-left flex-1 shadow-sm transition-all pb-5 block cursor-pointer w-full {expandedSessionId ===
                        session.id
                            ? 'border-resin-amber shadow-md'
                            : 'border-resin-forest/5 group-hover:border-resin-amber/20'}"
                        role="button"
                        tabindex="0"
                        onclick={() => toggleExpand(session.id)}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                                toggleExpand(session.id);
                        }}
                    >
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2"
                        >
                            <h3
                                class="font-bold text-resin-charcoal group-hover:text-resin-amber transition-colors text-lg"
                            >
                                {session.title ||
                                    session.display_title ||
                                    "Focus Session"}
                            </h3>
                            <div class="flex items-center gap-3">
                                <span
                                    class="text-xs font-semibold text-resin-earth/60"
                                >
                                    {session.created_at
                                        ? new Date(
                                              session.created_at,
                                          ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                          })
                                        : "Just now"}
                                </span>
                                {#if session.status === "scheduled"}
                                    <span
                                        class="text-[10px] font-bold text-resin-amber uppercase tracking-widest px-2 py-0.5 rounded bg-resin-amber/10"
                                        >Active</span
                                    >
                                {:else if session.status === "completed"}
                                    <span
                                        class="text-[10px] font-bold text-resin-forest uppercase tracking-widest px-2 py-0.5 rounded bg-resin-forest/10"
                                        >Completed</span
                                    >
                                {:else}
                                    <span
                                        class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest px-2 py-0.5 rounded bg-resin-forest/5"
                                        >Draft</span
                                    >
                                {/if}
                            </div>
                        </div>
                        <p class="text-sm text-resin-earth/80 line-clamp-2">
                            {session.content || session.raw_text}
                        </p>

                        {#if expandedSessionId === session.id}
                            <div
                                class="mt-6 pt-6 border-t border-resin-forest/10 cursor-default"
                                in:slide={{ duration: 300 }}
                                onclick={(e) => e.stopPropagation()}
                            >
                                <h4
                                    class="text-xs font-bold text-resin-charcoal uppercase tracking-widest mb-4"
                                >
                                    Plan Steps
                                </h4>
                                {#if session.amber_tasks && session.amber_tasks.length > 0}
                                    <div class="space-y-3">
                                        {#each session.amber_tasks as task, i}
                                            <div class="flex items-start gap-3">
                                                <div
                                                    class="w-5 h-5 rounded bg-resin-forest/5 flex items-center justify-center text-[10px] font-bold text-resin-earth/50 mt-0.5 shrink-0"
                                                >
                                                    {i + 1}
                                                </div>
                                                <div class="flex-1">
                                                    <div
                                                        class="flex items-center justify-between"
                                                    >
                                                        <span
                                                            class="text-sm font-semibold text-resin-charcoal"
                                                            >{task.title}</span
                                                        >
                                                        <span
                                                            class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                                                            >{task.estimated_minutes}m</span
                                                        >
                                                    </div>
                                                    {#if task.requires_focus}
                                                        <span
                                                            class="inline-block mt-1 text-[9px] font-bold text-resin-amber uppercase tracking-widest px-1.5 py-0.5 rounded bg-resin-amber/5 border border-resin-amber/10"
                                                            >Shield Active</span
                                                        >
                                                    {/if}
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <p
                                        class="text-sm text-resin-earth/60 italic"
                                    >
                                        No tasks generated for this session yet.
                                    </p>
                                {/if}

                                {#if session.status !== "scheduled" && session.status !== "completed"}
                                    <div class="mt-6 flex justify-end">
                                        <form
                                            method="POST"
                                            action="?/activate"
                                            use:enhance
                                        >
                                            <input
                                                type="hidden"
                                                name="sessionId"
                                                value={session.id}
                                            />
                                            <button
                                                type="submit"
                                                class="px-5 py-2.5 bg-resin-amber text-white font-bold rounded-xl shadow-lg shadow-resin-amber/20 hover:shadow-resin-amber/40 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                                            >
                                                <span>Activate Plan</span>
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    ><path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                                    ></path></svg
                                                >
                                            </button>
                                        </form>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div
            class="text-center py-12 border-2 border-dashed border-resin-forest/10 rounded-3xl"
        >
            <svg
                class="w-12 h-12 mx-auto text-resin-earth/30 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
            </svg>
            <p class="text-resin-charcoal font-medium">
                No sessions scheduled yet
            </p>
            <p class="text-sm text-resin-earth mt-1">
                Activate a note to schedule a focus session.
            </p>
        </div>
    {/if}
</main>
