/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'resin-v1';
const RUNTIME_CACHE = 'resin-runtime-v1';
const ASSETS_CACHE = 'resin-assets-v1';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
	'/',
	'/logo.png',
	'/manifest.json'
];

// Cache strategies
const NETWORK_FIRST_ROUTES = ['/api/', '/notes/', '/amber/', '/forest/', '/focus/'];
const CACHE_FIRST_ROUTES = ['.js', '.css', '.woff2', '.png', '.svg', '.jpg'];

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
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== ASSETS_CACHE) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip cross-origin requests
	if (url.origin !== self.location.origin) {
		return;
	}

	// API requests: network first, fallback to cache
	if (NETWORK_FIRST_ROUTES.some((route) => url.pathname.startsWith(route))) {
		return event.respondWith(networkFirstStrategy(request));
	}

	// Static assets: cache first, fallback to network
	if (CACHE_FIRST_ROUTES.some((ext) => request.url.includes(ext))) {
		return event.respondWith(cacheFirstStrategy(request));
	}

	// Documents: network first
	if (request.mode === 'navigate') {
		return event.respondWith(networkFirstStrategy(request));
	}
});

async function networkFirstStrategy(request: Request): Promise<Response> {
	const cacheName = request.method === 'GET' ? RUNTIME_CACHE : undefined;

	try {
		const response = await fetch(request);

		// Cache successful GET responses
		if (cacheName && response.ok && request.method === 'GET') {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		// Return cached response if network fails
		if (cacheName) {
			const cached = await caches.match(request);
			if (cached) return cached;
		}

		// Return offline page or error response
		return new Response('Offline - cached data unavailable', { status: 503 });
	}
}

async function cacheFirstStrategy(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);

		if (response.ok) {
			const cache = await caches.open(ASSETS_CACHE);
			cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		return new Response('Asset not available', { status: 404 });
	}
}

// Handle background sync for failed requests
self.addEventListener('sync', (event: any) => {
	if (event.tag === 'sync-notes') {
		event.waitUntil(syncPendingRequests());
	}
});

async function syncPendingRequests() {
	// This would be implemented to retry failed requests stored in IndexedDB
	// For now, just a placeholder
	return Promise.resolve();
}
