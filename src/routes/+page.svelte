<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  onMount(() => {
    if (data.user) {
      goto('/notes');
    } else {
      goto('/login');
    }
  });
</script>

<div class="flex items-center justify-center h-screen bg-resin-bg">
  <div class="w-8 h-8 border-2 border-resin-amber border-t-transparent rounded-full animate-spin"></div>
</div>
