/**
 * Unified Tree Species Definition
 * Synced with iOS ForestHubView.swift
 * Each species has SF Symbol icons and precise colors for consistent rendering across platforms
 */

export interface TreeSpeciesDefinition {
    id: string;
    label: string;
    icon: string; // SF Symbol name (e.g., "tree.fill", "leaf.fill")
    unlockCost: number;
    canopyColor: string; // Hex color
    highlightColor: string; // Hex color
    trunkColor: string; // Hex color
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export function getRarityForCost(cost: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (cost === 0) return 'common';
    if (cost < 50) return 'uncommon';
    if (cost < 150) return 'rare';
    if (cost < 250) return 'epic';
    return 'legendary';
}

export const TREE_SPECIES: TreeSpeciesDefinition[] = [
    // Default/Free trees (cost 0)
    {
        id: "amber",
        label: "Amber Plan",
        icon: "tree.fill",
        unlockCost: 0,
        canopyColor: "#D97706",
        highlightColor: "#FBBF24",
        trunkColor: "#92400E",
        description: "Productivity plans",
        rarity: "common"
    },
    {
        id: "stone",
        label: "Saved Note",
        icon: "tree.fill",
        unlockCost: 0,
        canopyColor: "#A89968",
        highlightColor: "#D4C5B9",
        trunkColor: "#8B7355",
        description: "From your notes",
        rarity: "common"
    },
    {
        id: "sprout",
        label: "Sprout",
        icon: "leaf.fill",
        unlockCost: 0,
        canopyColor: "#5C9E62",
        highlightColor: "#7BC47F",
        trunkColor: "#4A3728",
        description: "Early growth",
        rarity: "common"
    },
    // Uncommon (5-45 stones)
    {
        id: "pine",
        label: "Pine Tree",
        icon: "tree.fill",
        unlockCost: 5,
        canopyColor: "#3E7A44",
        highlightColor: "#5C9E62",
        trunkColor: "#3D2B1F",
        description: "Steady strength",
        rarity: "uncommon"
    },
    {
        id: "oak",
        label: "Oak Tree",
        icon: "tree.fill",
        unlockCost: 10,
        canopyColor: "#2B4634",
        highlightColor: "#5C9E62",
        trunkColor: "#8B7355",
        description: "Ancient wisdom",
        rarity: "uncommon"
    },
    {
        id: "cherry",
        label: "Cherry Tree",
        icon: "sun.max.fill",
        unlockCost: 20,
        canopyColor: "#E8A0B5",
        highlightColor: "#F0C8D8",
        trunkColor: "#8B6B5A",
        description: "Delicate beauty",
        rarity: "uncommon"
    },
    {
        id: "maple",
        label: "Maple Tree",
        icon: "leaf.fill",
        unlockCost: 25,
        canopyColor: "#D4702A",
        highlightColor: "#E8A0B5",
        trunkColor: "#4A3728",
        description: "Seasonal splendor",
        rarity: "uncommon"
    },
    {
        id: "birch",
        label: "Birch Tree",
        icon: "tree.fill",
        unlockCost: 30,
        canopyColor: "#C8B89A",
        highlightColor: "#E0E0E0",
        trunkColor: "#E0E0E0",
        description: "Elegant whiteness",
        rarity: "uncommon"
    },
    {
        id: "willow",
        label: "Weeping Willow",
        icon: "wind",
        unlockCost: 35,
        canopyColor: "#8AAF80",
        highlightColor: "#A0C0A0",
        trunkColor: "#4A3728",
        description: "Graceful flow",
        rarity: "uncommon"
    },
    {
        id: "jasmine",
        label: "Jasmine",
        icon: "sun.max.fill",
        unlockCost: 40,
        canopyColor: "#F0E8C0",
        highlightColor: "#FDF8E0",
        trunkColor: "#5C4033",
        description: "Sweet fragrance",
        rarity: "uncommon"
    },
    {
        id: "lavender",
        label: "Lavender",
        icon: "sparkles",
        unlockCost: 45,
        canopyColor: "#9B8EC4",
        highlightColor: "#C8B8E8",
        trunkColor: "#4A3728",
        description: "Calming presence",
        rarity: "uncommon"
    },
    // Rare (50-140 stones)
    {
        id: "redwood",
        label: "Redwood",
        icon: "tree.fill",
        unlockCost: 50,
        canopyColor: "#4A6838",
        highlightColor: "#6B8040",
        trunkColor: "#7A341E",
        description: "Mighty giant",
        rarity: "rare"
    },
    {
        id: "bamboo",
        label: "Bamboo",
        icon: "leaf.fill",
        unlockCost: 60,
        canopyColor: "#5A9050",
        highlightColor: "#8AAF80",
        trunkColor: "#8AAF80",
        description: "Flexible strength",
        rarity: "rare"
    },
    {
        id: "palm",
        label: "Palm",
        icon: "sun.horizon.fill",
        unlockCost: 70,
        canopyColor: "#6AB050",
        highlightColor: "#8AAF80",
        trunkColor: "#8A6C3A",
        description: "Tropical escape",
        rarity: "rare"
    },
    {
        id: "baobab",
        label: "Baobab",
        icon: "tree.fill",
        unlockCost: 80,
        canopyColor: "#8A6C3A",
        highlightColor: "#A68B5A",
        trunkColor: "#5C4033",
        description: "Ancient guardian",
        rarity: "rare"
    },
    {
        id: "sunflower",
        label: "Sunflower",
        icon: "sun.max.fill",
        unlockCost: 90,
        canopyColor: "#E8C840",
        highlightColor: "#F0D860",
        trunkColor: "#5A9050",
        description: "Radiant warmth",
        rarity: "rare"
    },
    {
        id: "iris",
        label: "Iris",
        icon: "leaf.fill",
        unlockCost: 100,
        canopyColor: "#8E60B8",
        highlightColor: "#A080D0",
        trunkColor: "#5A9050",
        description: "Royal elegance",
        rarity: "rare"
    },
    {
        id: "sakura",
        label: "Sakura",
        icon: "sun.max.fill",
        unlockCost: 110,
        canopyColor: "#E8A0B5",
        highlightColor: "#F0C8D8",
        trunkColor: "#8B6B5A",
        description: "Cherry blossoms",
        rarity: "rare"
    },
    {
        id: "cypress",
        label: "Cypress",
        icon: "tree.fill",
        unlockCost: 130,
        canopyColor: "#3E7A44",
        highlightColor: "#5C9E62",
        trunkColor: "#3D2B1F",
        description: "Mediterranean grace",
        rarity: "rare"
    },
    // Epic (150-240 stones)
    {
        id: "moonlight",
        label: "Moonlight",
        icon: "moon.stars.fill",
        unlockCost: 150,
        canopyColor: "#6B90C8",
        highlightColor: "#A0D0F0",
        trunkColor: "#2F4F4F",
        description: "Nocturnal beauty",
        rarity: "epic"
    },
    {
        id: "starry",
        label: "Starry",
        icon: "star.fill",
        unlockCost: 170,
        canopyColor: "#1A3060",
        highlightColor: "#405080",
        trunkColor: "#191970",
        description: "Celestial wonder",
        rarity: "epic"
    },
    {
        id: "aurora",
        label: "Aurora",
        icon: "sparkles",
        unlockCost: 180,
        canopyColor: "#60C8A8",
        highlightColor: "#A0F0D8",
        trunkColor: "#2E8B57",
        description: "Northern lights",
        rarity: "epic"
    },
    {
        id: "ancient",
        label: "Ancient",
        icon: "crown.fill",
        unlockCost: 200,
        canopyColor: "#3A5A40",
        highlightColor: "#5C8060",
        trunkColor: "#4A3728",
        description: "Timeless wisdom",
        rarity: "epic"
    },
    // Legendary (250+)
    {
        id: "crystalline",
        label: "Crystalline",
        icon: "sparkles",
        unlockCost: 250,
        canopyColor: "#7EC8E3",
        highlightColor: "#FFFFFF",
        trunkColor: "#B0C4DE",
        description: "Pure perfection",
        rarity: "legendary"
    },
    {
        id: "phoenix",
        label: "Phoenix",
        icon: "flame.fill",
        unlockCost: 300,
        canopyColor: "#C84820",
        highlightColor: "#FF6030",
        trunkColor: "#8B0000",
        description: "Rebirth and fire",
        rarity: "legendary"
    },
    {
        id: "eternal",
        label: "Eternal",
        icon: "infinity",
        unlockCost: 350,
        canopyColor: "#C8A840",
        highlightColor: "#F0D060",
        trunkColor: "#5C4033",
        description: "Forever growth",
        rarity: "legendary"
    },
    // Special
    {
        id: "rockStack",
        label: "Fragments",
        icon: "circle.grid.3x3.fill",
        unlockCost: 0,
        canopyColor: "#A89968",
        highlightColor: "#D4C5B9",
        trunkColor: "#8B7355",
        description: "Partial progress",
        rarity: "common"
    }
];

export function getTreeSpecies(id: string): TreeSpeciesDefinition | undefined {
    return TREE_SPECIES.find(t => t.id === id);
}

export function getUnlockedSpecies(totalStones: number): TreeSpeciesDefinition[] {
    return TREE_SPECIES.filter(t => t.unlockCost <= totalStones);
}

/**
 * Map SF Symbol names to emoji equivalents for web display
 * Used as fallback when native icon support isn't available
 */
export const SF_SYMBOL_TO_EMOJI: Record<string, string> = {
    "tree.fill": "🌲",
    "leaf.fill": "🍃",
    "sun.max.fill": "☀️",
    "sun.horizon.fill": "🌅",
    "moon.stars.fill": "🌙",
    "star.fill": "⭐",
    "crown.fill": "👑",
    "flame.fill": "🔥",
    "sparkles": "✨",
    "wind": "💨",
    "circle.grid.3x3.fill": "⊞",
    "infinity": "∞"
};

export function getSFSymbolEmoji(sfSymbol: string): string {
    return SF_SYMBOL_TO_EMOJI[sfSymbol] || "🌳";
}
