/**
 * GET /api/auth/token
 *
 * Called by the iOS Resin app (AuthService.swift) to get a fresh Google OAuth
 * access token for Google Calendar API calls running in the background.
 *
 * Request:
 *   Authorization: Bearer <supabase_access_token>
 *
 * Response:
 *   { access_token: string, expires_at: number }   // expires_at is Unix timestamp (seconds)
 *
 * Implementation:
 *   1. Validate the Supabase JWT using the service role client
 *   2. Look up the user's Google refresh token from auth.sessions
 *   3. Exchange it with Google's token endpoint for a fresh access token
 *   4. Return the access token + expiry
 */

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Admin client — never exposed to the browser, uses service role key
function adminClient() {
  return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const GET: RequestHandler = async ({ request }) => {
  // 1. Extract Supabase JWT from Authorization header
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, { status: 401 });
  }
  const accessToken = auth.slice(7);

  // 2. Validate the JWT — getUser() verifies with Supabase Auth server
  const admin = adminClient();
  const { data: { user }, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !user) {
    console.error('[/api/auth/token] Invalid token:', userError?.message);
    return json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // 3. Get the Google refresh token for this user from auth.sessions
  //    auth.sessions stores the provider_refresh_token when offline access was requested
  const { data: sessions, error: sessionError } = await admin
    .from('auth.sessions')
    .select('provider_refresh_token')
    .eq('user_id', user.id)
    .not('provider_refresh_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  // Fallback: try admin.auth.admin to get user identity info
  let refreshToken: string | null = null;
  if (sessionError || !sessions?.length) {
    // Try via user identities
    const { data: adminUser } = await admin.auth.admin.getUserById(user.id);
    const googleIdentity = adminUser?.user?.identities?.find((i) => i.provider === 'google');
    refreshToken = (googleIdentity?.identity_data?.['refresh_token'] as string) ?? null;
  } else {
    refreshToken = sessions[0]?.provider_refresh_token ?? null;
  }

  if (!refreshToken) {
    console.warn(`[/api/auth/token] No refresh token found for user ${user.id}`);
    return json(
      { error: 'Google refresh token not available. Please re-authenticate the Resin app.' },
      { status: 404 }
    );
  }

  // 4. Exchange refresh token with Google
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: googleClientId,
      client_secret: googleClientSecret
    })
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error('[/api/auth/token] Google token exchange failed:', body);
    return json({ error: 'Failed to refresh Google token' }, { status: 502 });
  }

  const tokenData = await tokenRes.json();
  const expiresAt = Date.now() / 1000 + (tokenData.expires_in ?? 3600);

  return json({
    access_token: tokenData.access_token as string,
    expires_at: expiresAt
  });
};
