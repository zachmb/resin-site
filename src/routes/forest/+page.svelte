<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly, scale } from "svelte/transition";

    let { data } = $props();
    let { profile, sessions, statusCounts, minutesByDay, totalFocusMinutes, longestSession } = $derived(data);

    let recentReward = $state<{ text: string; icon: string; timestamp: number } | null>(null);

    onMount(() => {
        // Load most recent reward from localStorage
        const stored = localStorage.getItem('recentReward');
        if (stored) {
            try {
                const reward = JSON.parse(stored);
                // Only show if less than 5 minutes old
                if (Date.now() - reward.timestamp < 300000) {
                    recentReward = reward;
                }
            } catch (e) {
                // ignore
            }
        }
    });

    // Tree Species Logic (Synced with iOS App)
    const treeSpecies = [
        {
            id: "amber",
            name: "Amber Plan",
            icon: "🌿",
            unlockCost: 0,
            color: "#E89A3C",
        },
        {
            id: "oak",
            name: "Oak",
            icon: "🌳",
            unlockCost: 20,
            color: "#2B4633",
        },
        {
            id: "cherry",
            name: "Cherry Blossom",
            icon: "🌸",
            unlockCost: 40,
            color: "#E8A0B5",
        },
        {
            id: "lavender",
            name: "Lavender",
            icon: "💜",
            unlockCost: 70,
            color: "#9B8EC4",
        },
        {
            id: "sunflower",
            name: "Sunflower",
            icon: "🌻",
            unlockCost: 100,
            color: "#E8C840",
        },
        {
            id: "starry",
            name: "Starry Tree",
            icon: "⭐",
            unlockCost: 150,
            color: "#6BA3C8",
        },
    ];

    const totalStones = $derived(profile?.total_stones || 0);
    const currentStreak = $derived(profile?.current_streak || 0);
    const unlockedSpecies = $derived(
        treeSpecies.filter((s) => s.unlockCost <= totalStones),
    );

    // Time period filtering
    let selectedPeriod = $state<"day" | "week" | "month" | "year">("week");

    const filteredSessions = $derived.by(() => {
        const cutoff = { day: 1, week: 7, month: 30, year: 365 }[selectedPeriod];
        const msAgo = Date.now() - cutoff * 86400000;
        return sessions.filter((s: any) => new Date(s.created_at).getTime() >= msAgo);
    });

    const gridSessions = $derived(filteredSessions.slice(0, 16));
    const overflow = $derived(Math.max(0, filteredSessions.length - 16));

    // Helper: get icon based on session duration
    function getSpeciesIcon(session: any): string {
        if (!session) return "";
        const mins = session.focusMinutes;
        if (mins >= 120) return "⭐"; // starry (majestic)
        if (mins >= 60) return "🌳"; // oak (large)
        if (mins >= 20) return "🌿"; // amber (standard)
        return "🌱"; // shrub
    }

    // Format minutes to hours/mins
    function formatDuration(mins: number): string {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    }
</script>

<svelte:head>
    <title>Petrified Forest | Resin</title>
</svelte:head>

<main
    class="flex-grow pt-32 pb-20 px-6 relative z-10 w-full overflow-hidden bg-resin-bg"
