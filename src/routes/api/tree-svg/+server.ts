import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const species = url.searchParams.get('species') || 'oak';
    const size = parseInt(url.searchParams.get('size') || '48');
    const health = parseInt(url.searchParams.get('health') || '100');

    // Generate SVG that matches TreeSVG.svelte exactly
    const svg = generateTreeSVG(species, size, health);

    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
};

function generateTreeSVG(species: string, size: number, health: number): string {
    const saturation = (health / 100) * 0.8 + 0.2;
    const rotation = health < 30 ? 'rotate(-8, 24, 64)' : '';

    // Get colors for this species (must match treeSpecies.ts)
    const colors = getSpeciesColors(species);
    const { canopy, trunk, highlight } = colors;

    const resinOpacity = getResinOpacity(species);

    // Build the SVG content based on species
    const content = generateSpeciesContent(species, canopy, trunk, highlight);

    return `<svg width="${size}" height="${Math.round(size * 1.33)}" viewBox="0 0 48 64" style="filter: saturate(${saturation})" ${rotation !== '' ? `transform="${rotation}"` : ''}>
        <defs>
            <linearGradient id="grad-${species}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${highlight};stop-opacity:0.6" />
                <stop offset="50%" style="stop-color:${canopy};stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:${trunk};stop-opacity:0.4" />
            </linearGradient>
            ${['epic', 'legendary'].includes(species) ? `<filter id="glow-${species}" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                <feFlood flood-color="${highlight}" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>` : ''}
        </defs>
        <g ${['epic', 'legendary'].includes(species) ? `filter="url(#glow-${species})"` : ''}>
            ${content}
        </g>
    </svg>`;
}

