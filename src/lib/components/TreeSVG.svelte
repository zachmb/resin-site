<script lang="ts">
    import { 
        Sprout, Leaf, TreePine, Star, Crown, 
        Flower, Flower2, Sun, Flame, Gem, 
        Zap, Wind, Sparkles, Trophy 
    } from 'lucide-svelte';

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

    // Rarity Map
    const rarityMap: Record<string, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = {
        amber: 'common', sprout: 'common', pine: 'common', oak: 'common',
        cherry: 'uncommon', maple: 'uncommon', birch: 'uncommon', willow: 'uncommon', jasmine: 'uncommon', lavender: 'uncommon',
        redwood: 'rare', bamboo: 'rare', palm: 'rare', baobab: 'rare', sunflower: 'rare', iris: 'rare',
        sakura: 'epic', cypress: 'epic', moonlight: 'epic', starry: 'epic', aurora: 'epic',
        ancient: 'legendary', crystalline: 'legendary', phoenix: 'legendary', eternal: 'legendary'
    };

    const rarity = $derived(rarityMap[species] || 'common');

    // Color Palettes
    const colors: Record<string, { canopy: string; trunk: string; highlight?: string }> = {
        amber: { canopy: '#7BC47F', trunk: '#5C4033' },
        sprout: { canopy: '#5C9E62', trunk: '#4A3728' },
        pine: { canopy: '#3E7A44', trunk: '#3D2B1F' },
        oak: { canopy: '#4D6652', trunk: '#3D2B1F' },
        
        cherry: { canopy: '#E8A0B5', trunk: '#5C4033' },
        maple: { canopy: '#D4702A', trunk: '#4A3728' },
        birch: { canopy: '#C8B89A', trunk: '#E0E0E0' },
        willow: { canopy: '#8AAF80', trunk: '#4A3728' },
        jasmine: { canopy: '#F0E8C0', trunk: '#5C4033' },
        lavender: { canopy: '#9B8EC4', trunk: '#4A3728' },

        redwood: { canopy: '#4A6838', trunk: '#7A341E' },
        bamboo: { canopy: '#5A9050', trunk: '#8AAF80' },
        palm: { canopy: '#6AB050', trunk: '#8A6C3A' },
        baobab: { canopy: '#8A6C3A', trunk: '#5C4033' },
        sunflower: { canopy: '#E8C840', trunk: '#5A9050' },
        iris: { canopy: '#8E60B8', trunk: '#5A9050' },

        sakura: { canopy: '#E8A0B5', trunk: '#5C4033', highlight: '#FFD700' },
        cypress: { canopy: '#3E7A44', trunk: '#3D2B1F', highlight: '#C0C0C0' },
        moonlight: { canopy: '#6B90C8', trunk: '#2F4F4F', highlight: '#F0F8FF' },
        starry: { canopy: '#1A3060', trunk: '#191970', highlight: '#FFFACD' },
        aurora: { canopy: '#60C8A8', trunk: '#2E8B57', highlight: '#7FFFD4' },

        ancient: { canopy: '#3A5A40', trunk: '#4A3728', highlight: '#FFD700' },
        crystalline: { canopy: '#7EC8E3', trunk: '#B0C4DE', highlight: '#FFFFFF' },
        phoenix: { canopy: '#C84820', trunk: '#8B0000', highlight: '#FF4500' },
        eternal: { canopy: '#C8A840', trunk: '#5C4033', highlight: '#FFD700' },
        
        stone: { canopy: '#A0A0A0', trunk: '#707070' }
    };

    const palette = $derived(colors[species] || colors.oak);

    // Filter ID
    const filterId = $derived(`glow-${species}`);

    // Health effects
    const saturation = $derived(health / 100 * 0.8 + 0.2);
    const rotation = $derived(health < 30 ? 'rotate(-8, 24, 64)' : '');

</script>

<svg 
    width={size} 
    height={size * 1.33} 
    viewBox="0 0 48 64" 
    style="filter: saturate({saturation})"
    class="tree-svg"
