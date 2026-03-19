<script lang="ts">
    import type { TreeSpeciesDefinition } from '$lib/treeSpecies';
    import TreeSVG from './TreeSVG.svelte';

    interface Props {
        species: TreeSpeciesDefinition;
        size?: 'sm' | 'md' | 'lg';
        health?: number;
        showRarity?: boolean;
        onclick?: (tree: TreeSpeciesDefinition) => void;
    }

    let props: Props = $props();
    let species = $derived(props.species);
    let size = $derived(props.size ?? 'md');
    let health = $derived(props.health ?? 100);
    let showRarity = $derived(props.showRarity ?? false);
    let onclick = $derived(props.onclick);

    // Size configurations for SVG and padding
    const sizeConfig = {
        sm: { svgSize: 24, padding: '4px' },
        md: { svgSize: 40, padding: '6px' },
        lg: { svgSize: 64, padding: '8px' }
    };

    const config = $derived(sizeConfig[size]);

    // Calculate opacity based on health (matches iOS TreeSVGView)
    const opacity = $derived(health < 30 ? 0.7 : health < 60 ? 0.85 : health < 80 ? 0.95 : 1);

    // Rarity styling
    const rarityColors: Record<string, string> = {
        common: '#9ca3af',
        uncommon: '#3b82f6',
        rare: '#ec4899',
        epic: '#a855f7',
        legendary: '#f59e0b'
    };

    const rarityIcons: Record<string, string> = {
        common: '◇',
        uncommon: '◆',
        rare: '★',
        epic: '✦',
        legendary: '✨'
    };

    const handleClick = () => {
        if (onclick) {
            onclick(species);
        }
    };
</script>

<div
    class="tree-container"
    style="opacity: {opacity}; padding: {config.padding};"
    title={species.label}
    onclick={handleClick}
    role="button"
    tabindex="0"
>
    <div class="tree-content">
        <TreeSVG species={species.id} size={config.svgSize} health={health} />
        {#if showRarity}
            <div class="rarity-badge" style="color: {rarityColors[species.rarity]};">
                {rarityIcons[species.rarity]}
            </div>
        {/if}
    </div>
</div>

<style>
    .tree-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
    }

    .tree-container:hover {
        transform: scale(1.1);
        filter: brightness(1.1);
    }

    .tree-content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .rarity-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        font-size: 12px;
        font-weight: 700;
        background: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
</style>
