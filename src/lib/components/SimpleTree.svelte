<script lang="ts">
    import { getSFSymbolEmoji, type TreeSpeciesDefinition } from '$lib/treeSpecies';

    interface Props {
        species: TreeSpeciesDefinition;
        size?: 'sm' | 'md' | 'lg';
        health?: number;
    }

    let props: Props = $props();
    let species = $derived(props.species);
    let size = $derived(props.size ?? 'md');
    let health = $derived(props.health ?? 100);

    // Size configurations
    const sizeConfig = {
        sm: { iconSize: '20px', padding: '6px' },
        md: { iconSize: '28px', padding: '8px' },
        lg: { iconSize: '40px', padding: '12px' }
    };

    const config = sizeConfig[size];

    // Calculate opacity based on health
    const opacity = health < 30 ? 0.7 : health < 60 ? 0.85 : health < 80 ? 0.95 : 1;

    // Get emoji for the icon
    const emoji = getSFSymbolEmoji(species.icon);

    // Determine if this is a petrified tree
    const isPetrified = health < 30;
</script>

<div
    class="tree-container"
    style="
        --icon-size: {config.iconSize};
        --padding: {config.padding};
        --canopy-color: {species.canopyColor};
        --highlight-color: {species.highlightColor};
        --trunk-color: {species.trunkColor};
        opacity: {opacity};
        filter: {isPetrified ? 'grayscale(100%) brightness(0.8)' : 'none'};
    "
    title={species.label}
>
    <div class="tree-icon">
        {emoji}
    </div>
</div>

<style>
    .tree-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        padding: var(--padding);
        border-radius: 8px;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .tree-container:hover {
        transform: scale(1.1);
        filter: brightness(1.1);
    }

    .tree-icon {
        font-size: var(--icon-size);
        line-height: 1;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    }
</style>
