/**
 * Client-side hooks for SvelteKit
 * Register service worker and initialize caching
 */

// Register service worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker
		.register('/service-worker.js', {
			scope: '/'
		})
		.then(() => {
			console.log('Service Worker registered successfully');
		})
		.catch((error) => {
			console.error('Service Worker registration failed:', error);
		});

	// Listen for controller change (service worker updates)
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		console.log('Service Worker updated');
	});

	// Request periodic sync for offline data
	if ('periodicSync' in navigator.serviceWorker.controller!) {
		navigator.serviceWorker.controller!.postMessage({
			type: 'INIT_PERIODIC_SYNC'
		});
	}
}

// Handle page visibility to optimize resource usage
if (typeof document !== 'undefined') {
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			// Page is hidden - reduce update frequency
			console.log('Page hidden - reducing update frequency');
		} else {
			// Page is visible - resume normal frequency
			console.log('Page visible - resuming normal update frequency');
		}
	});
}

// Prefetch critical resources on idle
if ('requestIdleCallback' in window) {
	requestIdleCallback(() => {
		// Prefetch common routes
		const links = ['/forest', '/notes', '/amber', '/focus'];
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
