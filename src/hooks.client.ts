/**
 * Client-side hooks for SvelteKit
 * Register service worker and initialize caching
 */

// SvelteKit automatically registers the service-worker.js in production and safely in dev 
if ('serviceWorker' in navigator) {
	// Listen for controller change (service worker updates)
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		console.log('Service Worker updated');
	});

	// Request periodic sync for offline data when SW is fully ready
	navigator.serviceWorker.ready.then(() => {
		if (navigator.serviceWorker.controller && 'periodicSync' in navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: 'INIT_PERIODIC_SYNC'
			});
		}
	}).catch(() => {
		console.error('SW ready failed');
	});
}

// Handle page visibility to optimize resource usage
if (typeof document !== 'undefined') {
	document.addEventListener('visibilitychange', () => {
		// Reserved for future throttling/resume hooks.
	});
}

// Prefetch critical resources on idle
if ('requestIdleCallback' in window) {
	requestIdleCallback(() => {
		// Prefetch common routes
		const links = ['/rewards', '/notes', '/amber', '/focus'];
		links.forEach((link) => {
			const a = document.createElement('a');
			a.href = link;
			a.rel = 'prefetch';
			document.head.appendChild(a);
		});
	});
}

// Request persistent storage
if (navigator.storage && navigator.storage.persist) {
	navigator.storage.persist().then((persistent) => {
		console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`);
	});
}