>
    {#if rarity === 'epic' || rarity === 'legendary'}
        <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feFlood flood-color={palette.highlight || palette.canopy} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    {/if}

    <g transform={rotation}>
        <!-- Trunk -->
        {#if species === 'bamboo'}
            <rect x="22" y="30" width="4" height="34" fill={palette.trunk} rx="1" />
            <line x1="21" y1="40" x2="27" y2="40" stroke={palette.canopy} stroke-width="1" />
            <line x1="21" y1="50" x2="27" y2="50" stroke={palette.canopy} stroke-width="1" />
        {:else if species === 'palm'}
            <path d="M24 64 Q20 48 24 32" stroke={palette.trunk} stroke-width="5" fill="none" stroke-linecap="round" />
        {:else}
            <rect x="21" y="44" width="6" height="20" fill={palette.trunk} rx="1" />
        {/if}

        <!-- Canopy -->
        {#if rarity === 'common'}
            <circle cx="24" cy="30" r="16" fill={palette.canopy} />
            <circle cx="14" cy="36" r="8" fill={palette.canopy} />
            <circle cx="34" cy="36" r="8" fill={palette.canopy} />
        
        {:else if rarity === 'uncommon'}
            <ellipse cx="24" cy="28" rx="18" ry="14" fill={palette.canopy} />
            <circle cx="12" cy="34" r="7" fill={palette.canopy} />
            <circle cx="36" cy="34" r="7" fill={palette.canopy} />
            <!-- Detail dots -->
            <circle cx="20" cy="24" r="1.5" fill="white" opacity="0.3" />
            <circle cx="28" cy="26" r="1" fill="white" opacity="0.3" />
            <circle cx="24" cy="32" r="1.2" fill="white" opacity="0.3" />
        
        {:else if rarity === 'rare'}
            {#if species === 'bamboo'}
                <g fill={palette.canopy}>
                    <ellipse cx="18" cy="35" rx="6" ry="3" transform="rotate(-30, 18, 35)" />
                    <ellipse cx="30" cy="45" rx="6" ry="3" transform="rotate(20, 30, 45)" />
                    <ellipse cx="20" cy="55" rx="5" ry="2" transform="rotate(-10, 20, 55)" />
                </g>
            {:else if species === 'palm'}
                <g fill={palette.canopy}>
                    {#each [-60, -30, 0, 30, 60] as rot}
                        <ellipse cx="24" cy="32" rx="14" ry="4" transform="rotate({rot}, 24, 32)" />
                    {/each}
                </g>
            {:else if species === 'sunflower'}
                <circle cx="24" cy="24" r="12" fill={palette.canopy} />
                <circle cx="24" cy="24" r="6" fill="#4A3728" />
            {:else}
                <path d="M8 40 Q24 10 40 40 Z" fill={palette.canopy} />
            {/if}
        
        {:else if rarity === 'epic'}
            <g filter="url(#{filterId})">
                <path d="M12 40 Q24 5 36 40 Z" fill={palette.canopy} />
                <!-- Sparkles -->
                <polygon points="24,15 26,20 31,22 26,24 24,29 22,24 17,22 22,20" fill={palette.highlight || 'white'} />
                <polygon points="15,30 16,33 19,34 16,35 15,38 14,35 11,34 14,33" fill={palette.highlight || 'white'} transform="scale(0.6) translate(10, 20)" />
            </g>
        
        {:else if rarity === 'legendary'}
            <circle cx="24" cy="32" r="20" fill={palette.canopy} opacity="0.2" />
            <g filter="url(#{filterId})">
                <ellipse cx="24" cy="25" rx="16" ry="12" fill={palette.canopy} />
                <ellipse cx="24" cy="35" rx="14" ry="10" fill={palette.canopy} opacity="0.8" />
                <ellipse cx="24" cy="18" rx="10" ry="8" fill={palette.canopy} opacity="0.9" />
                <!-- Sparkle dots -->
                {#each Array(8) as _, i}
                    <circle 
                        cx={24 + Math.cos(i * 45 * Math.PI / 180) * 15} 
                        cy={28 + Math.sin(i * 45 * Math.PI / 180) * 10} 
                        r="1" 
                        fill="white" 
                    />
                {/each}
            </g>
        {/if}
    </g>
</svg>

<style>
    .tree-svg {
        display: inline-block;
        vertical-align: middle;
        transition: all 0.5s ease;
    }
</style>