function generateSpeciesContent(species: string, canopy: string, trunk: string, highlight: string): string {
    // Return SVG path content for each species
    // This matches TreeSVG.svelte exactly
    switch (species) {
        case 'oak':
        case 'redwood':
            return `<path d="M22 64 L22 44 Q22.5 38 24 32" stroke="${trunk}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9" />
                <path d="M26 64 L26 44 Q25.5 38 24 32" stroke="${trunk}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85" />
                <ellipse cx="24" cy="26" rx="18" ry="16" fill="${canopy}" opacity="0.95" />
                <circle cx="12" cy="32" r="10" fill="${canopy}" opacity="0.88" />
                <circle cx="36" cy="32" r="10" fill="${canopy}" opacity="0.88" />
                <circle cx="20" cy="18" r="8" fill="${canopy}" opacity="0.82" />
                <circle cx="28" cy="18" r="8" fill="${canopy}" opacity="0.82" />`;

        case 'cherry':
        case 'sakura':
            return `<path d="M24 64 Q23 58 23 50 Q23.5 44 24 38" stroke="${trunk}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="28" r="16" fill="${canopy}" opacity="0.95" />
                <circle cx="14" cy="35" r="11" fill="${canopy}" opacity="0.9" />
                <circle cx="34" cy="35" r="11" fill="${canopy}" opacity="0.9" />
                <circle cx="20" cy="22" r="7" fill="${canopy}" opacity="0.85" />
                <circle cx="28" cy="22" r="7" fill="${canopy}" opacity="0.85" />
                <circle cx="18" cy="28" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="30" cy="32" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="24" cy="22" r="1.2" fill="${highlight}" opacity="0.6" />`;

        case 'palm':
            return `<path d="M24 64 Q22 52 23 40 Q23.5 32 24 24" stroke="${trunk}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9" />
                <circle cx="23" cy="50" r="0.8" fill="rgba(0,0,0,0.3)" />
                <circle cx="25" cy="38" r="0.6" fill="rgba(0,0,0,0.3)" />
                <g stroke="${canopy}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9">
                    <path d="M24 24 Q38 24 40 30" />
                    <path d="M24 24 Q34 32 38 42" />
                    <path d="M24 24 Q24 36 22 48" />
                    <path d="M24 24 Q14 32 10 42" />
                    <path d="M24 24 Q10 24 8 30" />
                </g>`;

        case 'bamboo':
            return `<rect x="21" y="30" width="6" height="8" fill="${trunk}" rx="0.5" opacity="0.9" />
                <rect x="21" y="39" width="6" height="8" fill="${trunk}" rx="0.5" opacity="0.8" />
                <rect x="21" y="48" width="6" height="8" fill="${trunk}" rx="0.5" opacity="0.9" />
                <rect x="21" y="57" width="6" height="7" fill="${trunk}" rx="0.5" opacity="0.8" />
                <line x1="20" y1="38" x2="28" y2="38" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <line x1="20" y1="47" x2="28" y2="47" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <line x1="20" y1="56" x2="28" y2="56" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <g fill="${canopy}" opacity="0.85">
                    <ellipse cx="16" cy="32" rx="5" ry="3" transform="rotate(-35, 16, 32)" />
                    <ellipse cx="32" cy="32" rx="5" ry="3" transform="rotate(35, 32, 32)" />
                    <ellipse cx="14" cy="45" rx="4" ry="2.5" transform="rotate(-40, 14, 45)" />
                    <ellipse cx="34" cy="45" rx="4" ry="2.5" transform="rotate(40, 34, 45)" />
                </g>`;

        case 'amber':
            return `<path d="M22 64 L22 45 Q22.5 38 24 32" stroke="${trunk}" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.9" />
                <path d="M26 64 L26 45 Q25.5 38 24 32" stroke="${trunk}" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="25" r="14" fill="${canopy}" opacity="0.95" />
                <circle cx="12" cy="32" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="36" cy="32" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="18" cy="18" r="6" fill="${canopy}" opacity="0.85" />
                <circle cx="30" cy="18" r="6" fill="${canopy}" opacity="0.85" />`;

        case 'maple':
            return `<path d="M22 64 L22 45 Q23 38 24 32" stroke="${trunk}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9" />
                <path d="M26 64 L26 45 Q25 38 24 32" stroke="${trunk}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="24" r="12" fill="${canopy}" opacity="0.95" />
                <circle cx="14" cy="28" r="8" fill="${canopy}" opacity="0.9" />
                <circle cx="34" cy="28" r="8" fill="${canopy}" opacity="0.9" />
                <circle cx="20" cy="14" r="5" fill="${canopy}" opacity="0.85" />
                <circle cx="28" cy="14" r="5" fill="${canopy}" opacity="0.85" />`;

        case 'pine':
        case 'cypress':
            return `<line x1="24" y1="64" x2="24" y2="44" stroke="${trunk}" stroke-width="5" stroke-linecap="round" opacity="0.85" />
                <path d="M24 8 L40 24 L38 28 Q24 20 10 28 L8 24 Z" fill="${canopy}" opacity="0.95" />
                <path d="M24 18 L38 30 L36 34 Q24 26 12 34 L10 30 Z" fill="${canopy}" opacity="0.9" />
                <path d="M24 28 L36 40 L34 42 Q24 34 14 42 L12 40 Z" fill="${canopy}" opacity="0.85" />`;

        case 'willow':
            return `<path d="M24 64 Q20 50 22 36 Q24 22 24 10" stroke="${trunk}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
                <g stroke="${canopy}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.8">
                    <path d="M22 40 Q18 45 14 52" />
                    <path d="M23 35 Q19 42 16 50" />
                    <path d="M25 35 Q29 42 32 50" />
                    <path d="M26 40 Q30 45 34 52" />
                    <path d="M24 50 Q20 55 18 60" />
                    <path d="M24 50 Q28 55 30 60" />
                </g>`;

        case 'sprout':
            return `<line x1="24" y1="64" x2="24" y2="40" stroke="${trunk}" stroke-width="2" stroke-linecap="round" opacity="0.8" />
                <ellipse cx="20" cy="38" rx="3" ry="4" fill="${canopy}" opacity="0.8" transform="rotate(-30, 20, 38)" />
                <ellipse cx="28" cy="38" rx="3" ry="4" fill="${canopy}" opacity="0.8" transform="rotate(30, 28, 38)" />
                <ellipse cx="24" cy="30" rx="3.5" ry="5" fill="${canopy}" opacity="0.85" />
                <circle cx="24" cy="20" r="4" fill="${canopy}" opacity="0.9" />`;

        case 'stone':
            return `<rect x="20" y="40" width="8" height="24" fill="${trunk}" opacity="0.95" />
                <line x1="20" y1="50" x2="28" y2="50" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" />
                <line x1="20" y1="58" x2="28" y2="58" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" />
                <circle cx="24" cy="26" r="13" fill="${canopy}" opacity="0.92" />
                <circle cx="15" cy="35" r="8" fill="${canopy}" opacity="0.88" />
                <circle cx="33" cy="35" r="8" fill="${canopy}" opacity="0.88" />`;

        case 'jasmine':
            return `<line x1="24" y1="64" x2="24" y2="38" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="28" r="11" fill="${canopy}" opacity="0.92" />
                <circle cx="18" cy="24" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="30" cy="24" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="20" cy="35" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="28" cy="35" r="1.5" fill="${highlight}" opacity="0.7" />
                <circle cx="24" cy="32" r="1" fill="${highlight}" opacity="0.7" />`;

        case 'lavender':
            return `<line x1="24" y1="64" x2="24" y2="32" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
                <ellipse cx="24" cy="20" rx="2" ry="4" fill="${canopy}" opacity="0.85" transform="rotate(0, 24, 20)" />
                <ellipse cx="20" cy="22" rx="2" ry="4" fill="${canopy}" opacity="0.85" transform="rotate(-30, 20, 22)" />
                <ellipse cx="28" cy="22" rx="2" ry="4" fill="${canopy}" opacity="0.85" transform="rotate(30, 28, 22)" />
                <ellipse cx="18" cy="28" rx="2" ry="3.5" fill="${canopy}" opacity="0.85" transform="rotate(-60, 18, 28)" />
                <ellipse cx="30" cy="28" rx="2" ry="3.5" fill="${canopy}" opacity="0.85" transform="rotate(60, 30, 28)" />
                <ellipse cx="24" cy="34" rx="2" ry="3" fill="${canopy}" opacity="0.85" transform="rotate(0, 24, 34)" />`;

        case 'iris':
            return `<line x1="24" y1="64" x2="24" y2="30" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
                <ellipse cx="24" cy="22" rx="3" ry="6" fill="${canopy}" opacity="0.88" transform="rotate(0, 24, 22)" />
                <ellipse cx="18" cy="26" rx="3" ry="6" fill="${canopy}" opacity="0.88" transform="rotate(-45, 18, 26)" />
                <ellipse cx="30" cy="26" rx="3" ry="6" fill="${canopy}" opacity="0.88" transform="rotate(45, 30, 26)" />
                <ellipse cx="24" cy="25" rx="2" ry="3" fill="${highlight}" opacity="0.6" transform="rotate(0, 24, 25)" />`;

        case 'moonlight':
            return `<path d="M24 64 Q22 50 24 40 Q26 32 24 24" stroke="${trunk}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="20" r="10" fill="${canopy}" opacity="0.9" />
                <circle cx="16" cy="26" r="7" fill="${canopy}" opacity="0.85" />
                <circle cx="32" cy="26" r="7" fill="${canopy}" opacity="0.85" />
                <circle cx="20" cy="14" r="5" fill="${canopy}" opacity="0.8" />
                <circle cx="28" cy="14" r="5" fill="${canopy}" opacity="0.8" />`;

        case 'starry':
            return `<line x1="24" y1="64" x2="24" y2="40" stroke="${trunk}" stroke-width="4" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="24" r="14" fill="${canopy}" opacity="0.95" />
                <circle cx="12" cy="28" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="36" cy="28" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="18" cy="16" r="6" fill="${canopy}" opacity="0.85" />
                <circle cx="30" cy="16" r="6" fill="${canopy}" opacity="0.85" />
                <circle cx="24" cy="10" r="4" fill="${highlight}" opacity="0.8" />`;

        case 'aurora':
            return `<path d="M24 64 Q22 52 23 40 Q24 32 24 24" stroke="${trunk}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="22" r="12" fill="${canopy}" opacity="0.95" />
                <circle cx="14" cy="28" r="8" fill="${canopy}" opacity="0.9" />
                <circle cx="34" cy="28" r="8" fill="${canopy}" opacity="0.9" />
                <circle cx="20" cy="14" r="5" fill="${canopy}" opacity="0.85" />
                <circle cx="28" cy="14" r="5" fill="${canopy}" opacity="0.85" />`;

        case 'ancient':
            return `<path d="M22 64 L22 44 Q22 36 24 32" stroke="${trunk}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9" />
                <path d="M26 64 L26 44 Q26 36 24 32" stroke="${trunk}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="24" r="16" fill="${canopy}" opacity="0.95" />
                <circle cx="10" cy="30" r="11" fill="${canopy}" opacity="0.9" />
                <circle cx="38" cy="30" r="11" fill="${canopy}" opacity="0.9" />`;

        case 'crystalline':
            return `<path d="M24 64 L24 40" stroke="${trunk}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85" />
                <polygon points="24,8 40,20 40,36 24,44 8,36 8,20" fill="${canopy}" opacity="0.95" />
                <polygon points="24,16 36,24 36,32 24,36 12,32 12,24" fill="${highlight}" opacity="0.3" />`;

        case 'phoenix':
            return `<path d="M24 64 Q23 54 24 44 Q24.5 36 24 28" stroke="${trunk}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85" />
                <circle cx="24" cy="20" r="14" fill="${canopy}" opacity="0.95" />
                <circle cx="12" cy="26" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="36" cy="26" r="9" fill="${canopy}" opacity="0.9" />
                <circle cx="18" cy="12" r="6" fill="${highlight}" opacity="0.7" />
                <circle cx="30" cy="12" r="6" fill="${highlight}" opacity="0.7" />`;

        case 'eternal':
            return `<rect x="20" y="36" width="8" height="28" fill="${trunk}" opacity="0.95" />
                <circle cx="24" cy="26" r="15" fill="${canopy}" opacity="0.95" />
                <circle cx="11" cy="32" r="10" fill="${canopy}" opacity="0.9" />
                <circle cx="37" cy="32" r="10" fill="${canopy}" opacity="0.9" />
                <circle cx="17" cy="18" r="7" fill="${canopy}" opacity="0.85" />
                <circle cx="31" cy="18" r="7" fill="${canopy}" opacity="0.85" />`;

        case 'rockStack':
            return `<g fill="${canopy}" opacity="0.9">
                <rect x="18" y="50" width="12" height="14" rx="1" />
                <rect x="16" y="40" width="16" height="12" rx="1" />
                <rect x="14" y="30" width="20" height="12" rx="1" />
                <rect x="16" y="20" width="16" height="12" rx="1" />
            </g>`;

        case 'baobab':
            return `<ellipse cx="24" cy="50" rx="7" ry="14" fill="${trunk}" opacity="0.9" />
                <line x1="20" y1="40" x2="28" y2="40" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <line x1="19" y1="50" x2="29" y2="50" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <line x1="20" y1="60" x2="28" y2="60" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
                <circle cx="24" cy="18" r="10" fill="${canopy}" opacity="0.85" />
                <circle cx="16" cy="22" r="5" fill="${canopy}" opacity="0.7" />
                <circle cx="32" cy="22" r="5" fill="${canopy}" opacity="0.7" />
                <path d="M18 64 Q14 62 12 58" stroke="${trunk}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6" />
                <path d="M30 64 Q34 62 36 58" stroke="${trunk}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6" />`;

        case 'birch':
            return `<rect x="21" y="40" width="6" height="24" fill="${trunk}" opacity="0.95" />
                <ellipse cx="20" cy="48" rx="1.5" ry="2" fill="#2C2C2C" opacity="0.4" />
                <ellipse cx="26" cy="56" rx="1.5" ry="2" fill="#2C2C2C" opacity="0.4" />
                <ellipse cx="24" cy="28" rx="16" ry="14" fill="${canopy}" opacity="0.9" />
                <circle cx="14" cy="34" r="8" fill="${canopy}" opacity="0.85" />
                <circle cx="34" cy="34" r="8" fill="${canopy}" opacity="0.85" />`;

        case 'sunflower':
            return `<line x1="24" y1="64" x2="24" y2="32" stroke="${highlight}" stroke-width="3" stroke-linecap="round" opacity="0.8" />
                <circle cx="24" cy="55" r="0.6" fill="rgba(0,0,0,0.2)" />
                <circle cx="24" cy="42" r="0.6" fill="rgba(0,0,0,0.2)" />
                <g opacity="0.95">
                    <ellipse cx="24" cy="24" rx="3" ry="6" fill="${canopy}" />
                    <ellipse cx="30" cy="22" rx="3" ry="6" fill="${canopy}" transform="rotate(60, 30, 22)" />
                    <ellipse cx="30" cy="26" rx="3" ry="6" fill="${canopy}" transform="rotate(120, 30, 26)" />
                    <ellipse cx="24" cy="30" rx="3" ry="6" fill="${canopy}" transform="rotate(180, 24, 30)" />
                    <ellipse cx="18" cy="26" rx="3" ry="6" fill="${canopy}" transform="rotate(240, 18, 26)" />
                    <ellipse cx="18" cy="22" rx="3" ry="6" fill="${canopy}" transform="rotate(300, 18, 22)" />
                </g>
                <circle cx="24" cy="24" r="6" fill="#4A3728" opacity="0.9" />
                <circle cx="24" cy="20" r="0.8" fill="rgba(0,0,0,0.4)" />
                <circle cx="28" cy="24" r="0.8" fill="rgba(0,0,0,0.4)" />
                <circle cx="24" cy="28" r="0.8" fill="rgba(0,0,0,0.4)" />
                <circle cx="20" cy="24" r="0.8" fill="rgba(0,0,0,0.4)" />`;

        default:
            return `<circle cx="24" cy="24" r="14" fill="${canopy}" opacity="0.9" />`;
    }
}

