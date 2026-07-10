/**
 * Extension Settings Page — Server Load & Actions
 *
 * Loads user profile with extension settings.
 * Handles saving extension configuration via server actions.
 */

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function normalizeBlockedDomain(raw: string): string | null {
	if (!raw || typeof raw !== 'string') return null;
	let domain = raw.trim().toLowerCase();
	domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
	domain = domain.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
	domain = domain.replace(/^www\./, '');
	if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) {
		return null;
	}
	return domain;
}

const MAX_CUSTOM_BLOCKED_DOMAINS = 1000;

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
	const accountType = typeof profile?.account_type === 'string' ? profile.account_type.toLowerCase() : 'free';
	const isPro = accountType === 'pro' || accountType === 'premium' || accountType === 'paid';

	return {
		profile: profile || null,
		isPro,
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
		const { data: profile } = await supabase
			.from('profiles')
			.select('account_type')
			.eq('id', user.id)
			.single();
		const accountType = typeof profile?.account_type === 'string' ? profile.account_type.toLowerCase() : 'free';
		const isPro = accountType === 'pro' || accountType === 'premium' || accountType === 'paid';
		if (!isPro) {
			return fail(402, { error: 'Web + extension blocking requires Resin Pro. Upgrade in the iOS app to sync protection here.' });
		}

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
		if (!Array.isArray(blockedDomains)) {
			return fail(400, { error: 'Invalid blockedDomains format' });
		}
		const invalidDomains = blockedDomains.filter((domain) => !normalizeBlockedDomain(String(domain)));
		if (invalidDomains.length > 0) {
			return fail(400, {
				error: `Remove or fix invalid domain${invalidDomains.length === 1 ? '' : 's'}: ${invalidDomains
					.slice(0, 3)
					.join(', ')}`
			});
		}
		blockedDomains = Array.from(
			new Set(blockedDomains.map((domain) => normalizeBlockedDomain(String(domain))).filter(Boolean) as string[])
		);
		if (blockedDomains.length > MAX_CUSTOM_BLOCKED_DOMAINS) {
			return fail(400, {
				error: `Keep this list under ${MAX_CUSTOM_BLOCKED_DOMAINS.toLocaleString()} domains so Chrome can apply protection reliably.`
			});
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

			// 2. Synchronize user_custom_blocks without delete-first data loss.
			// Insert missing rows before deleting removed rows, so a transient insert
			// failure never leaves the user with an empty protection list.
			const { data: existingBlocks, error: existingBlocksError } = await supabase
				.from('user_custom_blocks')
				.select('domain')
				.eq('user_id', user.id);

			if (existingBlocksError) {
				console.error('[extension-settings] Failed to load existing blocks:', existingBlocksError.message);
				return fail(500, { error: 'Failed to synchronize block list' });
			}

			const existingDomains = new Set((existingBlocks ?? []).map((block) => block.domain));
			const desiredDomains = new Set(blockedDomains);
			const domainsToAdd = blockedDomains.filter((domain) => !existingDomains.has(domain));
			const domainsToRemove = [...existingDomains].filter((domain) => !desiredDomains.has(domain));

			if (domainsToAdd.length > 0) {
				const blocksToInsert = domainsToAdd.map(domain => ({
					user_id: user.id,
					domain: domain.trim().toLowerCase()
				}));

				const { error: insertError } = await supabase
					.from('user_custom_blocks')
					.insert(blocksToInsert);

				if (insertError) {
					console.error('[extension-settings] Failed to insert new blocks:', insertError.message);
					return fail(500, { error: 'Failed to update block list' });
				}
			}

			if (domainsToRemove.length > 0) {
				const { error: deleteError } = await supabase
					.from('user_custom_blocks')
					.delete()
					.eq('user_id', user.id)
					.in('domain', domainsToRemove);

				if (deleteError) {
					console.error('[extension-settings] Failed to remove old blocks:', deleteError.message);
					return fail(500, { error: 'Settings saved, but some removed domains may still be protected. Try saving again.' });
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
