/**
 * POST /api/profile/entitlement-sync
 *
 * Updates the web profile's entitlement tier from an iOS StoreKit entitlement.
 * The iOS app is local-first and may not have a Supabase JWT, so this mirrors
 * the existing notes/blocking sync model: email + RESIN_SYNC_KEY.
 *
 * Body: { email: string, api_key: string, is_pro: boolean }
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient, isValidResinSyncKey, resolveExistingUserIdByEmail } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	let body: { email?: string; api_key?: string; is_pro?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, api_key, is_pro } = body;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401 });
	}
	if (!email || !email.includes('@')) {
		return json({ error: 'Valid email required' }, { status: 400 });
	}
	if (typeof is_pro !== 'boolean') {
		return json({ error: 'is_pro boolean required' }, { status: 400 });
	}

	const normalizedEmail = email.trim().toLowerCase();
	const userId = await resolveExistingUserIdByEmail(normalizedEmail);
	if (!userId) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	const accountType = is_pro ? 'pro' : 'free';
	const { data: updatedProfile, error: updateError } = await adminClient
		.from('profiles')
		.update({
			email: normalizedEmail,
			account_type: accountType,
			updated_at: new Date().toISOString()
		})
		.eq('id', userId)
		.select('id')
		.maybeSingle();

	if (updateError) {
		console.error('[entitlement-sync] profile update failed:', updateError.message);
		return json({ error: 'Failed to sync entitlement' }, { status: 500 });
	}

	if (!updatedProfile) {
		const { error: insertError } = await adminClient
			.from('profiles')
			.insert({
				id: userId,
				email: normalizedEmail,
				account_type: accountType,
				updated_at: new Date().toISOString()
			});

		if (insertError) {
			console.error('[entitlement-sync] profile insert failed:', insertError.message);
			return json({ error: 'Failed to sync entitlement' }, { status: 500 });
		}
	}

	return json({
		success: true,
		user_id: userId,
		account_type: accountType
	});
};
