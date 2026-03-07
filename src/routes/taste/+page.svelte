<script lang="ts">
    import { fade, fly } from "svelte/transition";

    let { data } = $props();
    let { profile, feelingCounts, enjoyedThings, ratingHistory } =
        $derived(data);

    const feelingIcons: Record<string, string> = {
        "Flow State": "⚡",
        Proud: "⭐",
        Relieved: "🍃",
        Energized: "🔥",
        Drained: "🪫",
        Frustrated: "🌧️",
    };

    // Sort feelings by count
    const topFeelings = $derived(
        Object.entries(feelingCounts).sort((a, b) => b[1] - a[1]),
    );

    const totalRatings = $derived(ratingHistory.length);
    const avgRating = $derived(
        totalRatings > 0
            ? Math.round(
                  (ratingHistory.reduce(
                      (acc: number, curr: any) => acc + curr.rating,
                      0,
                  ) /
                      totalRatings) *
                      10,
              ) / 10
            : 0,
    );

    let today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
</script>

<svelte:head>
    <title>Taste Profile | Resin</title>
</svelte:head>

<main
    class="w-full h-full min-h-screen pt-28 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-5xl mx-auto"
>
    <!-- Header -->
    <div
        class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        in:fly={{ y: -20, duration: 800 }}
    >
        <div>
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-3"
            >
                Insights & Patterns
            </div>
            <h1
                class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight"
            >
                Taste <span class="italic text-resin-forest">Profile</span>
            </h1>
            <p class="text-resin-earth/60 font-medium mt-2 max-w-xl">
                A reflection of your energy, focus, and what brings you joy.
            </p>
        </div>

        <div class="flex items-center gap-8">
            <div class="text-center">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1"
                >
                    Feedback Logs
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {totalRatings}
                </p>
            </div>
            <div class="w-px h-8 bg-resin-forest/10"></div>
            <div class="text-center group">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1 group-hover:text-resin-amber transition-colors"
                >
                    Avg Rating
                </p>
                <p class="text-2xl font-bold text-resin-amber">
                    {avgRating > 0 ? `${avgRating}/5` : "-"}
                </p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Rankings -->
        <div class="lg:col-span-7 space-y-8">
            <section
                class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-resin-amber/15 shadow-premium relative bg-gradient-to-br from-resin-amber/5 to-transparent overflow-hidden"
            >
                <div
                    class="absolute -right-16 -bottom-16 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl"
                ></div>
                <div class="relative z-10">
                    <div class="flex items-center gap-3 mb-8">
                        <div
                            class="w-10 h-10 rounded-2xl bg-resin-amber/10 flex items-center justify-center"
                        >
                            <span class="text-lg">✦</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-resin-charcoal">
                                Top Feelings
                            </h3>
                            <p
                                class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                            >
                                Your emotional landscape
                            </p>
                        </div>
                    </div>

                    {#if topFeelings.length > 0}
                        <div class="space-y-4">
                            {#each topFeelings as [feeling, count], i}
                                <div
                                    class="flex items-center gap-4 bg-white/40 p-4 rounded-2xl border border-resin-forest/5 hover:border-resin-amber/20 transition-colors"
                                >
                                    <div
                                        class="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-resin-forest/5"
                                    >
                                        {feelingIcons[feeling] || "·"}
                                    </div>
                                    <div class="flex-1">
                                        <div
                                            class="flex justify-between items-end mb-1"
                                        >
                                            <span
                                                class="font-bold text-resin-charcoal text-lg"
                                                >{feeling}</span
                                            >
                                            <span
                                                class="text-xs font-bold text-resin-earth/50 uppercase tracking-wider"
                                                >{count} sessions</span
                                            >
                                        </div>
                                        <!-- Progress bar relative to max -->
                                        <div
                                            class="w-full bg-resin-forest/10 rounded-full h-1.5 overflow-hidden"
                                        >
                                            <div
                                                class="bg-gradient-to-r from-resin-amber to-resin-forest h-1.5 rounded-full"
                                                style="width: {(count /
                                                    topFeelings[0][1]) *
                                                    100}%"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="text-center py-12 border-2 border-dashed border-resin-forest/10 rounded-3xl"
                        >
                            <p class="text-resin-charcoal font-medium">
                                No feelings logged yet
                            </p>
                            <p class="text-sm text-resin-earth mt-1">
                                Reflect on a plan to see your landscape grow.
                            </p>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Rating Trend -->
            {#if ratingHistory.length > 0}
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-premium"
                >
                    <div class="flex items-center justify-between mb-8">
                        <h3
                            class="text-lg font-bold text-resin-charcoal flex items-center gap-2"
                        >
                            <svg
                                class="w-5 h-5 text-resin-forest"
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
                            Satisfaction Trend
                        </h3>
                    </div>

                    <div
                        class="h-32 flex items-end gap-2 mt-4 pb-2 border-b border-resin-forest/10"
                    >
                        {#each ratingHistory.slice(-14) as entry}
                            <div
                                class="flex-1 flex flex-col items-center gap-2 group relative"
                            >
                                <!-- Tooltip -->
                                <div
                                    class="absolute -top-8 bg-resin-charcoal text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20"
                                >
                                    {entry.rating}/5 on {entry.date}
                                </div>
                                <!-- Bar -->
                                <div
                                    class="w-full bg-resin-forest/20 rounded-t-sm group-hover:bg-resin-amber transition-colors"
                                    style="height: {(entry.rating / 5) * 100}%"
                                ></div>
                            </div>
                        {/each}
                    </div>
                    <div
                        class="flex justify-between mt-2 text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                    >
                        <span>Older</span>
                        <span>Recent</span>
                    </div>
                </section>
            {/if}
        </div>

        <!-- Right: Enjoyed List -->
        <div class="lg:col-span-5 space-y-8">
            <h3 class="text-xl font-bold text-resin-charcoal font-serif">
                A History of Joy
            </h3>

            {#if enjoyedThings.length > 0}
                <div class="space-y-4">
                    {#each enjoyedThings as item}
                        <div
                            class="glass-card rounded-3xl p-6 border border-white/20 hover:border-resin-amber/30 hover:shadow-xl transition-all group"
                        >
                            <p
                                class="text-sm text-resin-charcoal leading-relaxed font-serif italic text-lg mb-3"
                            >
                                "{item.text}"
                            </p>
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                                    >{item.date}</span
                                >
                                <div
                                    class="w-6 h-px bg-resin-amber/30 group-hover:w-12 transition-all duration-500"
                                ></div>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <div
                    class="text-center py-12 border-2 border-dashed border-resin-forest/10 rounded-3xl"
                >
                    <p class="text-resin-charcoal font-medium">
                        Nothing logged yet
                    </p>
                    <p class="text-sm text-resin-earth mt-1">
                        Tell us what you enjoyed after your next session.
                    </p>
                </div>
            {/if}
        </div>
    </div>
</main>
