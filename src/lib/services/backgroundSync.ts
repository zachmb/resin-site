/**
 * Background data synchronization manager
 * Fetches fresh data from server and updates cache without blocking UI
 */

import { setCacheData, getCacheData } from './localCache';

export interface SyncStatus {
    syncing: boolean;
    error: string | null;
    lastSyncTime: number | null;
}

interface SyncTask<T> {
    key: string;
    fetchFn: () => Promise<T>;
    onData?: (data: T) => void;
    onError?: (error: Error) => void;
}

class BackgroundSyncManager {
    private syncStatus: Map<string, SyncStatus> = new Map();
    private activeSyncs: Map<string, Promise<any>> = new Map();

    /**
     * Start a background sync task
     * Returns immediately with cached data if available
     * Fetches fresh data in background and calls onData when ready
     */
    async syncInBackground<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options?: {
            onData?: (data: T) => void;
            onError?: (error: Error) => void;
            cacheKey?: string;
            force?: boolean;
        }
    ): Promise<T | null> {
        const cacheKey = options?.cacheKey || key;

        // Get cached data immediately
        const cached = getCacheData<T>(cacheKey);

        // If there's already a sync in progress for this key, return the promise
        if (this.activeSyncs.has(key) && !options?.force) {
            return this.activeSyncs.get(key);
        }

        // Mark as syncing
        this.syncStatus.set(key, {
            syncing: true,
            error: null,
            lastSyncTime: null
        });

        // Create sync promise
        const syncPromise = (async () => {
            try {
                const freshData = await fetchFn();

                // Update cache
                setCacheData(cacheKey, freshData);

                // Update status
                this.syncStatus.set(key, {
                    syncing: false,
                    error: null,
                    lastSyncTime: Date.now()
                });

                // Call callback
                if (options?.onData) {
                    options.onData(freshData);
                }

                return freshData;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));

                // Update status
                this.syncStatus.set(key, {
                    syncing: false,
                    error: err.message,
                    lastSyncTime: Date.now()
                });

                // Call error callback
                if (options?.onError) {
                    options.onError(err);
                }

                // Return cached data as fallback, or null if no cache
                return cached;
            } finally {
                this.activeSyncs.delete(key);
            }
        })();

        this.activeSyncs.set(key, syncPromise);
        return syncPromise;
    }

    /**
     * Get current sync status for a key
     */
    getStatus(key: string): SyncStatus | null {
        return this.syncStatus.get(key) || null;
    }

    /**
     * Clear sync status
     */
    clearStatus(key: string): void {
        this.syncStatus.delete(key);
    }

    /**
     * Wait for a sync to complete (useful for tests)
     */
    async waitForSync(key: string): Promise<void> {
        const promise = this.activeSyncs.get(key);
        if (promise) {
            await promise;
        }
    }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncManager();
