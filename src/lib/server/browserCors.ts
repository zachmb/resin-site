const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

const ALLOWED_BROWSER_ORIGINS = new Set([
	'https://noteresin.com',
	'https://www.noteresin.com',
	'http://localhost:5173',
	'http://127.0.0.1:5173'
]);

function isAllowedChromeExtensionOrigin(origin: string): boolean {
	return /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
}

export function browserCorsHeaders(request: Request): HeadersInit {
	const origin = request.headers.get('origin') ?? '';
	const headers: Record<string, string> = {
		...NO_STORE_HEADERS,
		Vary: 'Origin, Authorization'
	};

	if (ALLOWED_BROWSER_ORIGINS.has(origin) || isAllowedChromeExtensionOrigin(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
	}

	return headers;
}

export function browserCorsOptions(request: Request, methods = 'POST, OPTIONS'): Response {
	return new Response(null, {
		headers: {
			...browserCorsHeaders(request),
			'Access-Control-Allow-Headers': 'Authorization, Content-Type',
			'Access-Control-Allow-Methods': methods
		}
	});
}
