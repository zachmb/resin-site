/// <reference lib="webworker" />

type ServiceWorkerContext = typeof self;
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'resin-shell-v2';
const ASSETS_CACHE = 'resin-assets-v2';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
	'/logo.png',
	'/manifest.json'
];

// Cache only unparameterized browser asset requests. Matching arbitrary URL
// substrings can retain authenticated downloads whose query happens to contain
// a file extension.
const CACHEABLE_ASSET_PATH = /\.(?:js|css|woff2|png|svg|jpe?g)$/i;
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'font', 'image']);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS).catch(() => {
				// Fail silently if assets not available
			});
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		Promise.all([
			caches.keys().then((cacheNames) => Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName.startsWith('resin-') && ![CACHE_NAME, ASSETS_CACHE].includes(cacheName)) {
						return caches.delete(cacheName);
					}
				})
			)),
			deleteLegacyOfflineDatabase()
		])
	);
	self.clients.claim();
});

function deleteLegacyOfflineDatabase(): Promise<void> {
	return new Promise((resolve) => {
		const request = self.indexedDB.deleteDatabase('resin-offline');
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip cross-origin requests
	if (url.origin !== self.location.origin) {
		return;
	}

	// API responses and authenticated app pages can include sensitive notes,
	// focus state, tokens, or account data. Never store them in CacheStorage;
	// server Cache-Control headers are a backstop, not the first line of defense.
	if (url.pathname.startsWith('/api/') || request.mode === 'navigate') {
		return event.respondWith(networkOnlyStrategy(request));
	}

	// Mutations: just try network, let app handle errors
	if (request.method !== 'GET') {
		return event.respondWith(networkOnlyStrategy(request));
	}

	// Static assets: cache first, fallback to network
	if (
		CACHEABLE_DESTINATIONS.has(request.destination) &&
		CACHEABLE_ASSET_PATH.test(url.pathname) &&
		!url.search
	) {
		return event.respondWith(cacheFirstStrategy(request));
	}

});

async function networkOnlyStrategy(request: Request): Promise<Response> {
	try {
		return await fetch(request);
	} catch (error) {
		return new Response('Offline - network unavailable', { status: 503 });
	}
}

async function cacheFirstStrategy(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);

		const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
		if (
			response.ok &&
			!cacheControl.includes('no-store') &&
			!cacheControl.includes('private')
		) {
			const cache = await caches.open(ASSETS_CACHE);
			await cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		return new Response('Asset not available', { status: 404 });
	}
}

// Message handler for cache updates
self.addEventListener('message', (event) => {
	if (event.data.type === 'CACHE_NOTES') {
		event.waitUntil(
			(async () => {
				await caches.delete('resin-notes-v1');
			})()
		);
	}
});
