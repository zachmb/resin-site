/**
 * Offline-first utilities for Resin
 * Manages service worker registration, offline sync, and cache operations
 */

export async function registerServiceWorker(): Promise<ServiceWorkerContainer['controller'] | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });

        console.log('Service Worker registered:', registration);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        return registration.active || registration.installing;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

function handleServiceWorkerMessage(event: ExtendableMessageEvent) {
    const { data } = event;

    if (data.type === 'SYNC_SUCCESS') {
        // Notify app that a previously offline request was synced
        window.dispatchEvent(
            new CustomEvent('offline-sync-success', {
                detail: { url: data.url }
            })
        );
    }

    if (data.type === 'CACHE_UPDATED') {
        // Cache was updated in background
        window.dispatchEvent(
            new CustomEvent('cache-updated', {
                detail: { url: data.url }
            })
        );
    }
}

/**
 * Cache notes locally for instant loading
 */
export async function cacheNotesLocally(notes: any[]): Promise<void> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return;
    }

    navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_NOTES',
        notes
    });
}

/**
 * Check if app is currently online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function onConnectivityChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * Request background sync from service worker
 */
export async function requestBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('resin-sync-notes');
        console.log('Background sync registered');
    } catch (error) {
        console.error('Background sync registration failed:', error);
    }
}

/**
 * Get cache statistics for debugging
 */
export async function getCacheStats(): Promise<{ size: number; keys: string[] }> {
    if (!('caches' in window)) {
        return { size: 0, keys: [] };
    }

    const cacheNames = await caches.keys();
    const allKeys: string[] = [];

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        allKeys.push(
            ...requests.map(req => `${cacheName}:${req.url}`)
        );
    }

    return {
        size: allKeys.length,
        keys: allKeys
    };
}

/**
 * Clear all offline caches (useful for cleanup)
 */
export async function clearOfflineCaches(): Promise<void> {
    if (!('caches' in window)) return;

    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(name => caches.delete(name))
    );

    console.log('All offline caches cleared');
}

/**
 * Monitor offline sync events
 */
export function onOfflineSyncSuccess(callback: (url: string) => void): () => void {
    const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        callback(customEvent.detail.url);
    };

    window.addEventListener('offline-sync-success', handler);

    return () => {
        window.removeEventListener('offline-sync-success', handler);
    };
}

/**
 * Monitor cache updates from background sync
 */
export function onCacheUpdate(callback: (url: string) => void): () => void {
    const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        callback(customEvent.detail.url);
    };

    window.addEventListener('cache-updated', handler);

    return () => {
        window.removeEventListener('cache-updated', handler);
    };
}
