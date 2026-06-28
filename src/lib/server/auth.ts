import { createClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';

/**
 * Service-role Supabase client (bypasses RLS). Only ever use it scoped by a
 * verified user id from {@link getAuthenticatedUserId} — never by a body-supplied id.
 */
export const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false }
});

/**
 * Shared secret used by the iOS app (a guest/local client with no Supabase JWT)
 * to authenticate server-side sync. Same model as /api/notes/sync.
 */
export const RESIN_SYNC_KEY = env.RESIN_SYNC_KEY;

/**
 * Find (or create) a Supabase user id for an email — the account-resolution used
 * by the iOS sync endpoints. Mirrors /api/notes/sync. Returns null on hard error.
 */
export async function resolveUserIdByEmail(email: string): Promise<string | null> {
	const { data: existingProfile } = await adminClient
		.from('profiles')
		.select('id')
		.eq('email', email)
		.maybeSingle();
	if (existingProfile?.id) return existingProfile.id;

	const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
	if (listError) {
		console.error('[resolveUserIdByEmail] listUsers failed:', listError.message);
		return null;
	}
	const authUser = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
	if (authUser) return authUser.id;

	const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
		email,
		email_confirm: true
	});
	if (createError || !newUser?.user) {
		console.error('[resolveUserIdByEmail] createUser failed:', createError?.message);
		return null;
	}
	return newUser.user.id;
}

/**
 * Resolve the authenticated user id for an API request WITHOUT trusting any
 * body-supplied `userId`. Accepts either a Supabase Bearer JWT (iOS app /
 * extension) or the SvelteKit cookie session (same-origin browser fetch).
 * Returns null when the request is not authenticated.
 */
export async function getAuthenticatedUserId(event: RequestEvent): Promise<string | null> {
	const authHeader = event.request.headers.get('authorization') ?? '';
	const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (jwt) {
		const { data: { user }, error } = await adminClient.auth.getUser(jwt);
		if (!error && user) return user.id;
	}
	// Fall back to the verified cookie session for browser callers.
	const localsGetUser = (event.locals as { getUser?: () => Promise<{ id: string } | null> }).getUser;
	if (localsGetUser) {
		const user = await localsGetUser();
		if (user) return user.id;
	}
	return null;
}
