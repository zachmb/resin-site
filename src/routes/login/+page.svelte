<script lang="ts">
  import { createClient } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  let loading = false;
  let error = '';

  // Already logged in — redirect
  $: if (data.user) goto('/notes');

  const supabase = createClient();

  async function signInWithGoogle() {
    loading = true;
    error = '';
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly',
          'email',
          'profile'
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (err) {
      error = err.message;
      loading = false;
    }
    // On success, browser redirects to Google — no further action needed here
  }
</script>

<svelte:head>
  <title>Sign in — Resin</title>
</svelte:head>

<div class="min-h-screen bg-resin-bg flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <!-- Logo + wordmark -->
    <div class="text-center mb-10">
      <div class="w-16 h-16 rounded-3xl bg-resin-amber shadow-warm mx-auto mb-4 flex items-center justify-center">
        <span class="text-white font-extrabold text-2xl tracking-tight">R</span>
      </div>
      <h1 class="text-2xl font-extrabold text-resin-charcoal tracking-tight">Resin</h1>
      <p class="mt-1 text-sm text-resin-brown">Notes That Happen</p>
    </div>

    <!-- Card -->
    <div class="card">
      <h2 class="text-lg font-bold text-resin-charcoal mb-1">Welcome back</h2>
      <p class="text-sm text-resin-brown mb-6">Sign in to access your notes and plans</p>

      {#if error}
        <div class="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      {/if}

      <button
        on:click={signInWithGoogle}
        disabled={loading}
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
               border border-resin-bg-3 bg-white text-resin-charcoal font-semibold text-sm
               hover:bg-resin-bg shadow-sm hover:shadow-warm transition-all duration-200
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if loading}
          <div class="w-5 h-5 border-2 border-resin-amber border-t-transparent rounded-full animate-spin"></div>
          <span>Signing in…</span>
        {:else}
          <!-- Google G icon -->
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        {/if}
      </button>
    </div>

    <p class="text-center text-xs text-resin-gray mt-6">
      By signing in, you agree to our
      <a href="/terms" class="underline hover:text-resin-brown">Terms</a>
      and
      <a href="/privacy" class="underline hover:text-resin-brown">Privacy Policy</a>.
    </p>
  </div>
</div>
