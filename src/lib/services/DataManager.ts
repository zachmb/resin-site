/**
 * Data Manager - Handles local-first data loading with background sync
 *
 * Flow:
 * 1. getInitialData() - Return cached data immediately (instant page load)
 * 2. syncInBackground() - Fetch fresh data from API (silent update)
 * 3. Cache automatically updated when new data arrives
 *
 * Logging: Every step logged for easy debugging
 */

import { getCacheData, setCacheData, getCacheTimestamp } from './localCache';

export interface DataManagerOptions {
    cacheKey: string;
    apiEndpoint: string;
    cacheTTL?: number; // milliseconds
    onDataUpdate?: (data: any) => void;
    onError?: (error: Error) => void;
}

export interface SyncStatus {
    isSyncing: boolean;
    lastSync: number | null;
    error: string | null;
}

export class DataManager {
    private options: Required<DataManagerOptions>;
    private syncStatus: SyncStatus = {
        isSyncing: false,
        lastSync: null,
        error: null
    };

    constructor(options: DataManagerOptions) {
        this.options = {
            cacheTTL: 24 * 60 * 60 * 1000, // 24 hours default
            onDataUpdate: () => {},
            onError: () => {},
            ...options
        };
    }

    /**
     * STEP 1: Get initial data (from cache or null)
     * This should be called on component mount to load instantly
     */
    getInitialData(): any {
        const cached = getCacheData(this.options.cacheKey);
        const cacheAge = this.getCacheAge();

        if (cached) {
            console.log(
                `[DataManager:${this.options.cacheKey}] ✓ Loaded from cache (age: ${cacheAge}ms)`
            );
        } else {
            console.log(
                `[DataManager:${this.options.cacheKey}] Cache miss - will fetch fresh data`
            );
        }

        return cached || null;
    }

    /**
     * STEP 2: Start background sync
     * Fetches fresh data without blocking UI
     * Automatically updates cache and calls onDataUpdate callback
     */
    async syncInBackground(): Promise<void> {
        // Prevent concurrent syncs
        if (this.syncStatus.isSyncing) {
            console.log(`[DataManager:${this.options.cacheKey}] ⏸ Sync already in progress`);
            return;
        }

        this.syncStatus.isSyncing = true;
        this.syncStatus.error = null;

        console.log(`[DataManager:${this.options.cacheKey}] 🔄 Starting background sync...`);

        try {
            // Fetch fresh data
            const response = await fetch(this.options.apiEndpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} from ${this.options.apiEndpoint}`);
            }

            const freshData = await response.json();
            console.log(
                `[DataManager:${this.options.cacheKey}] ✓ Received fresh data (${JSON.stringify(freshData).length} bytes)`
            );

            // Update cache
            setCacheData(this.options.cacheKey, freshData);
            console.log(
                `[DataManager:${this.options.cacheKey}] 💾 Cached fresh data`
            );

            // Update status
            this.syncStatus.lastSync = Date.now();
            this.syncStatus.error = null;

            // Notify component of new data
            this.options.onDataUpdate(freshData);
            console.log(
                `[DataManager:${this.options.cacheKey}] ✨ Component notified of update`
            );

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`[DataManager:${this.options.cacheKey}] ✗ Sync failed:`, err.message);

            this.syncStatus.error = err.message;
            this.options.onError(err);

        } finally {
            this.syncStatus.isSyncing = false;
        }
    }

    /**
     * Get current sync status
     */
    getStatus(): SyncStatus {
        return { ...this.syncStatus };
    }

    /**
     * Get age of cached data in milliseconds
     */
    private getCacheAge(): number | null {
        const timestamp = getCacheTimestamp(this.options.cacheKey);
        if (!timestamp) return null;
        return Date.now() - timestamp;
    }

    /**
     * Force refresh data immediately (blocking)
     * Useful for critical updates that can't wait for background sync
     */
    async forceRefresh(): Promise<any> {
        console.log(`[DataManager:${this.options.cacheKey}] 🚨 Force refresh requested`);

        try {
            const response = await fetch(this.options.apiEndpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const freshData = await response.json();
            setCacheData(this.options.cacheKey, freshData);
            this.syncStatus.lastSync = Date.now();

            console.log(
                `[DataManager:${this.options.cacheKey}] ✓ Force refresh complete`
            );

            return freshData;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(
                `[DataManager:${this.options.cacheKey}] ✗ Force refresh failed:`,
                err.message
            );
            throw err;
        }
    }

    /**
     * Manually update the cache with new data
     * Useful for optimistic updates or after successful form submissions
     */
    updateCache(freshData: any): void {
        console.log(`[DataManager:${this.options.cacheKey}] 💾 Manually updating cache`);
        setCacheData(this.options.cacheKey, freshData);
        this.syncStatus.lastSync = Date.now();
    }

    /**
     * Clear cache for this data type
     */
    clearCache(): void {
        console.log(`[DataManager:${this.options.cacheKey}] 🗑 Cache cleared`);
        // Using localStorage.removeItem directly since localCache doesn't export it
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`resin_cache_${this.options.cacheKey}`);
        }
    }
}

/**
 * Factory functions for common data types
 */

export function createNotesDataManager(onUpdate: (data: any) => void, onError: (err: Error) => void) {
    return new DataManager({
        cacheKey: 'notes_data',
        apiEndpoint: '/api/notes/data',
        onDataUpdate: onUpdate,
        onError
    });
}

export function createAmberDataManager(onUpdate: (data: any) => void, onError: (err: Error) => void) {
    return new DataManager({
        cacheKey: 'amber_data',
        apiEndpoint: '/api/amber/data',
        onDataUpdate: onUpdate,
        onError
    });
}
