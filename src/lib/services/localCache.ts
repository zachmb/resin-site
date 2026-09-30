/**
 * Local cache service for instant data loading
 * Stores data in localStorage with TTL support
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    version: number;
}

const CACHE_VERSION = 2;
const CACHE_PREFIX = 'resin_cache_';
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function setCacheData<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL_MS): void {
    try {
        if (typeof window === 'undefined') return;

        const timestamp = Date.now();
        const safeTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_CACHE_TTL_MS;
        const entry: CacheEntry<T> = {
            data,
            timestamp,
            expiresAt: timestamp + safeTtlMs,
            version: CACHE_VERSION
        };

        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
        console.warn('[LocalCache] Failed to set cache');
    }
}

export function getCacheData<T>(key: string): T | null {
    try {
        if (typeof window === 'undefined') return null;

        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const entry: CacheEntry<T> = JSON.parse(item);

        const now = Date.now();
        if (
            entry.version !== CACHE_VERSION ||
            !Number.isFinite(entry.timestamp) ||
            !Number.isFinite(entry.expiresAt) ||
            entry.timestamp > now ||
            entry.expiresAt <= now
        ) {
            removeCacheData(key);
            return null;
        }

        return entry.data;
    } catch {
        console.warn('[LocalCache] Failed to read cache');
        return null;
    }
}

export function removeCacheData(key: string): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
        console.warn('[LocalCache] Failed to remove cache');
    }
}

export function getCacheTimestamp(key: string): number | null {
    try {
        if (typeof window === 'undefined') return null;

        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const entry: CacheEntry<unknown> = JSON.parse(item);
        const now = Date.now();
        if (
            entry.version !== CACHE_VERSION ||
            !Number.isFinite(entry.timestamp) ||
            !Number.isFinite(entry.expiresAt) ||
            entry.timestamp > now ||
            entry.expiresAt <= now
        ) {
            removeCacheData(key);
            return null;
        }
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
    } catch {
        console.warn('[LocalCache] Failed to clear all cache');
    }
}
