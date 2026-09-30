/**
 * notify-blocking-update
 *
 * Supabase Edge Function: Triggered when active_blocks table changes.
 * Sends Silent APNs push to iOS devices to wake them up and sync.
 *
 * Deployment:
 * supabase functions deploy notify-blocking-update
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const appleKeyId = Deno.env.get('APNS_KEY_ID') ?? Deno.env.get('APPLE_APNs_KEY_ID')!;
const appleTeamId = Deno.env.get('APNS_TEAM_ID') ?? Deno.env.get('APPLE_APNs_TEAM_ID')!;
const appleP8Key = Deno.env.get('APNS_PRIVATE_KEY') ?? Deno.env.get('APPLE_APNs_P8_KEY')!;
const appleBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.looplessapp.resin';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
let apnsPrivateKeyPromise: Promise<CryptoKey> | null = null;
const PERMANENT_APNS_TOKEN_FAILURES = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered']);
const MAX_REQUEST_BODY_BYTES = 16_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WEBHOOK_TYPES = new Set(['INSERT', 'UPDATE', 'DELETE']);

interface ActiveBlockWebhookRecord {
  id: string;
  user_id: string;
  status?: string;
  server_start_time?: string;
  server_end_time?: string;
  cancelled_by_user_at?: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record?: ActiveBlockWebhookRecord | null;
  old_record?: ActiveBlockWebhookRecord | null;
}

async function sendAPNsPush(
  token: string,
  payload: {
    type: 'blocking_update' | 'block_ended';
    sessionId: string;
    isActive: boolean;
  }
): Promise<{ success: boolean; reason?: string }> {
  try {
    const jwtToken = await createAPNsJWT();
    const apnsHost = Deno.env.get('APNS_HOST') ?? 'https://api.push.apple.com';
    const response = await fetch(
      `${apnsHost}/3/device/${token}`,
      {
        method: 'POST',
        headers: {
          authorization: `bearer ${jwtToken}`,
          'apns-topic': appleBundleId,
          'apns-priority': '5',
          'apns-push-type': 'background',
          'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aps: {
            'content-available': 1,
            badge: payload.isActive ? 1 : 0,
          },
          block_event: payload.type,
          session_id: payload.sessionId,
          is_active: payload.isActive ? 'true' : 'false',
          server_time: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const reason = parseAPNsReason(await response.text().catch(() => ''));
      console.error(`[notify-blocking-update] APNs push failed: ${response.status}`);
      return { success: false, reason };
    }

    return { success: true };
  } catch {
    console.error('[notify-blocking-update] APNs push error');
    return { success: false, reason: 'Unknown' };
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!isAuthorizedTriggerRequest(req)) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    let payload: WebhookPayload;
    try {
      payload = await readBoundedJsonBody(req, MAX_REQUEST_BODY_BYTES) as WebhookPayload;
    } catch (error) {
      const status = error instanceof Error && error.message === 'request_body_too_large' ? 413 : 400;
      return json({ ok: false, error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, status);
    }

    // Only handle active_blocks table
    if (payload.table !== 'active_blocks') {
      return json({ ok: true, skipped: 'not active_blocks' });
    }
    if (!WEBHOOK_TYPES.has(payload.type)) {
      return json({ ok: false, error: 'Invalid webhook payload' }, 400);
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const blockRecord = payload.record ?? payload.old_record;
    if (
      !blockRecord?.id ||
      !UUID_RE.test(blockRecord.id) ||
      !blockRecord.user_id ||
      !UUID_RE.test(blockRecord.user_id)
    ) {
      return json({ ok: false, error: 'Invalid active block payload' }, 400);
    }

    const { user_id, id: session_id, status, server_end_time, cancelled_by_user_at } = blockRecord;

    console.log(`[notify-blocking-update] ${payload.type} active_blocks`);

    // Step 1: Fetch user's device tokens
    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', user_id)
      .eq('device_type', 'ios')
      .eq('is_active', true);

    if (tokenError) {
      console.error('[notify-blocking-update] Device token lookup failed');
      return json({ ok: false, error: 'Failed to fetch devices' }, 500);
    }

    // Step 2: Prepare push payload
    const isEnded =
      payload.type === 'DELETE' ||
      status === 'ended' ||
      Boolean(cancelled_by_user_at) ||
      (server_end_time ? new Date(server_end_time) <= new Date() : false);
    const pushPayload: {
      type: 'blocking_update' | 'block_ended';
      sessionId: string;
      isActive: boolean;
    } = {
      type: isEnded ? 'block_ended' : 'blocking_update',
      sessionId: session_id,
      isActive: !isEnded,
    };

    // Step 3: Send to all device tokens
    const tokens = (tokenRows ?? [])
      .map((row: { token?: string }) => row.token)
      .filter((token: unknown): token is string => typeof token === 'string' && token.length > 0);

    if (tokens.length === 0) {
      console.log('[notify-blocking-update] No iOS devices registered');
      return json({ ok: true, skipped: 'no_device_tokens' });
    }

    console.log(`[notify-blocking-update] Notifying ${tokens.length} devices`);

    const results = await Promise.all(
      tokens.map(async (token: string) => ({
        token,
        result: await sendAPNsPush(token, pushPayload),
      }))
    );

    const permanentlyFailedTokens = results
      .filter(({ result }) => isPermanentAPNsTokenFailure(result))
      .map(({ token }) => token);

    if (permanentlyFailedTokens.length > 0) {
      await supabase
        .from('device_tokens')
        .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .in('token', permanentlyFailedTokens);
    }

    const succeeded = results.filter(({ result }) => result.success).length;
    const failed = results.length - succeeded;

    return new Response(
      JSON.stringify({
        ok: true,
        devices_notified: succeeded,
        devices_failed: failed,
        devices_deactivated: permanentlyFailedTokens.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch {
    console.error('[notify-blocking-update] Error');
    return json({ ok: false, error: 'Internal server error' }, 500);
  }
}

async function createAPNsJWT(): Promise<string> {
  if (!apnsPrivateKeyPromise) {
    const normalizedPrivateKey = appleP8Key.replace(/\\n/g, '\n');
    apnsPrivateKeyPromise = importPKCS8(normalizedPrivateKey, 'ES256');
  }

  const privateKey = await apnsPrivateKeyPromise;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: appleKeyId })
    .setIssuer(appleTeamId)
    .setIssuedAt()
    .sign(privateKey);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function isAuthorizedTriggerRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') ?? '';
  return authHeader === `Bearer ${supabaseKey}`;
}

function parseAPNsReason(body: string): string {
  try {
    const parsed = JSON.parse(body) as { reason?: unknown };
    if (typeof parsed.reason === 'string') return parsed.reason;
  } catch {
    // APNs returns JSON on errors; keep a safe fallback for proxy/dev failures.
  }
  return 'Unknown';
}

function isPermanentAPNsTokenFailure(result: { success: boolean; reason?: string }): boolean {
  return !result.success && PERMANENT_APNS_TOKEN_FAILURES.has(result.reason || '');
}

async function readBoundedJsonBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('request_body_too_large');
  }

  const rawBody = await req.text();
  if (rawBody.length > maxBytes) {
    throw new Error('request_body_too_large');
  }

  const parsed = JSON.parse(rawBody) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_json_body');
  }

  return parsed as Record<string, unknown>;
}

Deno.serve(handler);
