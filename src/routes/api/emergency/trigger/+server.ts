import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const MAX_REQUEST_BODY_LENGTH = 8_000;
const MAX_DETAIL_KEYS = 12;
const MAX_DETAIL_VALUE_LENGTH = 240;
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache'
};

function sanitizeDetails(details: unknown): Record<string, string | number | boolean | null> {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};

  return Object.fromEntries(
    Object.entries(details as Record<string, unknown>)
      .slice(0, MAX_DETAIL_KEYS)
      .map(([key, value]): [string, string | number | boolean | null] | null => {
        const safeKey = key.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 64);
        if (!safeKey) return null;
        if (typeof value === 'string') {
          return [safeKey, value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, MAX_DETAIL_VALUE_LENGTH)];
        }
        if (typeof value === 'number' && Number.isFinite(value)) return [safeKey, value];
        if (typeof value === 'boolean' || value === null) return [safeKey, value];
        return [safeKey, '[redacted]'];
      })
      .filter((entry): entry is [string, string | number | boolean | null] => entry !== null)
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await locals.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const body = await readBoundedJsonBody<{ reason?: unknown; details?: unknown }>(
      request,
      MAX_REQUEST_BODY_LENGTH
    );
    const { reason, details } = body;

    const supabase = locals.supabase;

    // Insert into emergency_blocks table
    const { error: insertError } = await supabase
      .from('emergency_blocks')
      .insert({
        user_id: user.id,
        reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 120) : 'unknown',
        details: sanitizeDetails(details),
        triggered_at: new Date(),
      });

    if (insertError) {
      console.error('[emergency] Insert error');
      return json(
        { error: 'Failed to trigger emergency hardening' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    console.warn('[emergency] Emergency hardening triggered');

    return json({
      success: true,
      emergency_triggered: true,
      requires_device_sync: true,
      message: 'Emergency hardening was recorded. Open the iOS app to apply or verify device-level protection.',
    }, { headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    if (err instanceof RequestBodyError) {
      return json({
        error: err.status === 413 ? 'Request body too large' : 'Invalid JSON body'
      }, { status: err.status, headers: NO_STORE_HEADERS });
    }
    console.error('[emergency] Error');
    return json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
};
