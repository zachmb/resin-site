<script lang="ts">
    import { TREE_SPECIES } from '$lib/treeSpecies';
    import TreeSVG from './TreeSVG.svelte';
    import type { TreeSpeciesDefinition } from '$lib/treeSpecies';

    interface Props {
        totalStones: number;
        unlockedTreeIds: string[];
        onUnlock?: (speciesId: string) => Promise<void>;
    }

    let props = $props();
    let totalStones = $derived(props.totalStones ?? 0);
    let unlockedTreeIds = $derived(props.unlockedTreeIds ?? []);
    let onUnlock = $derived(props.onUnlock);

    let selectedTree = $state<TreeSpeciesDefinition | null>(null);
    let isUnlocking = $state(false);

    // Rarity color scheme
    const rarityColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
        common: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', glow: 'rgba(107, 114, 128, 0.1)' },
        uncommon: { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa', glow: 'rgba(30, 64, 175, 0.1)' },
        rare: { bg: '#fce7f3', text: '#be185d', border: '#f472b6', glow: 'rgba(190, 28, 93, 0.1)' },
        epic: { bg: '#f5d4ff', text: '#6b21a8', border: '#d946ef', glow: 'rgba(107, 33, 168, 0.1)' },
        legendary: { bg: '#fef3c7', text: '#b45309', border: '#fbbf24', glow: 'rgba(217, 119, 6, 0.3)' }
    };

    const rarityIcons = {
        common: '◇',
        uncommon: '◆',
        rare: '★',
        epic: '✦',
        legendary: '✨'
    };

    const isUnlocked = (speciesId: string) => unlockedTreeIds.includes(speciesId);
    const canAfford = (cost: number) => totalStones >= cost;

    const handleUnlock = async (speciesId: string) => {
        if (!onUnlock) return;
        const tree = TREE_SPECIES.find(t => t.id === speciesId);
        if (!tree) return;

        const canUnlock = !isUnlocked(speciesId) && canAfford(tree.unlockCost);
        if (!canUnlock) return;

        isUnlocking = true;
        try {
            await onUnlock(speciesId);
            // Update local state
            unlockedTreeIds = [...unlockedTreeIds, speciesId];
            totalStones -= tree.unlockCost;
        } catch (err) {
            console.error('Failed to unlock tree:', err);
        } finally {
            isUnlocking = false;
        }
    };
</script>

