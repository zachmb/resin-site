import { TREE_SPECIES, type TreeSpeciesDefinition } from './treeSpecies';

export interface ForestTreeData {
    id: string;
    species: TreeSpeciesDefinition;
    durationMinutes: number;
    date: Date;
    title: string;
    health: number;
}

/**
 * Generates forest trees from amber sessions (synced with iOS app logic)
 * Each completed session becomes a tree, species determined by duration
 */
export function generateForestTrees(
    sessions: any[],
    forestHealth: number = 100
): ForestTreeData[] {
    return sessions
        .filter(s => s.status === 'completed' || s.status === 'scheduled')
        .map((session: any, index: number) => {
            const durationMinutes = session.amber_tasks?.reduce(
                (sum: number, task: any) => sum + (task.estimated_minutes || 0),
                0
            ) || 0;

            // Skip sessions with no duration
            if (durationMinutes === 0) return null;

            const species = getSpeciesForSession(session, durationMinutes, index);
            const date = new Date(session.created_at || session.start_time || new Date());
            const title = session.title || `Session ${index + 1}`;

            return {
                id: session.id,
                species,
                durationMinutes,
                date,
                title,
                health: forestHealth
            };
        })
        .filter((tree): tree is ForestTreeData => tree !== null)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Determines tree species based on session characteristics
 * Matches the iOS app's logic for species selection
 */
function getSpeciesForSession(
    session: any,
    durationMinutes: number,
    index: number
): TreeSpeciesDefinition {
    // Map session characteristics to tree species
    const sessionType = session.session_type || 'standard';
    const difficulty = session.difficulty || 'medium';

    // Use different species based on characteristics
    let speciesId = 'amber'; // default

    if (sessionType === 'focus') {
        if (durationMinutes > 120) speciesId = 'redwood';
        else if (durationMinutes > 90) speciesId = 'oak';
        else if (durationMinutes > 60) speciesId = 'pine';
        else speciesId = 'sprout';
    } else if (sessionType === 'deep_work') {
        speciesId = 'ancient';
    } else if (sessionType === 'creative') {
        speciesId = difficulty === 'hard' ? 'sakura' : 'cherry';
    } else if (sessionType === 'break' || durationMinutes <= 15) {
        speciesId = 'sprout';
    } else {
        // Cycle through various species for variety
        const varietySpecies = [
            'amber',
            'oak',
            'pine',
            'cherry',
            'maple',
            'birch',
            'willow',
            'palm'
        ];
        speciesId = varietySpecies[index % varietySpecies.length];
    }

    return TREE_SPECIES.find(s => s.id === speciesId) || TREE_SPECIES[0];
}

/**
 * Get tree size category based on duration (matches iOS app)
 */
export function getTreeSize(durationMinutes: number): 'shrub' | 'standard' | 'large' | 'majestic' {
    if (durationMinutes < 20) return 'shrub';
    if (durationMinutes < 60) return 'standard';
    if (durationMinutes < 120) return 'large';
    return 'majestic';
}

/**
 * Calculate size scale factor for rendering
 */
export function getSizeScale(durationMinutes: number): number {
    const size = getTreeSize(durationMinutes);
    switch (size) {
        case 'shrub':
            return 0.55;
        case 'standard':
            return 0.8;
        case 'large':
            return 1.0;
        case 'majestic':
            return 1.25;
    }
}
