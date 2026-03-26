/**
 * Referrals Page — Server Load
 *
 * Loads user profile (with referral code/count) and referral history.
 * Removes the need for direct Supabase imports in the .svelte file.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
		.select('*')
		.eq('id', user.id)
		.single();

	if (profileError) {
		console.error('[referrals/+page.server] Profile load error:', profileError);
		throw new Error('Failed to load profile');
	}

	// Load referral history
	const { data: referrals, error: referralsError } = await supabase
		.from('referral_rewards')
		.select('*, profiles!referred_user_id(email)')
		.eq('referrer_id', user.id)
		.order('referral_date', { ascending: false });

	if (referralsError) {
		console.error('[referrals/+page.server] Referrals load error:', referralsError);
		// Don't throw — referral history is optional
	}

	return {
		profile: profile || null,
		referrals: referrals || [],
		referralCode: profile?.referral_code || generateReferralCode(),
		referralCount: profile?.referral_count || 0,
		isFree: profile?.account_type === 'free'
	};
};

/**
 * Generate a unique referral code
 * Format: RESIN_XXXXXX (random alphanumeric)
 */
function generateReferralCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = 'RESIN_';
	for (let i = 0; i < 6; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}
