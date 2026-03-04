<script lang="ts">
  import { page } from '$app/stores';
  import { createClient } from '$lib/supabase/client';
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    goto('/login');
  }

  const navItems = [
    { href: '/notes', label: 'Notes', icon: 'note' },
    { href: '/amber', label: 'Plans', icon: 'amber' },
    { href: '/account', label: 'Account', icon: 'account' }
  ];
</script>

<div class="flex h-screen overflow-hidden bg-resin-bg">
  <!-- Narrow icon sidebar -->
  <nav class="flex flex-col items-center gap-1 py-4 px-2 w-14 bg-resin-bg-2 border-r border-resin-bg-3 flex-shrink-0">
    <!-- Logo -->
    <div class="w-9 h-9 rounded-xl bg-resin-amber flex items-center justify-center mb-3 shadow-warm">
      <span class="text-white font-extrabold text-base">R</span>
    </div>

    {#each navItems as item}
      {@const active = $page.url.pathname.startsWith(item.href)}
      <a
        href={item.href}
        title={item.label}
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150
               {active
          ? 'bg-resin-amber text-white shadow-warm'
          : 'text-resin-brown hover:bg-resin-bg-3 hover:text-resin-charcoal'}"
      >
        {#if item.icon === 'note'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        {:else if item.icon === 'amber'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        {:else if item.icon === 'account'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        {/if}
      </a>
    {/each}

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Sign out button at bottom -->
    <button
      on:click={signOut}
      title="Sign out"
      class="w-10 h-10 rounded-xl flex items-center justify-center text-resin-gray
             hover:bg-red-50 hover:text-red-500 transition-all duration-150"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
    </button>
  </nav>

  <!-- Main content area -->
  <div class="flex flex-1 overflow-hidden">
    <slot />
  </div>
</div>
