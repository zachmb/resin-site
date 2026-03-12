<script lang="ts">
    import TreeSVG from './TreeSVG.svelte';

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
            treeSize: 24,
            gap: 8,
            fontSize: 10,
            padding: 8
        },
        md: {
            treeSize: 32,
            gap: 12,
            fontSize: 12,
            padding: 12
        },
        lg: {
            treeSize: 48,
            gap: 16,
            fontSize: 14,
            padding: 16
        }
    };

    const config = sizeConfig[size];

    // Generate grid of trees based on stone count
    const treeCount = Math.max(0, stones);
    const treesArray = Array.from({ length: treeCount }, (_, i) => i);

    // Get species for tree at position with visual variation
    function getTreeSpecies(index: number): string {
        const decayRatio = forestHealth < 30 ? 0.6 : forestHealth < 60 ? 0.4 : forestHealth < 80 ? 0.2 : 0;
        const petrifiedCount = Math.floor(treeCount * decayRatio);
        const isPetrified = index >= treeCount - petrifiedCount;

        if (isPetrified) return 'stone';

        // Healthy trees cycle through common species
        const variation = (index * 13) % 4;
        const treeTypes = ['oak', 'pine', 'cherry', 'amber'];
        return treeTypes[variation];
    }

    // Get opacity for tree at position
    function getTreeOpacity(index: number): number {
        const decayRatio = forestHealth < 30 ? 0.6 : forestHealth < 60 ? 0.4 : forestHealth < 80 ? 0.2 : 0;
        const petrifiedCount = Math.floor(treeCount * decayRatio);
        const isPetrified = index >= treeCount - petrifiedCount;

        if (isPetrified) return 0.6;
        if (forestHealth < 30) return 0.7;
        if (forestHealth < 60) return 0.85;
        if (forestHealth < 80) return 0.95;
        return 1;
    }

    // Get scale variation for tree at position
    function getTreeScale(index: number): number {
        // Slightly vary tree sizes for visual interest
        const scaleVariation = 0.85 + ((index * 19) % 30) / 100; // 0.85 - 1.14
        return scaleVariation;
    }

    // Format streak display with visual enhancement
    const streakDisplay = streak > 1 ? `🔥 ${streak}${streak >= 7 ? ' ⭐' : ''}` : '';
</script>

<div class="forest-container" style="--padding: {config.padding}px;">
    {#if treeCount === 0}
        <div class="empty-state">
            <p style="font-size: {config.fontSize}px;">No stones yet</p>
        </div>
    {:else}
        <div class="forest-grid" style="--gap: {config.gap}px;" class:forest-struggling={forestHealth < 60} class:forest-dying={forestHealth < 30}>
            {#each treesArray as _, i}
                <div class="tree" style="opacity: {getTreeOpacity(i)}; transform: scale({getTreeScale(i)});" title="Tree {i + 1}">
                    <TreeSVG species={getTreeSpecies(i)} size={config.treeSize} health={forestHealth} />
                </div>
            {/each}
        </div>

        {#if streak > 0}
            <div class="streak-indicator" style="font-size: {config.fontSize}px;">
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
        grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
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

    .tree {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .tree:hover {
        transform: scale(1.1);
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: rgba(43, 70, 52, 0.4);
        text-align: center;
    }

    .streak-indicator {
        font-weight: bold;
        color: #d97706;
        text-align: center;
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }
</style>
