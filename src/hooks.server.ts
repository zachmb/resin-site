import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const PUBLIC_ROUTES = ['/login', '/auth'];

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          event.cookies.set(name, value, { ...options, path: '/' })
        );
      }
    }
  });

  // Helper to get the current session user safely
  event.locals.getUser = async () => {
    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    if (error) return null;
    return user;
  };

  // Protect all non-public routes
  const isPublic = PUBLIC_ROUTES.some((r) => event.url.pathname.startsWith(r));
  if (!isPublic) {
    const user = await event.locals.getUser();
    if (!user) {
      throw redirect(303, '/login');
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      // Required for Supabase SSR
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
