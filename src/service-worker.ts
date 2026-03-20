/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'resin-v1';
const NOTES_CACHE = 'resin-notes-v1';
const RUNTIME_CACHE = 'resin-runtime-v1';
const ASSETS_CACHE = 'resin-assets-v1';
const SYNC_TAG = 'resin-sync-notes';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
	'/',
	'/logo.png',
	'/manifest.json'
];

// Cache strategies
const NETWORK_FIRST_ROUTES = ['/api/notes', '/amber/', '/forest/', '/focus/'];
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
					if (![CACHE_NAME, NOTES_CACHE, RUNTIME_CACHE, ASSETS_CACHE].includes(cacheName)) {
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

	// Notes API: prioritize cache for faster loading, sync in background
	if (url.pathname.includes('/api/notes') && request.method === 'GET') {
		return event.respondWith(cacheFirstWithSync(request));
	}

	// API requests: network first, fallback to cache
	if (NETWORK_FIRST_ROUTES.some((route) => url.pathname.startsWith(route))) {
		return event.respondWith(networkFirstStrategy(request));
	}

	// POST/PUT requests: just try network, let app handle errors
	if (request.method === 'POST' || request.method === 'PUT') {
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

async function cacheFirstWithSync(request: Request): Promise<Response> {
	// Return from cache immediately for instant load
	const cached = await caches.match(request);
	if (cached) {
		// Update cache in background without blocking response
		fetch(request)
			.then(response => {
				if (response.ok) {
					const cache = caches.open(NOTES_CACHE).then(c => c.put(request, response.clone()));
				}
			})
			.catch(() => {
				// Offline - use cached version
			});
		return cached;
	}

	// No cache, try network
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(NOTES_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Offline - no cached data' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

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
				const cache = await caches.open(NOTES_CACHE);
				for (const note of event.data.notes) {
					const response = new Response(JSON.stringify(note), {
						headers: { 'Content-Type': 'application/json' }
					});
					cache.put(new Request(`/api/notes/${note.id}`), response);
				}
			})()
		);
	}
});
