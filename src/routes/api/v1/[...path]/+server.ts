import type { RequestEvent } from '@sveltejs/kit';

/**
 * API v1 Versioning Route
 *
 * This catch-all route forwards all requests from /api/v1/* to /api/*
 * allowing backward compatibility and explicit version prefixing.
 *
 * The actual API logic remains at /api/* endpoints. This layer:
 * - Proxies all HTTP methods transparently
 * - Preserves query strings and request bodies
 * - Adds API-Version header to responses
 * - Maintains authentication and headers
 */

const forward = async (event: RequestEvent): Promise<Response> => {
	const path = event.params.path;
	const qs = event.url.search;
	const target = `/api/${path}${qs}`;

	// Preserve the original request method, headers, and body
	const res = await event.fetch(target, {
		method: event.request.method,
		headers: event.request.headers,
		body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
		duplex: 'half'
	});

	// Copy response headers and add version marker
	const headers = new Headers(res.headers);
	headers.set('API-Version', 'v1');

	return new Response(res.body, { status: res.status, headers });
};

// Export all HTTP methods to forward to /api/* endpoints
export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
