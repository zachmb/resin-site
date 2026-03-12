<script lang="ts">
    type Size = 'sm' | 'md' | 'lg';

    interface Props {
        stones: number;
        streak: number;
        size?: Size;
    }

    let { stones = 0, streak = 0, size = 'md' }: Props = $props();

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

    // Format streak display
    const streakDisplay = streak > 1 ? `🔥 ${streak}` : '';
</script>

<div class="forest-container" style="--padding: {config.padding}px;">
    {#if treeCount === 0}
        <div class="empty-state">
            <p style="font-size: {config.fontSize}px;">No stones yet</p>
        </div>
    {:else}
        <div class="forest-grid" style="--gap: {config.gap}px;">
            {#each treesArray as _, i}
                <div class="tree" style="font-size: {config.treeSize}px;" title="Tree {i + 1}">
                    🌲
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
