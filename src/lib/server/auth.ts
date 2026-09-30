import { createClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';

const MAX_JWT_LENGTH = 8192;
const MIN_RESIN_SYNC_KEY_LENGTH = 32;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

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

export function isValidResinSyncKey(candidate: unknown): boolean {
	if (typeof candidate !== 'string' || typeof RESIN_SYNC_KEY !== 'string') return false;
	if (candidate.length < MIN_RESIN_SYNC_KEY_LENGTH || RESIN_SYNC_KEY.length < MIN_RESIN_SYNC_KEY_LENGTH) return false;
	const provided = Buffer.from(candidate);
	const expected = Buffer.from(RESIN_SYNC_KEY);
	if (provided.length !== expected.length) return false;
	return timingSafeEqual(provided, expected);
}

const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const email = value.trim().toLowerCase();
	if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) return null;
	return email;
}

/** Resolve only an existing, profile-backed account. Sync must never create or
 * confirm an auth identity from an email supplied by a device request. */
export async function resolveExistingUserIdByEmail(email: string): Promise<string | null> {
	const { data: existingProfile, error: profileError } = await adminClient
		.from('profiles')
		.select('id')
		.eq('email', email)
		.maybeSingle();

	if (profileError) {
		console.error('[resolveExistingUserIdByEmail] profile lookup failed');
		return null;
	}
	if (existingProfile?.id) return existingProfile.id;
	return null;
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
		if (jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) return null;
		const { data: { user }, error } = await adminClient.auth.getUser(jwt);
		if (!error && user) return user.id;
		return null;
	}
	// Fall back to the verified cookie session for browser callers.
	const localsGetUser = (event.locals as { getUser?: () => Promise<{ id: string } | null> }).getUser;
	if (localsGetUser) {
		const user = await localsGetUser();
		if (user) return user.id;
	}
	return null;
}

export function isProAccountType(accountType: string | null | undefined): boolean {
	const normalized = (accountType ?? '').trim().toLowerCase();
	return normalized === 'pro' || normalized === 'premium' || normalized === 'paid';
}

export async function userHasProAccess(userId: string): Promise<boolean> {
	const { data, error } = await adminClient
		.from('profiles')
		.select('account_type')
		.eq('id', userId)
		.maybeSingle();

	if (error) {
		console.error('[userHasProAccess] profile lookup failed');
		return false;
	}

	return isProAccountType((data as { account_type?: string } | null)?.account_type);
}
