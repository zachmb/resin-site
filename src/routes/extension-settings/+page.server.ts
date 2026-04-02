/**
 * Extension Settings Page — Server Load & Actions
 *
 * Loads user profile with extension settings.
 * Handles saving extension configuration via server actions.
 */

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser();

	if (!user || authError) {
		throw redirect(303, '/login');
	}

	// Load profile with extension settings
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	if (profileError) {
		console.error('[extension-settings/+page.server] Profile load error:', profileError);
		// If profile doesn't exist, we might be in a broken state, but we'll try to continue
	}

	// Fetch custom blocked domains from the dedicated table
	const { data: customBlocks, error: blocksError } = await supabase
		.from('user_custom_blocks')
		.select('domain')
		.eq('user_id', user.id);

	if (blocksError) {
		console.warn('[extension-settings/+page.server] Custom blocks load error:', blocksError);
	}

	const blockedDomains = customBlocks ? customBlocks.map((b) => b.domain) : [];

	return {
		profile: profile || null,
		extensionEnabled: profile?.extension_enabled ?? true,
		blockingEnabled: profile?.blocking_enabled ?? true,
		autoBlockSessions: profile?.auto_block_sessions ?? false,
		notificationsEnabled: profile?.extension_notifications ?? true,
		blockedDomains: blockedDomains
	};
};

export const actions: Actions = {
	saveSettings: async ({ request, locals }) => {
		const supabase = locals.supabase;

		const {
			data: { user },
			error: authError
		} = await supabase.auth.getUser();

		if (!user || authError) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		const extensionEnabled = formData.get('extensionEnabled') === 'on';
		const blockingEnabled = formData.get('blockingEnabled') === 'on';
		const autoBlockSessions = formData.get('autoBlockSessions') === 'on';
		const notificationsEnabled = formData.get('notificationsEnabled') === 'on';
		const blockedDomainsStr = (formData.get('blockedDomains') as string) || '[]';

		let blockedDomains: string[] = [];
		try {
			blockedDomains = JSON.parse(blockedDomainsStr);
		} catch (e) {
			console.error('[extension-settings] Failed to parse blockedDomains:', e);
			return fail(400, { error: 'Invalid blockedDomains format' });
		}

		try {
			// 1. Update basic profile settings
			const { error: profileError } = await supabase
				.from('profiles')
				.update({
					extension_enabled: extensionEnabled,
					blocking_enabled: blockingEnabled,
					auto_block_sessions: autoBlockSessions,
					extension_notifications: notificationsEnabled,
					// We keep this for backward compatibility and as a secondary backup
					blocked_domains: blockedDomains
				})
				.eq('id', user.id);

			if (profileError) {
				console.error('[extension-settings] Profile update error:', profileError);
				return fail(500, { error: 'Failed to save settings to profile' });
			}

			// 2. Synchronize user_custom_blocks table (The Source of Truth for Extension)
			// This is more complex than a simple update because it's a multi-row table
			
			// A. Remove existing blocks
			const { error: deleteError } = await supabase
				.from('user_custom_blocks')
				.delete()
				.eq('user_id', user.id);

			if (deleteError) {
				console.error('[extension-settings] Failed to clear old blocks:', deleteError);
				return fail(500, { error: 'Failed to synchronize block list' });
			}

			// B. Insert new blocks if any
			if (blockedDomains.length > 0) {
				const blocksToInsert = blockedDomains.map(domain => ({
					user_id: user.id,
					domain: domain.trim().toLowerCase()
				}));

				const { error: insertError } = await supabase
					.from('user_custom_blocks')
					.insert(blocksToInsert);

				if (insertError) {
					console.error('[extension-settings] Failed to insert new blocks:', insertError);
					return fail(500, { error: 'Failed to update block list' });
				}
			}

			return {
				success: true,
				message: '✓ Settings saved! Changes will sync to your extension instantly.'
			};
		} catch (err) {
			console.error('[extension-settings] Unexpected error:', err);
			return fail(500, { error: 'Unexpected error while saving settings' });
		}
	}
};
