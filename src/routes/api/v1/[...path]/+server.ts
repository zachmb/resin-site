import { json } from '@sveltejs/kit';
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

const MAX_PROXY_PATH_LENGTH = 512;
const SAFE_PROXY_PATH_RE = /^[A-Za-z0-9/_-]+$/;
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

function safeProxyPath(path: string | undefined): string | null {
	const normalized = (path ?? '').replace(/^\/+/, '');
	if (
		!normalized ||
		normalized.length > MAX_PROXY_PATH_LENGTH ||
		normalized === 'v1' ||
		normalized.startsWith('v1/') ||
		normalized.includes('..') ||
		normalized.includes('//') ||
		!SAFE_PROXY_PATH_RE.test(normalized)
	) {
		return null;
	}
	return normalized;
}

const forward = async (event: RequestEvent): Promise<Response> => {
	const path = safeProxyPath(event.params.path);
	if (!path) {
		return json({ error: 'Invalid API path' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	const qs = event.url.search;
	const target = `/api/${path}${qs}`;

	// Preserve the original request method, headers, and body
	const res = await event.fetch(target, {
		method: event.request.method,
		headers: event.request.headers,
		body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
		duplex: 'half'
	} as any);

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
