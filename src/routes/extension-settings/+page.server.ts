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
		throw new Error('Failed to load profile');
	}

	return {
		profile: profile || null,
		extensionEnabled: profile?.extension_enabled ?? true,
		blockingEnabled: profile?.blocking_enabled ?? true,
		autoBlockSessions: profile?.auto_block_sessions ?? false,
		notificationsEnabled: profile?.extension_notifications ?? true,
		blockedDomains: profile?.blocked_domains ?? []
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
			const { error } = await supabase
				.from('profiles')
				.update({
					extension_enabled: extensionEnabled,
					blocking_enabled: blockingEnabled,
					auto_block_sessions: autoBlockSessions,
					extension_notifications: notificationsEnabled,
					blocked_domains: blockedDomains
				})
				.eq('id', user.id);

			if (error) {
				console.error('[extension-settings] Update error:', error);
				return fail(500, { error: 'Failed to save settings' });
			}

			return {
				success: true,
				message: '✓ Settings saved! Changes will sync to your extension within 60 seconds.'
			};
		} catch (err) {
			console.error('[extension-settings] Unexpected error:', err);
			return fail(500, { error: 'Unexpected error while saving settings' });
		}
	}
};
