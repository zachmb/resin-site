import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId } from '$lib/server/auth';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MAX_REQUEST_BODY_LENGTH = 4_000;
const EXTENSION_DEVICE_ID_RE =
	/^ext-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};

function responseHeaders(request: Request): HeadersInit {
	return browserCorsHeaders(request);
}

export const POST: RequestHandler = async (event) => {
	const headers = responseHeaders(event.request);
	try {
		const userId = await getAuthenticatedUserId(event);
		if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });

		let body: { token?: unknown };
		try {
			body = await readBoundedJsonBody(event.request, MAX_REQUEST_BODY_LENGTH);
		} catch (error) {
			const status = error instanceof RequestBodyError ? error.status : 400;
			return json({ error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, { status, headers });
		}

		const token = typeof body.token === 'string' ? body.token.trim() : '';
		if (!EXTENSION_DEVICE_ID_RE.test(token)) {
			return json({ error: 'Invalid device token' }, { status: 400, headers });
		}

		const { error } = await supabase
			.from('device_tokens')
			.update({
				is_active: false,
				last_used_at: null,
				updated_at: new Date().toISOString()
			})
			.eq('user_id', userId)
			.eq('token', token)
			.eq('device_type', 'extension');

		if (error) {
			console.error('Error unregistering extension device token');
			return json({ error: 'Failed to unregister device token' }, { status: 500, headers });
		}

		return json({ success: true }, { headers });
	} catch {
		console.error('Error in unregister device token');
		return json({ error: 'Internal server error' }, { status: 500, headers });
	}
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
