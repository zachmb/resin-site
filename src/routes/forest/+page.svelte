<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly, scale } from "svelte/transition";

    let { data } = $props();
    let { profile, sessions } = $derived(data);

    // Tree Species Logic (Mirrored from iOS App)
    const treeSpecies = [
        {
            id: "willow",
            name: "Weeping Willow",
            icon: "🌿",
            unlockCost: 0,
            color: "#4A7856",
        },
        {
            id: "oak",
            name: "Ancient Oak",
            icon: "🌳",
            unlockCost: 10,
            color: "#2B4633",
        },
        {
            id: "pine",
            name: "Silver Pine",
            icon: "🌲",
            unlockCost: 25,
            color: "#5F7A61",
        },
        {
            id: "maple",
            name: "Amber Maple",
            icon: "🍁",
            unlockCost: 50,
            color: "#E89A3C",
        },
        {
            id: "baobab",
            name: "Grand Baobab",
            icon: "🌳",
            unlockCost: 100,
            color: "#3D2B1F",
        },
    ];

    const totalStones = $derived(profile?.total_stones || 0);
    const currentStreak = $derived(profile?.current_streak || 0);
    const unlockedSpecies = $derived(
        treeSpecies.filter((s) => s.unlockCost <= totalStones),
    );

    // Grid calculations
    const columns = 5;
    const items = $derived(sessions.slice(0, 25)); // Show last 25 sessions in the forest

    function getIsoPos(index: number) {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = (col - row) * 60;
        const y = (col + row) * 30;
        return { x, y };
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

        <!-- Stats Cards -->
        <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mb-24"
        >
            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:scale-[1.02] transition-transform duration-500"
            >
                <div
                    class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber mb-2"
                >
                    <span class="text-2xl">💎</span>
                </div>
                <span class="text-3xl font-bold text-resin-charcoal"
                    >{totalStones}</span
                >
                <span
                    class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold"
                    >Total Stones</span
                >
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:scale-[1.02] transition-transform duration-500"
            >
                <div
                    class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-2 font-serif font-bold italic"
                >
                    {currentStreak}d
                </div>
                <span class="text-3xl font-bold text-resin-charcoal"
                    >Streak</span
                >
                <span
                    class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold"
                    >Daily Consistency</span
                >
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:scale-[1.02] transition-transform duration-500"
            >
                <div
                    class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber mb-2"
                >
                    <span class="text-2xl">🌲</span>
                </div>
                <span class="text-3xl font-bold text-resin-charcoal"
                    >{unlockedSpecies.length}</span
                >
                <span
                    class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold"
                    >Species Unlocked</span
                >
            </div>
        </div>

        <!-- Isometric Forest Grid -->
        <div
            class="relative w-full h-[600px] flex items-center justify-center pointer-events-none mb-32"
        >
            <!-- Radial Glow -->
            <div
                class="absolute inset-0 bg-radial-gradient from-resin-amber/5 via-transparent to-transparent"
            ></div>

            <div class="relative transform scale-[0.8] md:scale-100">
                {#each items as session, i}
                    {@const pos = getIsoPos(i)}
                    {@const isPlan =
                        session.status === "scheduled" ||
                        session.status === "completed"}
                    {@const species = isPlan
                        ? unlockedSpecies[i % unlockedSpecies.length]
                        : null}

                    <div
                        class="absolute transition-all duration-1000 ease-out flex items-center justify-center"
                        style="transform: translate({pos.x}px, {pos.y}px); z-index: {i};"
                        in:scale={{ delay: i * 50, duration: 1000, start: 0 }}
                    >
                        {#if isPlan}
                            <!-- Tree Visualization -->
                            <div
                                class="relative group pointer-events-auto cursor-pointer"
                            >
                                <div
                                    class="w-16 h-16 flex items-center justify-center text-4xl transform -translate-y-8 hover:-translate-y-10 transition-transform duration-500"
                                >
                                    {species?.icon || "🌿"}
                                </div>
                                <!-- Shadow -->
                                <div
                                    class="absolute inset-x-0 bottom-0 h-4 bg-resin-charcoal/5 rounded-full blur-md -z-10 scale-x-150"
                                ></div>
                            </div>
                        {:else}
                            <!-- Stone Visualization -->
                            <div
                                class="relative group pointer-events-auto cursor-pointer"
                            >
                                <div
                                    class="w-10 h-10 flex items-center justify-center text-2xl transform hover:scale-110 transition-transform duration-300"
                                >
                                    🪨
                                </div>
                                <!-- Shadow -->
                                <div
                                    class="absolute inset-x-0 bottom-0 h-2 bg-resin-charcoal/5 rounded-full blur-sm -z-10 scale-x-125"
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
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
