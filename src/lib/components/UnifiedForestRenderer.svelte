<script lang="ts">
    import SimpleTree from './SimpleTree.svelte';
    import { TREE_SPECIES, type TreeSpeciesDefinition } from '$lib/treeSpecies';

    type Size = 'sm' | 'md' | 'lg';

    interface Props {
        stones: number;
        streak: number;
        size?: Size;
        forestHealth?: number;
    }

    let props: Props = $props();
    let stones = $derived(props.stones ?? 0);
    let streak = $derived(props.streak ?? 0);
    let size = $derived(props.size ?? 'md');
    let forestHealth = $derived(props.forestHealth ?? 100);

    // Size configurations
    const sizeConfig = {
        sm: {
            containerGap: 8,
            padding: 8,
            fontSize: 10
        },
        md: {
            containerGap: 12,
            padding: 12,
            fontSize: 12
        },
        lg: {
            containerGap: 16,
            padding: 16,
            fontSize: 14
        }
    };

    const config = sizeConfig[size];

    // Generate array of tree species for each stone
    const treeCount = Math.max(0, stones);
    const treesArray = Array.from({ length: treeCount }, (_, i) => i);

    // Determine tree species distribution based on stone progression
    function getTreeSpeciesForIndex(index: number): TreeSpeciesDefinition {
        const decayRatio = forestHealth < 30 ? 0.6 : forestHealth < 60 ? 0.4 : forestHealth < 80 ? 0.2 : 0;
        const petrifiedCount = Math.floor(treeCount * decayRatio);
        const isPetrified = index >= treeCount - petrifiedCount;

        if (isPetrified) return TREE_SPECIES.find(s => s.id === 'stone')!;

        // Cycle through common species for variation
        const commonSpecies = ['amber', 'oak', 'pine', 'cherry', 'maple', 'birch'];
        const speciesIndex = (index * 13) % commonSpecies.length;
        return TREE_SPECIES.find(s => s.id === commonSpecies[speciesIndex])!;
    }

    // Format streak display with emoji (matching iOS)
    const streakDisplay = streak > 1 ? `🔥 ${streak}${streak >= 7 ? ' ⭐' : ''}` : '';
</script>

<div class="forest-container" style="--padding: {config.padding}px; --gap: {config.containerGap}px;">
    {#if treeCount === 0}
        <div class="empty-state">
            <p style="font-size: {config.fontSize}px;">No stones yet</p>
        </div>
    {:else}
        <div class="forest-grid" class:forest-struggling={forestHealth < 60} class:forest-dying={forestHealth < 30}>
            {#each treesArray as _, i}
                {@const species = getTreeSpeciesForIndex(i)}
                <SimpleTree {species} {size} health={forestHealth} />
            {/each}
        </div>

        {#if streak > 0}
            <div class="streak-indicator" style="font-size: {config.fontSize + 2}px;">
                {streakDisplay}
            </div>
        {/if}
    {/if}
</div>

<style>
    .forest-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--padding);
        padding: var(--padding);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.05), rgba(217, 119, 6, 0.05));
        border: 1px solid rgba(43, 70, 52, 0.1);
    }

    .forest-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
        gap: var(--gap);
        width: 100%;
        transition: filter 0.3s ease;
    }

    .forest-grid.forest-struggling {
        filter: saturate(0.85);
    }

    .forest-grid.forest-dying {
        filter: saturate(0.6) grayscale(0.3);
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100px;
        width: 100%;
        color: rgba(139, 115, 85, 0.5);
    }

    .streak-indicator {
        margin-top: 8px;
        letter-spacing: 1px;
        font-weight: 600;
    }
</style>
