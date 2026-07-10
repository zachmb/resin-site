/// <reference lib="webworker" />

type ServiceWorkerContext = typeof self;
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'resin-shell-v2';
const ASSETS_CACHE = 'resin-assets-v2';
const SYNC_TAG = 'resin-sync-notes';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
	'/logo.png',
	'/manifest.json'
];

// Cache strategies
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
					if (cacheName.startsWith('resin-') && ![CACHE_NAME, ASSETS_CACHE].includes(cacheName)) {
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
	if (CACHE_FIRST_ROUTES.some((ext) => request.url.includes(ext))) {
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

		if (response.ok) {
			const cache = await caches.open(ASSETS_CACHE);
			await cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		return new Response('Asset not available', { status: 404 });
	}
}

async function queueForSync(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		return response;
	} catch (error) {
		// Queue for background sync
		if (self.registration.sync) {
			self.registration.sync.register(SYNC_TAG).catch(() => {
				// Sync not available
			});
		}

		// Store request in IndexedDB for retry
		if ('indexedDB' in self) {
			try {
				const db = await openIndexedDB();
				const tx = db.transaction('pendingRequests', 'readwrite');
				const store = tx.objectStore('pendingRequests');

				// Read body only if request has one
				let bodyText = '';
				if (request.method !== 'GET' && request.method !== 'HEAD') {
					try {
						bodyText = await request.clone().text();
					} catch (bodyErr) {
						// Body already consumed or not readable - skip it
						console.warn('Could not read request body for sync:', bodyErr);
					}
				}

				await store.add({
					url: request.url,
					method: request.method,
					headers: Object.fromEntries(request.headers.entries()),
					body: bodyText,
					timestamp: Date.now()
				});
			} catch (dbErr) {
				console.warn('Could not store request for sync:', dbErr);
			}
		}

		// Return 202 Accepted - request will be synced later
		return new Response(JSON.stringify({ queued: true, offline: true }), {
			status: 202,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// Background sync for failed requests
self.addEventListener('sync', (event: any) => {
	if (event.tag === SYNC_TAG) {
		event.waitUntil(syncPendingRequests());
	}
});

async function syncPendingRequests() {
	try {
		if (!('indexedDB' in self)) return;

		const db = await openIndexedDB();
		const tx = db.transaction('pendingRequests', 'readonly');
		const store = tx.objectStore('pendingRequests');
		const requests = await store.getAll();

		const writeTx = db.transaction('pendingRequests', 'readwrite');
		const writeStore = writeTx.objectStore('pendingRequests');

		for (const req of requests) {
			try {
				const response = await fetch(req.url, {
					method: req.method,
					headers: req.headers,
					body: req.method !== 'GET' ? req.body : undefined
				});

				if (response.ok) {
					// Remove from pending
					await writeStore.delete(req.timestamp);
					// Notify clients of successful sync
					self.clients.matchAll().then(clients => {
						clients.forEach(client => {
							client.postMessage({
								type: 'SYNC_SUCCESS',
								url: req.url
							});
						});
					});
				}
			} catch (error) {
				// Retry next time
				console.log('Retry failed for:', req.url);
			}
		}
	} catch (error) {
		console.error('Sync failed:', error);
	}
}

function openIndexedDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = self.indexedDB.open('resin-offline', 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains('pendingRequests')) {
				db.createObjectStore('pendingRequests', { keyPath: 'timestamp' });
			}
		};
	});
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
