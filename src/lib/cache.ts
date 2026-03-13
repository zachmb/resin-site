import { writable, derived, get } from 'svelte/store';

// Cache store - holds all cached API data
const cacheStore = writable<Record<string, { data: any; timestamp: number; ttl: number }>>({});

// Deduplication map - prevents concurrent identical requests
const pendingRequests = new Map<string, Promise<any>>();

interface CacheOptions {
	ttl?: number; // Time to live in milliseconds
	immediate?: boolean; // Don't wait for server, use cache immediately
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
const API_CACHE_TTL = 30 * 1000; // 30 seconds for API responses

export function getCacheKey(endpoint: string, params?: Record<string, any>) {
	if (!params || Object.keys(params).length === 0) return endpoint;
	return `${endpoint}?${new URLSearchParams(params).toString()}`;
}

export function isCacheValid(cacheEntry: any): boolean {
	if (!cacheEntry) return false;
	return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
}

export function getFromCache(key: string) {
	const cache = get(cacheStore);
	const entry = cache[key];
	if (isCacheValid(entry)) {
		return entry.data;
	}
	return null;
}

export function setCache(key: string, data: any, ttl = API_CACHE_TTL) {
	cacheStore.update((cache) => ({
		...cache,
		[key]: {
			data,
			timestamp: Date.now(),
			ttl
		}
	}));
}

export function invalidateCache(pattern?: string) {
	cacheStore.update((cache) => {
		if (!pattern) {
			return {}; // Clear all
		}
		const newCache = { ...cache };
		Object.keys(newCache).forEach((key) => {
			if (key.includes(pattern)) {
				delete newCache[key];
			}
		});
		return newCache;
	});
}

/**
 * Fetch with automatic caching and deduplication
 * If a request is already pending, return that promise instead
 */
export async function cachedFetch(
	endpoint: string,
	options: {
		method?: string;
		body?: any;
		params?: Record<string, any>;
		cache?: CacheOptions;
	} = {}
) {
	const { method = 'GET', body, params, cache = {} } = options;
	const { ttl = API_CACHE_TTL, immediate = false } = cache;

	const cacheKey = getCacheKey(endpoint, params);

	// Check if we have valid cache and can return immediately
	const cachedData = getFromCache(cacheKey);
	if (cachedData && (method === 'GET' || immediate)) {
		if (immediate) {
			return cachedData;
		}
	}

	// Deduplication: if this request is already in flight, return that promise
	if (pendingRequests.has(cacheKey)) {
		return pendingRequests.get(cacheKey);
	}

	// Make the request
	const promise = (async () => {
		try {
			const url = params
				? `${endpoint}?${new URLSearchParams(params).toString()}`
				: endpoint;

			const response = await fetch(url, {
				method,
				body: body ? JSON.stringify(body) : undefined,
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();

			// Cache successful responses
			if (method === 'GET') {
				setCache(cacheKey, data, ttl);
			}

			return data;
		} finally {
			pendingRequests.delete(cacheKey);
		}
	})();

	pendingRequests.set(cacheKey, promise);
	return promise;
}

/**
 * Optimistic update - immediately update UI, revert on error
 */
export async function optimisticUpdate<T>(
	endpoint: string,
	body: any,
	updateFn: (data: T) => T,
	cacheKey?: string
): Promise<{ success: boolean; data?: T; error?: Error }> {
	const key = cacheKey || getCacheKey(endpoint);

	// Get current cached data
	const currentData = getFromCache(key);
	if (!currentData) {
		return { success: false, error: new Error('No cached data to update') };
	}

	// Optimistically update the cache
	const optimisticData = updateFn(currentData);
	setCache(key, optimisticData);

	try {
		// Make the server request
		const response = await cachedFetch(endpoint, {
			method: 'POST',
			body
		});

		// Server confirmed, update cache with server response
		setCache(key, response);
		return { success: true, data: response };
	} catch (error) {
		// Revert optimistic update on error
		setCache(key, currentData);
		return { success: false, error: error as Error };
	}
}

/**
 * Prefetch data into cache
 */
export async function prefetch(endpoint: string, params?: Record<string, any>) {
	const cached = getFromCache(getCacheKey(endpoint, params));
	if (cached) return cached;

	return cachedFetch(endpoint, { params, cache: { ttl: DEFAULT_TTL } });
}

/**
 * Clear cache and pending requests
 */
export function clearCache() {
	cacheStore.set({});
	pendingRequests.clear();
}
