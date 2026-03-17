<script lang="ts">
    import SimpleTree from './SimpleTree.svelte';
    import type { ForestTreeData } from '$lib/forestGenerator';
    import { getSizeScale } from '$lib/forestGenerator';
    import type { TreeSpeciesDefinition } from '$lib/treeSpecies';

    interface Props {
        trees: ForestTreeData[];
        size?: 'sm' | 'md' | 'lg';
        onTreeClick?: (tree: TreeSpeciesDefinition) => void;
    }

    let props: Props = $props();
    let trees = $derived(props.trees ?? []);
    let size = $derived(props.size ?? 'md');
    let onTreeClick = $derived(props.onTreeClick);

    // Size configurations
    const sizeConfig = {
        sm: {
            containerGap: 8,
            padding: 8,
            fontSize: 10,
            treeSize: 'sm' as const
        },
        md: {
            containerGap: 12,
            padding: 12,
            fontSize: 12,
            treeSize: 'md' as const
        },
        lg: {
            containerGap: 16,
            padding: 16,
            fontSize: 14,
            treeSize: 'md' as const
        }
    };

    const config = sizeConfig[size];

    // Format date for display
    function formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Group trees by date for visual organization
    const treesByDate = $derived.by(() => {
        const grouped: Record<string, ForestTreeData[]> = {};

        for (const tree of trees) {
            const dateKey = formatDate(tree.date);
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(tree);
        }

        // Sort dates in reverse (newest first)
        return Object.entries(grouped)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([date, treesForDate]) => ({ date, trees: treesForDate }));
    });
</script>

<div class="actual-forest-container" style="--padding: {config.padding}px; --gap: {config.containerGap}px;">
    {#if trees.length === 0}
        <div class="empty-state">
            <p style="font-size: {config.fontSize}px;">
                No completed sessions yet. Start a session to grow your forest! 🌱
            </p>
        </div>
    {:else}
        <div class="forest-timeline">
            {#each treesByDate as { date, trees: dailyTrees } (date)}
                <div class="date-section">
                    <div class="date-header" style="font-size: {config.fontSize - 2}px;">
                        {date}
                    </div>
                    <div class="forest-grid">
                        {#each dailyTrees as tree (tree.id)}
                            <div class="tree-cell" title="{tree.title} ({tree.durationMinutes} min)">
                                <SimpleTree
                                    species={tree.species}
                                    size={config.treeSize}
                                    health={tree.health}
                                    showRarity={true}
                                    onclick={onTreeClick}
                                />
                                <div class="tree-duration" style="font-size: {config.fontSize - 2}px;">
                                    {tree.durationMinutes}m
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>

        <div class="forest-stats">
            <div class="stat-item">
                <span class="stat-label">Total Trees</span>
                <span class="stat-value">{trees.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Minutes</span>
                <span class="stat-value">{trees.reduce((sum, t) => sum + t.durationMinutes, 0)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Duration</span>
                <span class="stat-value">{Math.round(trees.reduce((sum, t) => sum + t.durationMinutes, 0) / trees.length)}m</span>
            </div>
        </div>
    {/if}
</div>

<style>
    .actual-forest-container {
        display: flex;
        flex-direction: column;
        gap: var(--gap);
        padding: var(--padding);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.05), rgba(217, 119, 6, 0.05));
        border: 1px solid rgba(43, 70, 52, 0.1);
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 150px;
        width: 100%;
        color: rgba(139, 115, 85, 0.6);
        text-align: center;
        padding: 40px 20px;
    }

    .forest-timeline {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }

    .date-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .date-header {
        font-weight: 600;
        color: rgba(91, 75, 60, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 0 8px;
    }

    .forest-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: var(--gap);
        width: 100%;
    }

    .tree-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.3);
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .tree-cell:hover {
        background: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
    }

    .tree-duration {
        color: rgba(91, 75, 60, 0.6);
        font-weight: 500;
        white-space: nowrap;
    }

    .forest-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--gap);
        margin-top: 8px;
        padding-top: var(--padding);
        border-top: 1px solid rgba(43, 70, 52, 0.1);
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(91, 75, 60, 0.05);
    }

    .stat-label {
        font-size: 11px;
        font-weight: 600;
        color: rgba(91, 75, 60, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .stat-value {
        font-size: 18px;
        font-weight: 700;
        color: #2B4634;
    }
</style>
