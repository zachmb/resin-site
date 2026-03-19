/**
 * API v1 Versioning Proxy
 *
 * This catch-all route forwards all requests to /api/v1/* to the corresponding /api/* endpoint.
 * Allows multiple API versions to coexist:
 * - /api/v1/* → existing implementations
 * - /api/v2/* → (future) different implementations when breaking changes needed
 *
 * When introducing v2:
 * 1. Create /api/v2/[...path] with new behavior
 * 2. Set api.version = "v2" in resin-config.json
 * 3. Clients automatically use correct version via ConfigService.getApiUrl()
 * 4. Sunset /api/v1/* after 60 days with Deprecation + Sunset headers
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Forward HTTP request to the non-versioned /api/* endpoint.
 * Adds API-Version: v1 response header for clarity.
 */
const forwardRequest = async (event: RequestEvent): Promise<Response> => {
	const { path } = event.params;
	if (!path) {
		return json({ error: 'No path specified' }, { status: 400 });
	}

	try {
		// Build target path: /api/v1/activate → /api/activate
		const targetPath = `/api/${path}`;
		const qs = event.url.search; // Preserve query string

		// Make internal request to the non-versioned endpoint
		const response = await event.fetch(`${targetPath}${qs}`, {
			method: event.request.method,
			headers: event.request.headers,
			// GET/HEAD have no body
			body: ['GET', 'HEAD'].includes(event.request.method)
				? undefined
				: event.request.body,
			// duplex: 'half' required for streaming request bodies
			duplex: 'half'
		});

		// Add API version header to response
		const headers = new Headers(response.headers);
		headers.set('API-Version', 'v1');

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	} catch (error) {
		console.error(`[/api/v1] Error forwarding request to /api/${path}:`, error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500, headers: { 'API-Version': 'v1' } }
		);
	}
};

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PUT = forwardRequest;
export const PATCH = forwardRequest;
export const DELETE = forwardRequest;
export const OPTIONS = forwardRequest;
