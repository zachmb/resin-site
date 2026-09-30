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
import { adminClient, isProAccountType, isValidResinSyncKey, normalizeEmail, resolveExistingUserIdByEmail } from '$lib/server/auth';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MAX_REQUEST_BODY_LENGTH = 8_000;
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

export const POST: RequestHandler = async ({ request, setHeaders }) => {
	setHeaders({
		'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
		'pragma': 'no-cache',
		'expires': '0'
	});

	let body: { email?: string; api_key?: string; is_pro?: boolean };
	try {
		body = await readBoundedJsonBody<{ email?: string; api_key?: string; is_pro?: boolean }>(
			request,
			MAX_REQUEST_BODY_LENGTH
		);
	} catch (error) {
		const status = error instanceof RequestBodyError ? error.status : 400;
		return json({
			error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
		}, { status, headers: NO_STORE_HEADERS });
	}

	const { email, api_key, is_pro } = body;

	if (!isValidResinSyncKey(api_key)) {
		return json({ error: 'Invalid API key' }, { status: 401, headers: NO_STORE_HEADERS });
	}
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return json({ error: 'Valid email required' }, { status: 400, headers: NO_STORE_HEADERS });
	}
	if (typeof is_pro !== 'boolean') {
		return json({ error: 'is_pro boolean required' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const userId = await resolveExistingUserIdByEmail(normalizedEmail);
	if (!userId) {
		return json({ success: true }, { headers: NO_STORE_HEADERS });
	}

	const { data: currentProfile, error: profileLookupError } = await adminClient
		.from('profiles')
		.select('account_type')
		.eq('id', userId)
		.maybeSingle();

	if (profileLookupError) {
		console.error('[entitlement-sync] profile lookup failed');
		return json({ error: 'Failed to sync entitlement' }, { status: 500, headers: NO_STORE_HEADERS });
	}

	const currentAccountType = typeof currentProfile?.account_type === 'string'
		? currentProfile.account_type
		: 'free';
	const currentlyPro = isProAccountType(currentAccountType);

	if (is_pro && !currentlyPro) {
		return json({
			error: 'Server StoreKit verification required',
			code: 'STOREKIT_SERVER_VERIFICATION_REQUIRED',
			account_type: currentAccountType
		}, { status: 403, headers: NO_STORE_HEADERS });
	}

	if (!is_pro && currentlyPro) {
		return json({
			success: true,
			account_type: currentAccountType,
			code: 'ENTITLEMENT_UNCHANGED'
		}, { headers: NO_STORE_HEADERS });
	}

	const accountType = is_pro ? 'pro' : 'free';
	const now = new Date().toISOString();
	const { data: updatedProfile, error: updateError } = await adminClient
		.from('profiles')
		.update({
			email: normalizedEmail,
			account_type: accountType,
			updated_at: now
		})
		.eq('id', userId)
		.select('id')
		.maybeSingle();

	if (updateError) {
		console.error('[entitlement-sync] profile update failed');
		return json({ error: 'Failed to sync entitlement' }, { status: 500, headers: NO_STORE_HEADERS });
	}

	if (!updatedProfile) {
		const { error: insertError } = await adminClient
			.from('profiles')
			.insert({
				id: userId,
				email: normalizedEmail,
				account_type: accountType,
				updated_at: now
			});

		if (insertError) {
			console.error('[entitlement-sync] profile insert failed');
			return json({ error: 'Failed to sync entitlement' }, { status: 500, headers: NO_STORE_HEADERS });
		}
	}

	return json({
		success: true,
		account_type: accountType
	}, { headers: NO_STORE_HEADERS });
};
