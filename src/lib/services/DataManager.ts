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

import { dev } from '$app/environment';
import { getCacheData, setCacheData, getCacheTimestamp } from './localCache';

export interface DataManagerOptions {
    cacheKey: string;
    apiEndpoint: string;
    cacheScope?: string | null;
    cacheTTL?: number; // milliseconds
    onDataUpdate?: (data: any) => void;
    onError?: (error: Error) => void;
}

export interface SyncStatus {
    isSyncing: boolean;
    lastSync: number | null;
    error: string | null;
}

const GENERIC_SYNC_ERROR = 'Sync failed';

function debugLog(message: string): void {
    if (dev) {
        console.log(message);
    }
}

export class DataManager {
    private options: Required<DataManagerOptions>;
    private syncStatus: SyncStatus = {
        isSyncing: false,
        lastSync: null,
        error: null
    };

    constructor(options: DataManagerOptions) {
        const scopedCacheKey = options.cacheScope
            ? `${options.cacheKey}:${options.cacheScope.replace(/[^A-Za-z0-9_-]/g, '')}`
            : options.cacheKey;
        this.options = {
            cacheTTL: 24 * 60 * 60 * 1000, // 24 hours default
            onDataUpdate: () => {},
            onError: () => {},
            ...options,
            cacheScope: options.cacheScope ?? null,
            cacheKey: scopedCacheKey
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
            debugLog(`[DataManager] ✓ Loaded from cache (age: ${cacheAge}ms)`);
        } else {
            debugLog('[DataManager] Cache miss - will fetch fresh data');
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
            return;
        }

        this.syncStatus.isSyncing = true;
        this.syncStatus.error = null;

        try {
            // Fetch fresh data
            const response = await fetch(this.options.apiEndpoint);

            if (!response.ok) {
                throw new Error('Background sync request failed');
            }

            const freshData = await response.json();

            // Update cache
            setCacheData(this.options.cacheKey, freshData, this.options.cacheTTL);

            // Update status
            this.syncStatus.lastSync = Date.now();
            this.syncStatus.error = null;

            // Notify component of new data
            this.options.onDataUpdate(freshData);

        } catch {
            console.error('[DataManager] Background sync failed');

            this.syncStatus.error = GENERIC_SYNC_ERROR;
            this.options.onError(new Error(GENERIC_SYNC_ERROR));

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
        try {
            const response = await fetch(this.options.apiEndpoint);

            if (!response.ok) {
                throw new Error('Refresh request failed');
            }

            const freshData = await response.json();
            setCacheData(this.options.cacheKey, freshData, this.options.cacheTTL);
            this.syncStatus.lastSync = Date.now();

            return freshData;
        } catch {
            console.error('[DataManager] Force refresh failed');
            throw new Error(GENERIC_SYNC_ERROR);
        }
    }

    /**
     * Manually update the cache with new data
     * Useful for optimistic updates or after successful form submissions
     */
    updateCache(freshData: any): void {
        setCacheData(this.options.cacheKey, freshData, this.options.cacheTTL);
        this.syncStatus.lastSync = Date.now();
    }

    /**
     * Clear cache for this data type
     */
    clearCache(): void {
        // Using localStorage.removeItem directly since localCache doesn't export it
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`resin_cache_${this.options.cacheKey}`);
        }
    }
}

/**
 * Factory functions for common data types
 */

export function createNotesDataManager(onUpdate: (data: any) => void, onError: (err: Error) => void, cacheScope?: string | null) {
    return new DataManager({
        cacheKey: 'notes_data',
        apiEndpoint: '/api/notes/data',
        cacheScope,
        onDataUpdate: onUpdate,
        onError
    });
}

export function createAmberDataManager(onUpdate: (data: any) => void, onError: (err: Error) => void, cacheScope?: string | null) {
    return new DataManager({
        cacheKey: 'amber_data',
        apiEndpoint: '/api/amber/data',
        cacheScope,
        onDataUpdate: onUpdate,
        onError
    });
}
