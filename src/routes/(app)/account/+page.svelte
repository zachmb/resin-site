<script lang="ts">
  import { createClient } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import { format } from 'date-fns';

  export let data: PageData;

  const supabase = createClient();

  const user = data.user;
  const profile = data.profile;

  // Derive display name from user metadata (matches iOS AuthService.extractFirstName)
  function displayName(): string {
    const meta = user?.user_metadata ?? {};
    if (meta['full_name']) return meta['full_name'] as string;
    if (meta['name']) return meta['name'] as string;
    return user?.email?.split('@')[0] ?? 'Account';
  }

  function avatarInitial(): string {
    return displayName().charAt(0).toUpperCase();
  }

  async function signOut() {
    await supabase.auth.signOut();
    goto('/login');
  }

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'MMMM yyyy')
    : null;
</script>

<svelte:head>
  <title>Account — Resin</title>
</svelte:head>

<main class="flex-1 overflow-y-auto px-6 py-8 max-w-xl">
  <h1 class="text-2xl font-extrabold text-resin-charcoal mb-6 tracking-tight">Account</h1>

  <!-- Profile card -->
  <div class="card mb-5">
    <div class="flex items-center gap-4">
      <!-- Avatar -->
      <div class="w-16 h-16 rounded-2xl bg-resin-green flex items-center justify-center shadow-warm flex-shrink-0">
        <span class="text-white text-2xl font-bold">{avatarInitial()}</span>
      </div>
      <!-- Info -->
      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-bold text-resin-charcoal truncate">{displayName()}</h2>
        <p class="text-sm text-resin-brown truncate">{user?.email ?? ''}</p>
        {#if memberSince}
          <p class="text-xs text-resin-gray mt-0.5">Member since {memberSince}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Connections -->
  <div class="card mb-5">
    <h3 class="text-sm font-semibold text-resin-charcoal mb-3">Connections</h3>

    <!-- Google -->
    <div class="flex items-center justify-between py-2.5 border-b border-resin-bg-3 last:border-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white border border-resin-bg-3 flex items-center justify-center">
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-resin-charcoal">Google Account</p>
          <p class="text-xs text-resin-gray">{user?.email ?? ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 text-xs font-semibold text-resin-green">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        Connected
      </div>
    </div>

    <!-- Google Calendar -->
    <div class="flex items-center justify-between py-2.5">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white border border-resin-bg-3 flex items-center justify-center">
          <svg class="w-4 h-4 text-resin-amber" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-resin-charcoal">Google Calendar</p>
          <p class="text-xs text-resin-gray">Task scheduling and appointments</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 text-xs font-semibold text-resin-green">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        Connected
      </div>
    </div>
  </div>

  <!-- App info -->
  <div class="card mb-5">
    <h3 class="text-sm font-semibold text-resin-charcoal mb-3">About</h3>
    <div class="flex flex-col gap-2.5">
      <div class="flex justify-between">
        <span class="text-sm text-resin-brown">App</span>
        <span class="text-sm text-resin-charcoal font-medium">Resin Web</span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-resin-brown">Data syncs with</span>
        <span class="text-sm text-resin-charcoal font-medium">iOS & macOS app</span>
      </div>
    </div>
  </div>

  <!-- Sign out -->
  <button
    on:click={signOut}
    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
           border border-red-200 text-red-500 font-semibold text-sm
           hover:bg-red-50 transition-colors duration-150"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
    Sign Out
  </button>
</main>
