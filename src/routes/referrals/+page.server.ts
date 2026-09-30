/**
 * Referrals Page — Server Load
 *
 * Loads user profile (with referral code/count) and referral history.
 * Removes the need for direct Supabase imports in the .svelte file.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const MAX_REFERRAL_HISTORY = 200;
const MAX_DISPLAY_NAME_LENGTH = 80;

function cleanDisplayName(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const displayName = value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME_LENGTH);
	return displayName || null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser();

	if (!user || authError) {
		throw redirect(303, '/login');
	}

	// Load profile with referral data
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('referral_code, referral_count, account_type')
		.eq('id', user.id)
		.single();

	if (profileError) {
		console.error('[referrals/+page.server] Profile load error');
		throw new Error('Failed to load profile');
	}

	// Load referral history
	const { data: referrals, error: referralsError } = await supabase
		.from('referral_rewards')
		.select('id, referral_date, reward_type, reward_applied, profiles!referred_user_id(username, full_name)')
		.eq('referrer_id', user.id)
		.order('referral_date', { ascending: false })
		.limit(MAX_REFERRAL_HISTORY);

	if (referralsError) {
		console.error('[referrals/+page.server] Referrals load error');
		// Don't throw — referral history is optional
	}

	return {
		profile: profile || null,
	referrals: (referrals || []).map((referral: any) => {
		const referredProfile = Array.isArray(referral.profiles) ? referral.profiles[0] : referral.profiles;
		return {
			id: referral.id,
			referral_date: referral.referral_date,
			reward_type: referral.reward_type,
			reward_applied: referral.reward_applied,
			referredUserName: cleanDisplayName(referredProfile?.full_name)
				|| cleanDisplayName(referredProfile?.username)
				|| 'Resin user'
		};
	}),
		referralCode: typeof profile?.referral_code === 'string' && profile.referral_code.trim()
			? profile.referral_code.trim()
			: null,
		referralCount: profile?.referral_count || 0,
		isFree: profile?.account_type === 'free'
	};
};
