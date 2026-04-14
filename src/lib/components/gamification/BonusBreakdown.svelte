<script lang="ts">
    import { fly } from 'svelte/transition';
    import type { BonusLineItem } from '$lib/state/rewards';
    import { ACHIEVEMENT_DEFINITIONS } from '$lib/data/achievements';

    let {
        baseStones = 0,
        bonusBreakdown = [] as BonusLineItem[],
        forestHealthGain = 0,
        newAchievements = [] as string[],
        visible = false
    }: {
        baseStones: number;
        bonusBreakdown: BonusLineItem[];
        forestHealthGain: number;
        newAchievements: string[];
        visible?: boolean;
    } = $props();

    const getAchievementName = (id: string) => {
        return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id)?.name || id;
    };

    const totalStones = $derived(baseStones + bonusBreakdown.reduce((sum, b) => sum + b.stones, 0));
</script>

{#if visible}
    <div
        class="mb-12 max-w-2xl mx-auto"
        in:fly={{ y: 40, duration: 400 }}
        out:fly={{ y: 20, duration: 300 }}
    >
        <div
            class="glass-card rounded-2xl p-6 bg-gradient-to-r from-resin-amber/15 via-white/40 to-resin-amber/10 border border-resin-amber/40 shadow-lg shadow-resin-amber/20"
        >
            <!-- Header -->
            <div class="mb-4 pb-4 border-b border-resin-amber/20">
                <h3 class="text-lg font-bold text-resin-charcoal text-center">✓ Session Complete</h3>
            </div>

            <!-- Base stones -->
            <div class="space-y-3 mb-4">
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">💎</span>
                        <span class="text-resin-charcoal font-medium">Base Session</span>
                    </div>
                    <span class="font-bold text-resin-amber">+{baseStones} stones</span>
                </div>

                <!-- Bonuses -->
                {#each bonusBreakdown as bonus}
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">{bonus.emoji}</span>
                            <span class="text-resin-charcoal font-medium">{bonus.label}</span>
                        </div>
                        <div class="text-right">
                            <span class="font-bold text-resin-amber">+{bonus.stones} stones</span>
                            {#if bonus.healthGain > 0}
                                <span class="text-xs text-resin-earth/60 ml-2">+{bonus.healthGain}% health</span>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Divider -->
            <div class="my-3 border-t border-resin-amber/20"></div>

            <!-- Forest health -->
            <div class="flex items-center justify-between text-sm mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🌳</span>
                    <span class="text-resin-charcoal font-medium">Forest Health</span>
                </div>
                <span class="font-bold text-resin-forest">+{forestHealthGain}%</span>
            </div>

            <!-- Total -->
            <div class="flex items-center justify-between text-base font-bold py-2 px-3 bg-resin-amber/10 rounded-lg">
                <span class="text-resin-charcoal">Total Earned</span>
                <span class="text-resin-amber">{totalStones} stones</span>
            </div>

            <!-- Achievements -->
            {#if newAchievements.length > 0}
                <div class="mt-4 pt-4 border-t border-resin-amber/20">
                    <p class="text-xs font-bold text-resin-amber uppercase tracking-wider mb-2">🏅 Achievements Unlocked</p>
                    <div class="flex flex-wrap gap-2">
                        {#each newAchievements as achId}
                            <div
                                class="inline-flex items-center gap-1 px-3 py-1.5 bg-resin-amber/20 rounded-full text-xs font-semibold text-resin-amber"
                            >
                                <span>✨</span>
                                <span>{getAchievementName(achId)}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Dismiss button -->
            <button
                onclick={() => {
                    /* Will be dismissed automatically by store timeout */
                }}
                class="absolute top-4 right-4 text-resin-earth/30 hover:text-resin-earth/60 transition-colors text-2xl leading-none"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    </div>
{/if}
