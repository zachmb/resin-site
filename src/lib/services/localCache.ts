/**
 * Local cache service for instant data loading
 * Stores data in localStorage with TTL support
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'resin_cache_';

export function setCacheData<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
    try {
        if (typeof window === 'undefined') return;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION
        };

        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (err) {
        console.warn(`[LocalCache] Failed to set cache for ${key}:`, err);
    }
}

export function getCacheData<T>(key: string): T | null {
    try {
        if (typeof window === 'undefined') return null;

        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const entry: CacheEntry<T> = JSON.parse(item);

        // Version check
        if (entry.version !== CACHE_VERSION) {
            removeCacheData(key);
            return null;
        }

        return entry.data;
    } catch (err) {
        console.warn(`[LocalCache] Failed to read cache for ${key}:`, err);
        return null;
    }
}

export function removeCacheData(key: string): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch (err) {
        console.warn(`[LocalCache] Failed to remove cache for ${key}:`, err);
    }
}

export function getCacheTimestamp(key: string): number | null {
    try {
        if (typeof window === 'undefined') return null;

        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const entry: CacheEntry<any> = JSON.parse(item);
        return entry.timestamp;
    } catch (err) {
        return null;
    }
}

export function isCacheStale(key: string, maxAgeMs: number = 5 * 60 * 1000): boolean {
    const timestamp = getCacheTimestamp(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > maxAgeMs;
}

export function clearAllCache(): void {
    try {
        if (typeof window === 'undefined') return;

        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (err) {
        console.warn('[LocalCache] Failed to clear all cache:', err);
    }
}