function getSpeciesColors(species: string): { canopy: string; trunk: string; highlight: string } {
    // Match treeSpecies.ts colors exactly
    const colorMap: Record<string, { canopy: string; trunk: string; highlight: string }> = {
        amber: { canopy: '#D4A574', trunk: '#8B6F47', highlight: '#FFD700' },
        stone: { canopy: '#8B8B7A', trunk: '#5C5C4D', highlight: '#BFBF9F' },
        sprout: { canopy: '#90EE90', trunk: '#228B22', highlight: '#7CFC00' },
        maple: { canopy: '#CD5C5C', trunk: '#8B4513', highlight: '#FF6347' },
        jasmine: { canopy: '#FFE4B5', trunk: '#8B7355', highlight: '#FFFACD' },
        lavender: { canopy: '#DDA0DD', trunk: '#8B6B47', highlight: '#EE82EE' },
        iris: { canopy: '#9370DB', trunk: '#6B4C8A', highlight: '#DDA0DD' },
        moonlight: { canopy: '#4B0082', trunk: '#2F1B5E', highlight: '#9932CC' },
        starry: { canopy: '#191970', trunk: '#000080', highlight: '#4169E1' },
        aurora: { canopy: '#00FA9A', trunk: '#228B22', highlight: '#00FF00' },
        ancient: { canopy: '#556B2F', trunk: '#3D3D1F', highlight: '#6B8E23' },
        crystalline: { canopy: '#B0E0E6', trunk: '#4682B4', highlight: '#87CEEB' },
        phoenix: { canopy: '#FF4500', trunk: '#8B4513', highlight: '#FFD700' },
        eternal: { canopy: '#4F4F2F', trunk: '#2C2C17', highlight: '#808000' },
        rockStack: { canopy: '#A9A9A9', trunk: '#696969', highlight: '#C0C0C0' },
        bamboo: { canopy: '#228B22', trunk: '#556B2F', highlight: '#7CFC00' },
        palm: { canopy: '#90EE90', trunk: '#8B4513', highlight: '#FFD700' },
        sunflower: { canopy: '#FFD700', trunk: '#DAA520', highlight: '#FFA500' },
        willow: { canopy: '#9ACD32', trunk: '#556B2F', highlight: '#ADFF2F' },
        baobab: { canopy: '#8B4513', trunk: '#654321', highlight: '#A0826D' },
        pine: { canopy: '#1F6B0F', trunk: '#3D2B1F', highlight: '#2E8B57' },
        cypress: { canopy: '#1F6B0F', trunk: '#3D2B1F', highlight: '#2E8B57' },
        cherry: { canopy: '#D4A5A5', trunk: '#8B5A3C', highlight: '#F0D9D6' },
        sakura: { canopy: '#FFB6C1', trunk: '#8B4513', highlight: '#FFC0CB' },
        oak: { canopy: '#4D6652', trunk: '#3D2B1F', highlight: '#8B9380' },
        birch: { canopy: '#E8E8D0', trunk: '#D3D3D3', highlight: '#FFFFF0' },
        redwood: { canopy: '#8B4513', trunk: '#5C3317', highlight: '#A0522D' }
    };

    return colorMap[species] || colorMap['oak'];
}

function getResinOpacity(species: string): number {
    const rarities: Record<string, string> = {
        amber: 'common',
        stone: 'common',
        sprout: 'common',
        maple: 'uncommon',
        jasmine: 'uncommon',
        lavender: 'uncommon',
        iris: 'uncommon',
        moonlight: 'rare',
        starry: 'rare',
        aurora: 'rare',
        ancient: 'rare',
        crystalline: 'epic',
        phoenix: 'epic',
        eternal: 'epic',
        rockStack: 'epic',
        bamboo: 'uncommon',
        palm: 'uncommon',
        sunflower: 'uncommon',
        willow: 'uncommon',
        baobab: 'rare',
        pine: 'common',
        cypress: 'uncommon',
        cherry: 'uncommon',
        sakura: 'rare',
        oak: 'common',
        birch: 'uncommon',
        redwood: 'rare'
    };

    const rarity = rarities[species] || 'common';
    switch (rarity) {
        case 'legendary':
            return 0.4;
        case 'epic':
            return 0.3;
        case 'rare':
            return 0.2;
        default:
            return 0.1;
    }
}
