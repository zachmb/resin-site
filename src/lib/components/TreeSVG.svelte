<script lang="ts">
    import { getTreeSpecies } from '$lib/treeSpecies';

    // Props
    let {
        species = 'oak',
        size = 48,
        health = 100
    } = $props<{
        species?: string;
        size?: number;
        health?: number;
    }>();

    // Derive species definition
    const speciesDef = $derived(getTreeSpecies(species));
    const rarity = $derived(speciesDef?.rarity || 'common');

    // Color Palette synced with treeSpecies.ts
    const palette = $derived({
        canopy: speciesDef?.canopyColor || '#4D6652',
        trunk: speciesDef?.trunkColor || '#3D2B1F',
        highlight: speciesDef?.highlightColor
    });

    // Filter ID
    const filterId = $derived(`glow-${species}`);
    const gradId = $derived(`grad-${species}`);

    // Health effects
    const saturation = $derived(health / 100 * 0.8 + 0.2);
    const rotation = $derived(health < 30 ? 'rotate(-8, 24, 64)' : '');

    // Resin overlay opacity
    const resinOpacity = $derived(rarity === 'legendary' ? 0.4 : rarity === 'epic' ? 0.3 : rarity === 'rare' ? 0.2 : 0.1);

</script>

<svg
    width={size}
    height={size * 1.33}
    viewBox="0 0 48 64"
    style="filter: saturate({saturation})"
    class="tree-svg"
