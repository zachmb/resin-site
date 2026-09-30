export class RequestBodyError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'RequestBodyError';
	}
}

function assertJsonContentType(request: Request) {
	const contentType = request.headers.get('content-type');
	if (!contentType) return;

	const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
	const isJson =
		mediaType === 'application/json' ||
		/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+\+json$/.test(mediaType);
	if (!isJson) {
		throw new RequestBodyError('Unsupported content type', 415);
	}
}

async function readBoundedStream(
	body: ReadableStream<Uint8Array> | null,
	maxLength: number,
	tooLargeError: () => Error
): Promise<string> {
	if (!body) return '';

	const reader = body.getReader();
	const decoder = new TextDecoder();
	let bytesRead = 0;
	let rawBody = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytesRead += value.byteLength;
			if (bytesRead > maxLength) {
				await reader.cancel().catch(() => undefined);
				throw tooLargeError();
			}
			rawBody += decoder.decode(value, { stream: true });
		}
		rawBody += decoder.decode();
		return rawBody;
	} finally {
		reader.releaseLock();
	}
}

export async function readBoundedJsonBody<T>(request: Request, maxLength: number): Promise<T> {
	assertJsonContentType(request);

	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (Number.isFinite(contentLength) && contentLength > maxLength) {
		await request.body?.cancel().catch(() => undefined);
		throw new RequestBodyError('Request body too large', 413);
	}

	let rawBody: string;
	try {
		rawBody = await readBoundedStream(
			request.body,
			maxLength,
			() => new RequestBodyError('Request body too large', 413)
		);
	} catch (error) {
		if (error instanceof RequestBodyError) throw error;
		throw new RequestBodyError('Invalid JSON body', 400);
	}

	try {
		const parsed = JSON.parse(rawBody) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new RequestBodyError('Invalid JSON body', 400);
		}
		return parsed as T;
	} catch (error) {
		if (error instanceof RequestBodyError) throw error;
		throw new RequestBodyError('Invalid JSON body', 400);
	}
}

export async function readOptionalBoundedJsonBody<T>(
	request: Request,
	maxLength: number
): Promise<T | undefined> {
	assertJsonContentType(request);

	const contentLengthHeader = request.headers.get('content-length');
	const contentLength = Number(contentLengthHeader ?? 0);
	if (contentLengthHeader !== null && Number.isFinite(contentLength) && contentLength === 0) {
		return undefined;
	}
	if (Number.isFinite(contentLength) && contentLength > maxLength) {
		await request.body?.cancel().catch(() => undefined);
		throw new RequestBodyError('Request body too large', 413);
	}

	let rawBody: string;
	try {
		rawBody = await readBoundedStream(
			request.body,
			maxLength,
			() => new RequestBodyError('Request body too large', 413)
		);
	} catch (error) {
		if (error instanceof RequestBodyError) throw error;
		throw new RequestBodyError('Invalid JSON body', 400);
	}
	if (rawBody.trim().length === 0) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(rawBody) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new RequestBodyError('Invalid JSON body', 400);
		}
		return parsed as T;
	} catch (error) {
		if (error instanceof RequestBodyError) throw error;
		throw new RequestBodyError('Invalid JSON body', 400);
	}
}

export async function readBoundedJsonResponse<T>(response: Response, maxLength: number): Promise<T> {
	const contentLength = Number(response.headers.get('content-length') ?? 0);
	if (Number.isFinite(contentLength) && contentLength > maxLength) {
		await response.body?.cancel().catch(() => undefined);
		throw new Error('Response body too large');
	}

	let rawBody: string;
	try {
		rawBody = await readBoundedStream(
			response.body,
			maxLength,
			() => new Error('Response body too large')
		);
	} catch (error) {
		if (error instanceof Error && error.message === 'Response body too large') throw error;
		throw new Error('Invalid JSON response');
	}

	try {
		return JSON.parse(rawBody) as T;
	} catch {
		throw new Error('Invalid JSON response');
	}
}
