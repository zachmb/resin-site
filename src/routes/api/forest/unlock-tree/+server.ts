import { json, fail } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, getSession } }) => {
	try {
		const session = await getSession();
		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const speciesId = body.speciesId?.toString();

		if (!speciesId) {
			return json({ error: 'Missing species ID' }, { status: 400 });
		}

		// Fetch current profile data
		const { data: profile, error: fetchError } = await supabase
			.from('profiles')
			.select('total_stones, unlocked_tree_ids')
			.eq('id', userId)
			.single();

		if (fetchError || !profile) {
			return json({ error: 'Failed to fetch profile' }, { status: 500 });
		}

		// Parse unlocked trees
		let unlockedTrees = Array.isArray(profile.unlocked_tree_ids)
			? profile.unlocked_tree_ids
			: profile.unlocked_tree_ids
				? JSON.parse(profile.unlocked_tree_ids as any)
				: [];

		if (!Array.isArray(unlockedTrees)) {
			unlockedTrees = [];
		}

		// Check if already unlocked
		if (unlockedTrees.includes(speciesId)) {
			return json({ error: 'Tree already unlocked' }, { status: 400 });
		}

		// Get tree cost from treeSpecies
		const treeCosts: Record<string, number> = {
			amber: 0, stone: 0, sprout: 0,
			pine: 5, oak: 10, cherry: 20, maple: 25, birch: 30, willow: 35, jasmine: 40, lavender: 45,
			redwood: 50, bamboo: 60, palm: 70, baobab: 80, sunflower: 90, iris: 100, sakura: 110, cypress: 130,
			moonlight: 150, starry: 170, aurora: 180, ancient: 200,
			crystalline: 250, phoenix: 300, eternal: 350,
			rockStack: 0
		};

		const cost = treeCosts[speciesId] || 0;

		// Free trees don't need stones
		if (cost === 0) {
			unlockedTrees.push(speciesId);
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					unlocked_tree_ids: unlockedTrees,
					updated_at: new Date().toISOString()
				})
				.eq('id', userId);

			if (updateError) {
				return json({ error: 'Failed to unlock tree' }, { status: 500 });
			}

			return json({
				success: true,
				message: `${speciesId} unlocked!`,
				newStoneCount: profile.total_stones || 0,
				unlockedTrees
			});
		}

		// Check if user has enough stones
		if ((profile.total_stones || 0) < cost) {
			return json(
				{
					error: `Not enough stones. Need ${cost}, have ${profile.total_stones || 0}`
				},
				{ status: 400 }
			);
		}

		// Deduct stones and add tree to unlocked list
		unlockedTrees.push(speciesId);
		const newStoneCount = (profile.total_stones || 0) - cost;

		const { error: updateError } = await supabase
			.from('profiles')
			.update({
				total_stones: newStoneCount,
				unlocked_tree_ids: unlockedTrees,
				updated_at: new Date().toISOString()
			})
			.eq('id', userId);

		if (updateError) {
			return json({ error: 'Failed to unlock tree' }, { status: 500 });
		}

		return json({
			success: true,
			message: `Tree unlocked! -${cost} 🪨`,
			newStoneCount,
			unlockedTrees
		});
	} catch (err) {
		console.error('[Unlock Tree API Error]:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
