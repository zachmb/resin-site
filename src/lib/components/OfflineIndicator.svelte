<script lang="ts">
    import { onMount } from 'svelte';
    import { onConnectivityChange, onOfflineSyncSuccess } from '$lib/offline';
    import { WifiOff, Wifi, CheckCircle } from 'lucide-svelte';

    let isOnline = $state(typeof navigator !== 'undefined' && navigator.onLine);
    let syncInProgress = $state(false);
    let lastSyncSuccess: string | null = $state(null);
    let showIndicator = $state(false);

    onMount(() => {
        // Monitor connectivity changes
        const unsubscribe = onConnectivityChange((online) => {
            isOnline = online;
            if (online && lastSyncSuccess) {
                showIndicator = true;
                setTimeout(() => {
                    showIndicator = false;
                }, 3000);
            }
        });

        // Monitor sync success events
        const unsubscribeSync = onOfflineSyncSuccess((url) => {
            lastSyncSuccess = url;
            showIndicator = true;
            setTimeout(() => {
                showIndicator = false;
            }, 2000);
        });

        return () => {
            unsubscribe();
            unsubscribeSync();
        };
    });
</script>

<div class="fixed bottom-6 right-6 z-50">
    {#if !isOnline}
        <div class="flex items-center gap-3 px-4 py-3 bg-amber-100 border border-amber-300 rounded-lg shadow-lg animate-pulse">
            <WifiOff size={18} class="text-amber-600" />
            <span class="text-sm font-semibold text-amber-900">Offline</span>
            <span class="text-xs text-amber-700">Changes will sync when online</span>
        </div>
    {:else if showIndicator}
        <div class="flex items-center gap-3 px-4 py-3 bg-green-100 border border-green-300 rounded-lg shadow-lg animate-fade-out">
            <CheckCircle size={18} class="text-green-600" />
            <span class="text-sm font-semibold text-green-900">Synced</span>
        </div>
    {/if}
</div>

<style>
    @keyframes fadeOut {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    :global(.animate-fade-out) {
        animation: fadeOut 0.5s ease-out forwards;
        animation-delay: 1.5s;
    }
</style>