>
    <defs>
        <!-- Resin gradient overlay for all trees -->
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:{palette.highlight};stop-opacity:0.6" />
            <stop offset="50%" style="stop-color:{palette.canopy};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:{palette.trunk};stop-opacity:0.4" />
        </linearGradient>

        <!-- Glow filter for epic/legendary -->
        {#if rarity === 'epic' || rarity === 'legendary'}
            <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                <feFlood flood-color={palette.highlight || palette.canopy} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        {/if}
    </defs>

    <g transform={rotation}>
        <!-- Realistic trunk/wood -->
        {#if species === 'bamboo'}
            <!-- Bamboo segments -->
            <rect x="21" y="30" width="6" height="8" fill={palette.trunk} rx="0.5" opacity="0.9" />
            <rect x="21" y="39" width="6" height="8" fill={palette.trunk} rx="0.5" opacity="0.8" />
            <rect x="21" y="48" width="6" height="8" fill={palette.trunk} rx="0.5" opacity="0.9" />
            <rect x="21" y="57" width="6" height="7" fill={palette.trunk} rx="0.5" opacity="0.8" />
            <!-- Joint rings -->
            <line x1="20" y1="38" x2="28" y2="38" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <line x1="20" y1="47" x2="28" y2="47" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <line x1="20" y1="56" x2="28" y2="56" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <!-- Leaves clustered -->
            <g fill={palette.canopy} opacity="0.85">
                <ellipse cx="16" cy="32" rx="5" ry="3" transform="rotate(-35, 16, 32)" />
                <ellipse cx="32" cy="32" rx="5" ry="3" transform="rotate(35, 32, 32)" />
                <ellipse cx="14" cy="45" rx="4" ry="2.5" transform="rotate(-40, 14, 45)" />
                <ellipse cx="34" cy="45" rx="4" ry="2.5" transform="rotate(40, 34, 45)" />
            </g>

        {:else if species === 'palm'}
            <!-- Palm trunk - curved and thick -->
            <path d="M24 64 Q22 52 23 40 Q23.5 32 24 24" stroke={palette.trunk} stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9" />
            <!-- Trunk texture -->
            <circle cx="23" cy="50" r="0.8" fill="rgba(0,0,0,0.3)" />
            <circle cx="25" cy="38" r="0.6" fill="rgba(0,0,0,0.3)" />
            <!-- Palm fronds radiating -->
            <g stroke={palette.canopy} stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9">
                {#each [-70, -35, 0, 35, 70] as rot}
                    <path d="M24 24 Q{24 + Math.cos(rot * Math.PI / 180) * 14} {24 + Math.sin(rot * Math.PI / 180) * 12} {24 + Math.cos(rot * Math.PI / 180) * 16} {24 + Math.sin(rot * Math.PI / 180) * 18}" />
                {/each}
            </g>

        {:else if species === 'sunflower'}
            <!-- Stem -->
            <line x1="24" y1="64" x2="24" y2="32" stroke={palette.highlight} stroke-width="3" stroke-linecap="round" opacity="0.8" />
            <circle cx="24" cy="55" r="0.6" fill="rgba(0,0,0,0.2)" />
            <circle cx="24" cy="42" r="0.6" fill="rgba(0,0,0,0.2)" />
            <!-- Flower petals (sunny rays) -->
            <g opacity="0.95">
                {#each Array(12) as _, i}
                    <ellipse
                        cx={24 + Math.cos(i * 30 * Math.PI / 180) * 14}
                        cy={24 + Math.sin(i * 30 * Math.PI / 180) * 14}
                        rx="3" ry="6"
                        fill={palette.canopy}
                        transform="rotate({i * 30}, {24 + Math.cos(i * 30 * Math.PI / 180) * 14}, {24 + Math.sin(i * 30 * Math.PI / 180) * 14})"
                    />
                {/each}
            </g>
            <!-- Center circle -->
            <circle cx="24" cy="24" r="6" fill="#4A3728" opacity="0.9" />
            <!-- Seed pattern -->
            {#each Array(16) as _, i}
                <circle
                    cx={24 + Math.cos(i * 22.5 * Math.PI / 180) * 3}
                    cy={24 + Math.sin(i * 22.5 * Math.PI / 180) * 3}
                    r="0.8"
                    fill="rgba(0,0,0,0.4)"
                />
            {/each}

        {:else if species === 'willow'}
            <!-- Drooping trunk -->
            <path d="M24 64 Q20 50 22 36 Q24 22 24 10" stroke={palette.trunk} stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Cascading drooping branches -->
            <g stroke={palette.canopy} stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.8">
                <path d="M22 40 Q18 45 14 52" />
                <path d="M23 35 Q19 42 16 50" />
                <path d="M25 35 Q29 42 32 50" />
                <path d="M26 40 Q30 45 34 52" />
                <path d="M24 50 Q20 55 18 60" />
                <path d="M24 50 Q28 55 30 60" />
            </g>

        {:else if species === 'baobab'}
            <!-- Wide trunk -->
            <ellipse cx="24" cy="50" rx="7" ry="14" fill={palette.trunk} opacity="0.9" />
            <!-- Trunk texture lines -->
            <line x1="20" y1="40" x2="28" y2="40" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <line x1="19" y1="50" x2="29" y2="50" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <line x1="20" y1="60" x2="28" y2="60" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <!-- Sparse crown at top -->
            <circle cx="24" cy="18" r="10" fill={palette.canopy} opacity="0.85" />
            <circle cx="16" cy="22" r="5" fill={palette.canopy} opacity="0.7" />
            <circle cx="32" cy="22" r="5" fill={palette.canopy} opacity="0.7" />
            <!-- Roots at base -->
            <path d="M18 64 Q14 62 12 58" stroke={palette.trunk} stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6" />
            <path d="M30 64 Q34 62 36 58" stroke={palette.trunk} stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6" />

        {:else if species === 'pine' || species === 'cypress'}
            <!-- Conical trunk -->
            <line x1="24" y1="64" x2="24" y2="44" stroke={palette.trunk} stroke-width="5" stroke-linecap="round" opacity="0.85" />
            <!-- Layered conical canopy -->
            <path d="M24 8 L40 24 L38 28 Q24 20 10 28 L8 24 Z" fill={palette.canopy} opacity="0.95" />
            <path d="M24 18 L38 30 L36 34 Q24 26 12 34 L10 30 Z" fill={palette.canopy} opacity="0.9" />
            <path d="M24 28 L36 40 L34 42 Q24 34 14 42 L12 40 Z" fill={palette.canopy} opacity="0.85" />

        {:else if species === 'cherry' || species === 'sakura'}
            <!-- Ornamental trunk -->
            <path d="M24 64 Q23 58 23 50 Q23.5 44 24 38" stroke={palette.trunk} stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Rounded fluffy canopy - multiple layers -->
            <circle cx="24" cy="28" r="16" fill={palette.canopy} opacity="0.95" />
            <circle cx="14" cy="35" r="11" fill={palette.canopy} opacity="0.9" />
            <circle cx="34" cy="35" r="11" fill={palette.canopy} opacity="0.9" />
            <circle cx="20" cy="22" r="7" fill={palette.canopy} opacity="0.85" />
            <circle cx="28" cy="22" r="7" fill={palette.canopy} opacity="0.85" />
            <!-- Flower accents -->
            <circle cx="18" cy="28" r="1.5" fill={palette.highlight} opacity="0.7" />
            <circle cx="30" cy="32" r="1.5" fill={palette.highlight} opacity="0.7" />
            <circle cx="24" cy="22" r="1.2" fill={palette.highlight} opacity="0.6" />

        {:else if species === 'oak' || species === 'redwood'}
            <!-- Strong trunk -->
            <path d="M22 64 L22 44 Q22.5 38 24 32" stroke={palette.trunk} stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9" />
            <path d="M26 64 L26 44 Q25.5 38 24 32" stroke={palette.trunk} stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Thick rounded canopy -->
            <ellipse cx="24" cy="26" rx="18" ry="16" fill={palette.canopy} opacity="0.95" />
            <circle cx="12" cy="32" r="10" fill={palette.canopy} opacity="0.88" />
            <circle cx="36" cy="32" r="10" fill={palette.canopy} opacity="0.88" />
            <circle cx="20" cy="18" r="8" fill={palette.canopy} opacity="0.82" />
            <circle cx="28" cy="18" r="8" fill={palette.canopy} opacity="0.82" />

        {:else if species === 'birch'}
            <!-- White papery trunk with dark marks -->
            <rect x="21" y="40" width="6" height="24" fill={palette.trunk} opacity="0.95" />
            <!-- Birch marks -->
            <ellipse cx="20" cy="48" rx="1.5" ry="2" fill="#2C2C2C" opacity="0.4" />
            <ellipse cx="26" cy="56" rx="1.5" ry="2" fill="#2C2C2C" opacity="0.4" />
            <!-- Light canopy -->
            <ellipse cx="24" cy="28" rx="16" ry="14" fill={palette.canopy} opacity="0.9" />
            <circle cx="14" cy="34" r="8" fill={palette.canopy} opacity="0.85" />
            <circle cx="34" cy="34" r="8" fill={palette.canopy} opacity="0.85" />

        {:else if species === 'amber'}
            <!-- Warm golden trunk -->
            <path d="M22 64 L22 45 Q22.5 38 24 32" stroke={palette.trunk} stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.9" />
            <path d="M26 64 L26 45 Q25.5 38 24 32" stroke={palette.trunk} stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Warm golden canopy with radiant glow -->
            <circle cx="24" cy="25" r="14" fill={palette.canopy} opacity="0.95" />
            <circle cx="12" cy="32" r="9" fill={palette.canopy} opacity="0.9" />
            <circle cx="36" cy="32" r="9" fill={palette.canopy} opacity="0.9" />
            <circle cx="18" cy="18" r="6" fill={palette.canopy} opacity="0.85" />
            <circle cx="30" cy="18" r="6" fill={palette.canopy} opacity="0.85" />

        {:else if species === 'stone'}
            <!-- Solid rocky trunk -->
            <path d="M20 64 L20 40 L28 40 L28 64 Z" fill={palette.trunk} opacity="0.95" />
            <!-- Rocky texture lines -->
            <line x1="20" y1="50" x2="28" y2="50" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" />
            <line x1="20" y1="58" x2="28" y2="58" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" />
            <!-- Solid rounded crown -->
            <circle cx="24" cy="26" r="13" fill={palette.canopy} opacity="0.92" />
            <circle cx="15" cy="35" r="8" fill={palette.canopy} opacity="0.88" />
            <circle cx="33" cy="35" r="8" fill={palette.canopy} opacity="0.88" />

        {:else if species === 'sprout'}
            <!-- Thin green stem -->
            <line x1="24" y1="64" x2="24" y2="40" stroke={palette.trunk} stroke-width="2" stroke-linecap="round" opacity="0.8" />
            <!-- Few small leaflets -->
            <ellipse cx="20" cy="38" rx="3" ry="4" fill={palette.canopy} opacity="0.8" transform="rotate(-30, 20, 38)" />
            <ellipse cx="28" cy="38" rx="3" ry="4" fill={palette.canopy} opacity="0.8" transform="rotate(30, 28, 38)" />
            <ellipse cx="24" cy="30" rx="3.5" ry="5" fill={palette.canopy} opacity="0.85" />
            <!-- Top growth -->
            <circle cx="24" cy="20" r="4" fill={palette.canopy} opacity="0.9" />

        {:else if species === 'maple'}
            <!-- Brown trunk -->
            <path d="M22 64 L22 45 Q23 38 24 32" stroke={palette.trunk} stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9" />
            <path d="M26 64 L26 45 Q25 38 24 32" stroke={palette.trunk} stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Maple-like lobed canopy -->
            <circle cx="24" cy="24" r="12" fill={palette.canopy} opacity="0.95" />
            <circle cx="14" cy="28" r="8" fill={palette.canopy} opacity="0.9" />
            <circle cx="34" cy="28" r="8" fill={palette.canopy} opacity="0.9" />
            <circle cx="20" cy="14" r="5" fill={palette.canopy} opacity="0.85" />
            <circle cx="28" cy="14" r="5" fill={palette.canopy} opacity="0.85" />

        {:else if species === 'jasmine'}
            <!-- Slender trunk -->
            <line x1="24" y1="64" x2="24" y2="38" stroke={palette.trunk} stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
            <!-- Light yellow canopy -->
            <circle cx="24" cy="28" r="11" fill={palette.canopy} opacity="0.92" />
            <!-- Star-like jasmine flowers -->
            <g fill={palette.highlight} opacity="0.7">
                <circle cx="18" cy="24" r="1.5" />
                <circle cx="30" cy="24" r="1.5" />
                <circle cx="20" cy="35" r="1.5" />
                <circle cx="28" cy="35" r="1.5" />
                <circle cx="24" cy="32" r="1" />
            </g>

        {:else if species === 'lavender'}
            <!-- Thin purple stem -->
            <line x1="24" y1="64" x2="24" y2="32" stroke={palette.trunk} stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
            <!-- Spiky flower clusters -->
            <g fill={palette.canopy} opacity="0.85">
                <ellipse cx="24" cy="20" rx="2" ry="4" />
                <ellipse cx="20" cy="22" rx="2" ry="4" transform="rotate(-30, 20, 22)" />
                <ellipse cx="28" cy="22" rx="2" ry="4" transform="rotate(30, 28, 22)" />
                <ellipse cx="18" cy="28" rx="2" ry="3.5" transform="rotate(-60, 18, 28)" />
                <ellipse cx="30" cy="28" rx="2" ry="3.5" transform="rotate(60, 30, 28)" />
                <ellipse cx="24" cy="34" rx="2" ry="3" />
            </g>

        {:else if species === 'iris'}
            <!-- Green stem -->
            <line x1="24" y1="64" x2="24" y2="30" stroke={palette.trunk} stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
            <!-- Purple iris flower petals -->
            <g fill={palette.canopy} opacity="0.88">
                <ellipse cx="24" cy="22" rx="3" ry="6" />
                <ellipse cx="18" cy="26" rx="3" ry="6" transform="rotate(-45, 18, 26)" />
                <ellipse cx="30" cy="26" rx="3" ry="6" transform="rotate(45, 30, 26)" />
            </g>
            <!-- Iris center highlight -->
            <ellipse cx="24" cy="25" rx="2" ry="3" fill={palette.highlight} opacity="0.6" />

        {:else if species === 'moonlight'}
            <!-- Curved trunk -->
            <path d="M24 64 Q22 52 23 40 Q24 32 24 24" stroke={palette.trunk} stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Soft rounded canopy -->
            <circle cx="24" cy="20" r="10" fill={palette.canopy} opacity="0.9" />
            <circle cx="16" cy="26" r="7" fill={palette.canopy} opacity="0.85" />
            <circle cx="32" cy="26" r="7" fill={palette.canopy} opacity="0.85" />
            <!-- Moonlight glow accents -->
            <circle cx="24" cy="18" r="1.5" fill={palette.highlight} opacity="0.6" />

        {:else if species === 'starry'}
            <!-- Dark trunk -->
            <line x1="24" y1="64" x2="24" y2="36" stroke={palette.trunk} stroke-width="3" stroke-linecap="round" opacity="0.9" />
            <!-- Dark starry canopy -->
            <circle cx="24" cy="24" r="12" fill={palette.canopy} opacity="0.92" />
            <!-- Star sparkles -->
            <g fill={palette.highlight} opacity="0.7">
                <circle cx="20" cy="20" r="1" />
                <circle cx="28" cy="20" r="1" />
                <circle cx="18" cy="28" r="0.8" />
                <circle cx="30" cy="28" r="0.8" />
                <circle cx="24" cy="14" r="1" />
            </g>

        {:else if species === 'aurora'}
            <!-- Flowing curved trunk -->
            <path d="M24 64 Q21 50 22 40 Q23 32 24 24" stroke={palette.trunk} stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85" />
            <!-- Ethereal flowing canopy -->
            <ellipse cx="24" cy="22" rx="14" ry="11" fill={palette.canopy} opacity="0.88" />
            <circle cx="14" cy="28" r="7" fill={palette.canopy} opacity="0.8" />
            <circle cx="34" cy="28" r="7" fill={palette.canopy} opacity="0.8" />
            <!-- Aurora glow highlights -->
            <ellipse cx="24" cy="18" rx="6" ry="3" fill={palette.highlight} opacity="0.4" />

        {:else if species === 'ancient'}
            <!-- Gnarled thick trunk -->
            <path d="M20 64 L20 42 Q21 35 24 28" stroke={palette.trunk} stroke-width="5" fill="none" stroke-linecap="round" opacity="0.92" />
            <path d="M28 64 L28 42 Q27 35 24 28" stroke={palette.trunk} stroke-width="5" fill="none" stroke-linecap="round" opacity="0.88" />
            <!-- Gnarled texture -->
            <circle cx="21" cy="50" r="1" fill="rgba(0,0,0,0.3)" />
            <circle cx="27" cy="48" r="1" fill="rgba(0,0,0,0.3)" />
            <!-- Twisted ancient canopy -->
            <circle cx="24" cy="20" r="11" fill={palette.canopy} opacity="0.93" />
            <circle cx="14" cy="26" r="7" fill={palette.canopy} opacity="0.88" />
            <circle cx="34" cy="26" r="7" fill={palette.canopy} opacity="0.88" />

        {:else if species === 'crystalline'}
            <!-- Geometric crystalline trunk -->
            <path d="M22 64 L22 40 L26 40 L26 64 Z" fill={palette.trunk} opacity="0.88" />
            <!-- Crystalline geometric canopy -->
            <circle cx="24" cy="24" r="11" fill={palette.canopy} opacity="0.92" />
            <circle cx="16" cy="30" r="6" fill={palette.canopy} opacity="0.86" />
            <circle cx="32" cy="30" r="6" fill={palette.canopy} opacity="0.86" />
            <!-- Crystal facets -->
            <line x1="20" y1="20" x2="28" y2="20" stroke={palette.highlight} stroke-width="0.5" opacity="0.4" />
            <line x1="18" y1="28" x2="30" y2="28" stroke={palette.highlight} stroke-width="0.5" opacity="0.4" />

        {:else if species === 'phoenix'}
            <!-- Flame-like trunk -->
            <path d="M24 64 Q20 50 22 38 Q23 30 24 22" stroke={palette.trunk} stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9" />
            <!-- Pointed flame-like canopy -->
            <path d="M24 12 L32 28 L28 32 L24 24 L20 32 L16 28 Z" fill={palette.canopy} opacity="0.95" />
            <circle cx="24" cy="32" r="10" fill={palette.canopy} opacity="0.88" />
            <!-- Fire glow -->
            <circle cx="24" cy="28" r="3" fill={palette.highlight} opacity="0.6" />

        {:else if species === 'eternal'}
            <!-- Strong eternal trunk -->
            <path d="M22 64 L22 42 Q23 36 24 30" stroke={palette.trunk} stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.92" />
            <path d="M26 64 L26 42 Q25 36 24 30" stroke={palette.trunk} stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.88" />
            <!-- Spiral infinite growth canopy -->
            <circle cx="24" cy="22" r="13" fill={palette.canopy} opacity="0.95" />
            <circle cx="13" cy="30" r="8" fill={palette.canopy} opacity="0.9" />
            <circle cx="35" cy="30" r="8" fill={palette.canopy} opacity="0.9" />
            <circle cx="24" cy="38" r="5" fill={palette.canopy} opacity="0.85" />

        {:else if species === 'rockStack'}
            <!-- Stacked stone formation -->
            <rect x="19" y="48" width="10" height="8" fill={palette.canopy} opacity="0.9" rx="1" />
            <rect x="20" y="40" width="8" height="7" fill={palette.canopy} opacity="0.88" rx="1" />
            <rect x="21" y="32" width="6" height="6" fill={palette.canopy} opacity="0.86" rx="1" />
            <rect x="22" y="24" width="4" height="5" fill={palette.canopy} opacity="0.84" rx="0.5" />
            <!-- Stone cracks -->
            <line x1="19" y1="48" x2="29" y2="48" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
            <line x1="20" y1="40" x2="28" y2="40" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />

        {:else}
            <!-- Default: layered rounded tree -->
            <rect x="21" y="44" width="6" height="20" fill={palette.trunk} rx="1" opacity="0.9" />
            <circle cx="24" cy="26" r="16" fill={palette.canopy} opacity="0.95" />
            <circle cx="14" cy="34" r="9" fill={palette.canopy} opacity="0.88" />
            <circle cx="34" cy="34" r="9" fill={palette.canopy} opacity="0.88" />
            <circle cx="20" cy="20" r="6" fill={palette.canopy} opacity="0.82" />
            <circle cx="28" cy="20" r="6" fill={palette.canopy} opacity="0.82" />
        {/if}

        <!-- Resin glossy overlay for all trees -->
        <ellipse cx="24" cy="24" rx="15" ry="12" fill={`url(#${gradId})`} opacity={resinOpacity} />

        <!-- Highlight shine for resin effect -->
        <ellipse cx="22" cy="18" rx="4" ry="3" fill="white" opacity={0.15 + resinOpacity * 0.5} />
    </g>
</svg>

<style>
    .tree-svg {
        display: inline-block;
        vertical-align: middle;
        transition: all 0.5s ease;
    }
</style>