<div class="tree-shop">
    {#if selectedTree}
        <!-- Detail Modal -->
        <div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) selectedTree = null; }}>
            <div class="modal-content">
                <button class="close-btn" onclick={() => (selectedTree = null)}>✕</button>

                <div class="modal-header" style="background: linear-gradient(135deg, {rarityColors[selectedTree.rarity].bg}, {rarityColors[selectedTree.rarity].glow});">
                    <div class="tree-preview">
                        <TreeSVG species={selectedTree.id} size={80} health={100} />
                    </div>
                </div>

                <div class="modal-body">
                    <div class="header-row">
                        <div>
                            <h2 class="tree-name">{selectedTree.label}</h2>
                            <p class="tree-description">{selectedTree.description}</p>
                        </div>
                        <div class="rarity-badge" style="background: {rarityColors[selectedTree.rarity].bg}; border: 2px solid {rarityColors[selectedTree.rarity].border}; color: {rarityColors[selectedTree.rarity].text};">
                            <span class="rarity-icon">{rarityIcons[selectedTree.rarity]}</span>
                            <span class="rarity-text">{selectedTree.rarity.toUpperCase()}</span>
                        </div>
                    </div>

                    {#if isUnlocked(selectedTree.id)}
                        <div class="unlocked-badge">
                            <span>✓ UNLOCKED</span>
                        </div>
                    {:else}
                        <div class="unlock-section">
                            <div class="cost-display">
                                <span class="cost-label">UNLOCK COST</span>
                                <span class="cost-value">{selectedTree.unlockCost} 🪨</span>
                            </div>

                            {#if canAfford(selectedTree.unlockCost)}
                                <button
                                    class="unlock-btn unlock-btn-enabled"
                                    onclick={() => selectedTree && handleUnlock(selectedTree.id)}
                                    disabled={isUnlocking}
                                >
                                    {isUnlocking ? 'Unlocking...' : `Unlock for ${selectedTree.unlockCost} 🪨`}
                                </button>
                            {:else}
                                <button class="unlock-btn unlock-btn-disabled" disabled>
                                    Need {selectedTree.unlockCost - totalStones} more 🪨
                                </button>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Shop Grid -->
    <div class="shop-header">
        <h2 class="shop-title">🌲 Tree Collection</h2>
        <div class="stone-display">
            <span class="stone-count">{totalStones}</span>
            <span class="stone-label">🪨</span>
        </div>
    </div>

    <!-- Filter tabs -->
    <div class="filter-tabs">
        <div class="filter-group">
            {#each ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as rarity}
                <button
                    class="filter-btn"
                    onclick={() => {}}
                    style="opacity: {rarity === 'all' ? 1 : 0.6}"
                >
                    {rarity === 'all' ? 'All' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </button>
            {/each}
        </div>
    </div>

    <!-- Tree grid -->
    <div class="tree-grid">
        {#each TREE_SPECIES as tree (tree.id)}
            {@const unlocked = isUnlocked(tree.id)}
            {@const rarityColor = rarityColors[tree.rarity]}
            <div
                class="tree-card"
                class:unlocked
                class:locked={!unlocked}
                onclick={() => (selectedTree = tree)}
                style="border: 2px solid {rarityColor.border}; background: {rarityColor.glow};"
            >
                <div class="tree-image" style="background: linear-gradient(135deg, {rarityColor.bg}, {rarityColor.glow});">
                    <TreeSVG species={tree.id} size={48} health={100} />
                    {#if !unlocked}
                        <div class="lock-overlay">
                            <span class="lock-icon">🔒</span>
                        </div>
                    {/if}
                </div>

                <div class="tree-info">
                    <h3 class="tree-card-name">{tree.label}</h3>
                    <div class="tree-footer">
                        <span class="rarity-indicator" style="color: {rarityColor.text};">
                            {rarityIcons[tree.rarity]} {tree.rarity}
                        </span>
                        {#if !unlocked}
                            <span class="cost-badge" style="background: {rarityColor.bg}; color: {rarityColor.text}; border: 1px solid {rarityColor.border};">
                                {tree.unlockCost} 🪨
                            </span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .tree-shop {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .shop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .shop-title {
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
    }

    .stone-display {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #f0d9a8, #ffe8cc);
        border-radius: 12px;
        border: 2px solid #d4a574;
    }

    .stone-count {
        font-size: 20px;
        font-weight: 700;
        color: #92400e;
    }

    .stone-label {
        font-size: 18px;
    }

    .filter-tabs {
        margin-bottom: 24px;
    }

    .filter-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .filter-btn {
        padding: 8px 16px;
        border: 2px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-btn:hover {
        border-color: #2b4634;
        color: #2b4634;
    }

    .tree-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 16px;
    }

    .tree-card {
        display: flex;
        flex-direction: column;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tree-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .tree-image {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        position: relative;
    }

    .lock-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .lock-icon {
        font-size: 24px;
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
    }

    .tree-info {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .tree-card-name {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
        color: #1f2937;
    }

    .tree-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    .rarity-indicator {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .cost-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
    }

    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
    }

    .modal-content {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 90%;
        max-width: 500px;
        position: relative;
        overflow: hidden;
    }

    .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: white;
        transform: scale(1.1);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px 30px;
        min-height: 150px;
    }

    .tree-preview {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
    }

    .tree-name {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: #1f2937;
    }

    .tree-description {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
    }

    .rarity-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 8px;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .rarity-icon {
        font-size: 20px;
    }

    .rarity-text {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }

    .unlocked-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        background: #d1fae5;
        border: 2px solid #6ee7b7;
        border-radius: 8px;
        color: #065f46;
        font-weight: 600;
        font-size: 14px;
    }

    .unlock-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .cost-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f3f4f6;
        border-radius: 8px;
    }

    .cost-label {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
    }

    .cost-value {
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
    }

    .unlock-btn {
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .unlock-btn-enabled {
        background: linear-gradient(135deg, #2b4634, #3d5a45);
        color: white;
    }

    .unlock-btn-enabled:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(43, 70, 52, 0.3);
    }

    .unlock-btn-enabled:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .unlock-btn-disabled {
        background: #f3f4f6;
        color: #6b7280;
        cursor: not-allowed;
    }
</style>
