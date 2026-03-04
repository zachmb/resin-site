import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/notes';
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    console.error('[auth/callback] OAuth error:', errorParam);
    throw redirect(303, '/login?error=oauth_failed');
  }

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] Code exchange failed:', error.message);
      throw redirect(303, '/login?error=auth_failed');
    }
    throw redirect(303, next);
  }

  throw redirect(303, '/login?error=no_code');
};
