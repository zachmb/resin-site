import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache'
};
const MAX_REQUEST_BODY_LENGTH = 8_000;
const MAX_DRIFT_SECONDS = 86_400;
const MAX_TEXT_LENGTH = 120;

function safeText(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : '';
  return text ? text.slice(0, MAX_TEXT_LENGTH) : fallback;
}

function safeDate(value: unknown): Date {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await locals.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    let body: Record<string, unknown>;
    try {
      body = await readBoundedJsonBody<Record<string, unknown>>(request, MAX_REQUEST_BODY_LENGTH);
    } catch (error) {
      const status = error instanceof RequestBodyError ? error.status : 400;
      return json({
        error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
      }, { status, headers: NO_STORE_HEADERS });
    }
    const {
      device_time,
      server_time,
      drift_seconds,
      is_emergency,
      reason,
      app_version,
      platform,
    } = body;

    // Log to database via Supabase
    const supabase = locals.supabase;
    const parsedDriftSeconds = Number.parseInt(String(drift_seconds), 10);
    const driftSeconds = Number.isFinite(parsedDriftSeconds)
      ? Math.max(-MAX_DRIFT_SECONDS, Math.min(MAX_DRIFT_SECONDS, parsedDriftSeconds))
      : 0;
    const deviceTime = safeDate(device_time);
    const serverTime = safeDate(server_time);

    const { error: logError } = await supabase
      .from('time_sync_audit')
      .insert({
        user_id: user.id,
        device_time: deviceTime,
        server_time: serverTime,
        drift_seconds: driftSeconds,
        is_emergency: !!is_emergency,
        emergency_reason: typeof reason === 'string' && reason.trim() ? safeText(reason, 'unknown') : null,
        platform: safeText(platform, 'unknown'),
        app_version: safeText(app_version, 'unknown'),
      });

    if (logError) {
      console.error('[time-drift] Logging error');
      return json(
        { error: 'Failed to log drift event' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    // If drift is emergency-level, make that explicit in the response so clients
    // can guide the user without pretending a push/lock action already happened.
    let requiresClockVerification = false;
    if (is_emergency && Math.abs(driftSeconds) > 300) {
      console.warn('[time-drift] Emergency drift detected');
      requiresClockVerification = true;
    }

    return json({ success: true, drift_logged: true, requires_clock_verification: requiresClockVerification }, { headers: NO_STORE_HEADERS });
  } catch {
    console.error('[time-drift] Error');
    return json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
};