>
    <div class="max-w-6xl mx-auto flex flex-col items-center">
        <!-- Header Section -->
        <div
            class="text-center mb-16 space-y-4"
            in:fly={{ y: -20, duration: 800 }}
        >
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-forest/5 border border-resin-forest/10 text-resin-forest/60 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
                Rewards & Progress
            </div>
            <h1
                class="text-4xl md:text-6xl font-bold text-resin-charcoal font-serif tracking-tight"
            >
                The Petrified <span class="italic text-resin-forest"
                    >Forest</span
                >
            </h1>
            <p class="text-resin-earth/70 text-lg font-light max-w-xl mx-auto">
                Every plan you complete adds to your permanent digital
                sanctuary.
            </p>
        </div>

        <!-- Recent Reward Display -->
        {#if recentReward}
            <div
                class="mb-12 max-w-2xl mx-auto"
                in:fly={{ y: -10, duration: 300 }}
                out:fly={{ y: -10, duration: 200 }}
            >
                <div class="glass-card rounded-2xl p-6 bg-gradient-to-r from-resin-amber/10 via-transparent to-resin-amber/5 border border-resin-amber/30 flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
                    <div class="flex items-center gap-4">
                        <div class="text-5xl animate-bounce">{recentReward.icon}</div>
                        <div>
                            <p class="text-sm font-bold text-resin-charcoal">{recentReward.text}</p>
                            <p class="text-xs text-resin-earth/50 mt-1">Just now · Check the forest to see your rewards!</p>
                        </div>
                    </div>
                    <button
                        onclick={() => (recentReward = null)}
                        class="text-resin-earth/40 hover:text-resin-earth/60 transition-colors flex-shrink-0"
                        title="Dismiss reward notification"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        {/if}

        <!-- Stats Cards -->
        <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mb-24"
        >
            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-amber/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber mb-2 mx-auto"
                    >
                        <span class="text-2xl">💎</span>
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >{totalStones}</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Stones Earned</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Earn stones by completing focus sessions, sharing plans with friends, and using the browser extension
                    </p>
                </div>
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-forest/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-2 mx-auto font-serif font-bold italic text-lg"
                    >
                        {currentStreak}
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >Day Streak</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Keep it going!</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Focus every day to maintain your streak. Missing a day resets it.
                    </p>
                </div>
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-forest/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-2 mx-auto"
                    >
                        <span class="text-xl">⏱</span>
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >{formatDuration(totalFocusMinutes)}</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Total Focus</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Your longest focus session was {formatDuration(longestSession)}
                    </p>
                </div>
            </div>
        </div>

        <!-- How Stones Work -->
        <div class="w-full max-w-4xl mb-24">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-8">
                How Stones Are Earned
            </h2>
            <div class="glass-card rounded-2xl p-6 space-y-4 border border-white/10">
                <div class="flex items-start gap-3">
                    <span class="text-xl">✓</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Complete an Activated plan</p>
                        <p class="text-xs text-resin-amber font-bold">+5 stones</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <span class="text-xl">📸</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Pass a photo verification</p>
                        <p class="text-xs text-resin-amber font-bold">+3 stones</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <span class="text-xl">🔥</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Maintain a daily streak</p>
                        <p class="text-xs text-resin-amber font-bold">+1 stone/day</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <span class="text-xl">🌲</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Each session plants a tree in your grove</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Time Period Selector -->
        <div class="flex gap-1 p-1 bg-white/40 rounded-xl w-fit mx-auto mb-8">
            {#each ["day", "week", "month", "year"] as period}
                <button
                    class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all {selectedPeriod === period
                        ? "bg-resin-forest text-white"
                        : "text-resin-earth/60 hover:text-resin-earth"}"
                    onclick={() => (selectedPeriod = period as any)}
                >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
            {/each}
        </div>

        <!-- Analytics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
            <!-- Focus Trends -->
            <div class="glass-card rounded-2xl p-6">
                <h3
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40 mb-4"
                >
                    Focus by Day of Week
                </h3>
                <div class="flex items-end gap-1 h-20">
                    {#each ["M", "T", "W", "T", "F", "S", "S"] as day, i}
                        {@const maxMin = Math.max(...minutesByDay, 1)}
                        {@const h = (minutesByDay[i] / maxMin) * 100}
                        <div class="flex-1 flex flex-col items-center gap-1">
                            <div
                                class="w-full rounded-sm bg-resin-forest/20 transition-all duration-700"
                                style="height: {h}%; min-height: 4px; background-color: {h >
                                60
                                    ? "#2B4634"
                                    : "#2B463460"};"
                            ></div>
                            <span class="text-[8px] text-resin-earth/40 font-bold"
                                >{day}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Session Breakdown -->
            <div class="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <h3
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40 mb-4"
                >
                    Session Breakdown
                </h3>
                <div class="space-y-2">
                    {#each [
                        { key: "completed", label: "Completed", color: "bg-resin-forest" },
                        { key: "scheduled", label: "Active", color: "bg-resin-amber" },
                        { key: "draft", label: "Draft", color: "bg-resin-earth/30" },
                        { key: "canceled", label: "Canceled", color: "bg-red-300/60" },
                    ] as stat}
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full {stat.color}"></div>
                            <span class="text-xs text-resin-earth/60 flex-1"
                                >{stat.label}</span
                            >
                            <span class="text-xs font-bold text-resin-charcoal"
                                >{statusCounts[stat.key as keyof typeof statusCounts] || 0}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- 4x4 Forest Grid -->
        <div class="w-full max-w-4xl">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
                <span
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40"
                    >Your Grove</span
                >
                <span
                    class="text-xs font-medium text-resin-forest/60"
                    >{Math.min(filteredSessions.length, 16)} / 16 plots</span
                >
            </div>

            <!-- 4x4 Grid -->
            <div
                class="grid grid-cols-4 gap-[1px] bg-resin-earth/8 rounded-2xl overflow-hidden mb-4"
            >
                {#each Array(16) as _, i}
                    {@const session = gridSessions[i]}
                    {@const isEven = (Math.floor(i / 4) + (i % 4)) % 2 === 0}
                    <div
                        class="flex items-center justify-center h-24 relative group cursor-pointer transition-opacity {isEven
                            ? "bg-[#C8DCA8]/22"
                            : "bg-[#B8CC98]/16"}"
                        class:opacity-40={!session &&
                            i === 0 &&
                            filteredSessions.length === 0}
                    >
                        {#if session}
                            <div class="flex flex-col items-center gap-1 text-center">
                                <span class="text-4xl leading-none"
                                    >{getSpeciesIcon(session)}</span
                                >
                                <span
                                    class="text-[8px] font-medium text-resin-earth/40 px-1 hidden group-hover:block"
                                    >{session.focusMinutes}m</span
                                >
                            </div>
                            <!-- Tooltip -->
                            <div
                                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-resin-charcoal text-white text-[10px] rounded-lg py-1.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl"
                            >
                                {session.display_title || session.title || "Session"}
                                •
                                {session.focusMinutes}m
                            </div>
                        {:else}
                            <span class="text-resin-earth/10 text-2xl">○</span>
                        {/if}
                    </div>
                {/each}
            </div>

            {#if overflow > 0}
                <p class="text-center text-xs text-resin-earth/40 font-medium">
                    +{overflow} more this period
                </p>
            {/if}
        </div>

        <!-- Collection Showcase -->
        <div class="w-full max-w-4xl space-y-10">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal">
                Unlocked Collection
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                {#each treeSpecies as species}
                    {@const unlocked = totalStones >= species.unlockCost}
                    <div
                        class="glass-card rounded-2xl p-6 flex flex-col items-center text-center space-y-3 {unlocked
                            ? 'opacity-100'
                            : 'opacity-40 grayscale'} transition-all duration-500"
                    >
                        <div class="text-4xl mb-2">
                            {unlocked ? species.icon : "🔒"}
                        </div>
                        <div
                            class="text-[10px] uppercase tracking-widest font-bold text-resin-earth/40"
                        >
                            {species.name}
                        </div>
                        {#if !unlocked}
                            <div class="text-[10px] font-bold text-resin-amber">
                                {species.unlockCost} Stones
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Session History -->
        <div class="w-full max-w-4xl space-y-6 mt-20">
            <h2 class="text-lg font-serif font-bold text-resin-charcoal tracking-tight">
                Session History
            </h2>
            <div class="grid gap-4">
                {#each filteredSessions as session, i}
                    <div
                        class="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/20 hover:border-resin-amber/30 transition-all"
                    >
                        <div class="flex items-center gap-4">
                            <div
                                class="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-resin-forest/5"
                            >
                                {#if session.status === "scheduled" || session.status === "completed"}
                                    {getSpeciesIcon(session)}
                                {:else}
                                    🪨
                                {/if}
                            </div>
                            <div>
                                <h3
                                    class="font-bold text-resin-charcoal text-lg"
                                >
                                    {session.title ||
                                        session.display_title ||
                                        "Focus Session"}
                                </h3>
                                <p
                                    class="text-xs font-bold text-resin-earth/50 uppercase tracking-wider mt-1"
                                >
                                    {new Date(
                                        session.created_at,
                                    ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    {#if session.focusMinutes > 0}
                                        <span class="mx-2 text-resin-forest/30"
                                            >•</span
                                        >
                                        <span class="text-resin-forest"
                                            >{session.focusMinutes}m focused</span
                                        >
                                    {/if}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            {#if session.status === "scheduled"}
                                <span
                                    class="px-3 py-1 bg-resin-amber/10 text-resin-amber text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Active Plan</span
                                >
                            {:else if session.status === "completed"}
                                <span
                                    class="px-3 py-1 bg-resin-forest/10 text-resin-forest text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Completed</span
                                >
                            {:else if session.status === "canceled"}
                                <span
                                    class="px-3 py-1 bg-resin-earth/10 text-resin-earth/60 text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Canceled</span
                                >
                            {:else}
                                <span
                                    class="px-3 py-1 bg-resin-forest/5 text-resin-earth/50 text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Draft</span
                                >
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Info Footer -->
        <div class="mt-40 text-center space-y-6 opacity-40 max-w-lg mx-auto">
            <p class="text-sm font-light italic">
                "Growth is silent, but its presence is felt in the stillness of
                the forest."
            </p>
            <div class="h-px bg-resin-forest/10 w-24 mx-auto"></div>
        </div>
    </div>
</main>

<style>
    :global(.bg-radial-gradient) {
        background: radial-gradient(
            circle at center,
            var(--color-resin-amber),
            transparent 70%
        );
    }
</style>
