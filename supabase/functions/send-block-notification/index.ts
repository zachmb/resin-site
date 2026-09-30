/**
 * Edge Function: send-block-notification
 *
 * Triggered by database trigger when active_blocks are created.
 * Sends APNs silent notification to wake the device immediately.
 *
 * This implements the "Sap → Hardening" trigger propagation path.
 *
 * Endpoint: Called automatically via Postgres trigger (not directly by client)
 *
 * Flow:
 * 1. User activates note on web → creates active_blocks row
 * 2. PostgreSQL trigger fires → calls this function
 * 3. Function sends APNs to user's device
 * 4. Device wakes up (even if backgrounded)
 * 5. AppDelegate receives notification
 * 6. AppBlockingService syncs latest blocks from server
 * 7. Shield is applied within 30 seconds
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const appleKeyId = Deno.env.get('APNS_KEY_ID') ?? Deno.env.get('APPLE_APNs_KEY_ID')!
const appleTeamId = Deno.env.get('APNS_TEAM_ID') ?? Deno.env.get('APPLE_APNs_TEAM_ID')!
const appleP8Key = Deno.env.get('APNS_PRIVATE_KEY') ?? Deno.env.get('APPLE_APNs_P8_KEY')!  // Private key from Apple
const appleBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.looplessapp.resin'

const supabase = createClient(supabaseUrl, supabaseKey)
let apnsPrivateKeyPromise: Promise<CryptoKey> | null = null
const PERMANENT_APNS_TOKEN_FAILURES = new Set(['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered'])
const MAX_REQUEST_BODY_BYTES = 16_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CATEGORY_ID_RE = /^[a-z0-9_-]{1,64}$/i

interface ActiveBlockRecord {
  id: string
  user_id: string
  category_id?: string | null
}

interface ActiveBlockWebhookPayload {
  record?: ActiveBlockRecord | null
}

/**
 * Main handler: triggered when active_blocks row is inserted
 */
async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!isAuthorizedTriggerRequest(req)) {
      return json({ success: false, error: 'Unauthorized' }, 401)
    }

    // This is called via pg_net, a Postgres trigger, or a Supabase webhook.
    // Accept both a raw active_block row and a wrapped { record } webhook payload.
    let body: Record<string, unknown>
    try {
      body = await readBoundedJsonBody(req, MAX_REQUEST_BODY_BYTES)
    } catch (error) {
      const status = error instanceof Error && error.message === 'request_body_too_large' ? 413 : 400
      return json({ success: false, error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }, status)
    }
    const record = extractActiveBlockRecord(body)
    if (!record?.id || !UUID_RE.test(record.id) || !record.user_id || !UUID_RE.test(record.user_id)) {
      return json({ success: false, error: 'Invalid active block payload' }, 400)
    }
    if (record.category_id && !CATEGORY_ID_RE.test(record.category_id)) {
      return json({ success: false, error: 'Invalid active block payload' }, 400)
    }

    console.log('[send-block-notification] Processing block creation')

    // Fetch the user's device tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, device_type, is_active')
      .eq('user_id', record.user_id)
      .eq('device_type', 'ios')
      .eq('is_active', true)

    if (error) {
      console.error('[send-block-notification] Failed to fetch tokens')
      return json({ success: false, error: 'Failed to fetch devices' }, 500)
    }

    const deviceTokens = (tokens ?? [])
      .map(token => token.token)
      .filter((deviceToken): deviceToken is string => typeof deviceToken === 'string' && deviceToken.length > 0)

    if (deviceTokens.length === 0) {
      console.log('[send-block-notification] No iOS devices registered')
      return json({ success: true, message: 'No devices' })
    }

    // Send APNs to each device
    const results = await Promise.all(
      deviceTokens.map(deviceToken =>
        sendAPNsNotification({
          deviceToken,
          blockId: record.id,
          categoryId: record.category_id ?? ''
        })
      )
    )

    const permanentlyFailedTokens = results
      .filter(result => isPermanentAPNsTokenFailure(result))
      .map(result => result.deviceToken)

    if (permanentlyFailedTokens.length > 0) {
      await supabase
        .from('device_tokens')
        .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
        .eq('user_id', record.user_id)
        .in('token', permanentlyFailedTokens)
    }

    const successful = results.filter(r => r.success).length
    console.log('[send-block-notification] Sent to', successful, 'of', results.length, 'devices')

    return json({ success: true, sent: successful, deactivated: permanentlyFailedTokens.length })

  } catch {
    console.error('[send-block-notification] Error')
    return json({ success: false, error: 'Internal server error' }, 500)
  }
}

/**
 * Send APNs silent notification to a specific device
 */
async function sendAPNsNotification(params: {
  deviceToken: string
  blockId: string
  categoryId: string
}): Promise<{ success: boolean; error?: string; deviceToken: string }> {
  try {
    // Create JWT for APNs authentication
    // (APNs v2 requires an ES256 signed JWT)
    const jwtToken = await createAPNsJWT()

    // APNs payload: silent notification
    const payload = {
      aps: {
        badge: 0,
        'content-available': 1  // Wake the app
      },
      block_event: 'created',
      block_ids: [params.blockId],
      category_id: params.categoryId,
      policy_version: '1.0',
      server_time: new Date().toISOString()
    }

    const payloadJson = JSON.stringify(payload)

    const apnsHost = Deno.env.get('APNS_HOST') ?? 'https://api.push.apple.com'
    const apnsUrl = `${apnsHost}/3/device/${params.deviceToken}`

    const response = await fetch(apnsUrl, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwtToken}`,
        'apns-topic': appleBundleId,
        'apns-priority': '5',
        'apns-push-type': 'background',
        'content-type': 'application/json',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600)  // Expires in 1 hour
      },
      body: payloadJson
    })

    if (response.ok) {
      console.log('[APNs] Successfully sent')
      return { success: true, deviceToken: params.deviceToken }
    } else {
      const reason = parseAPNsReason(await response.text().catch(() => ''))
      console.error('[APNs] Failed:', response.status)
      return { success: false, error: reason, deviceToken: params.deviceToken }
    }

  } catch {
    console.error('[APNs] Send error')
    return { success: false, error: 'APNs send failed', deviceToken: params.deviceToken }
  }
}

/**
 * Create JWT token for APNs v2 authentication
 *
 * APNs requires a signed JWT with:
 * - Header: { alg: 'ES256', kid: keyId }
 * - Payload: { iss: teamId, iat: now }
 */
async function createAPNsJWT(): Promise<string> {
  if (!apnsPrivateKeyPromise) {
    const normalizedPrivateKey = appleP8Key.replace(/\\n/g, '\n')
    apnsPrivateKeyPromise = importPKCS8(normalizedPrivateKey, 'ES256')
  }

  const privateKey = await apnsPrivateKeyPromise
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: appleKeyId })
    .setIssuer(appleTeamId)
    .setIssuedAt()
    .sign(privateKey)
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

function isAuthorizedTriggerRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') ?? ''
  return authHeader === `Bearer ${supabaseKey}`
}

function parseAPNsReason(body: string): string {
  try {
    const parsed = JSON.parse(body) as { reason?: unknown }
    if (typeof parsed.reason === 'string') return parsed.reason
  } catch {
    // APNs returns JSON on errors; keep a safe fallback for proxy/dev failures.
  }
  return 'Unknown'
}

function isPermanentAPNsTokenFailure(result: { success: boolean; error?: string }): boolean {
  return !result.success && PERMANENT_APNS_TOKEN_FAILURES.has(result.error || '')
}

function extractActiveBlockRecord(body: unknown): ActiveBlockRecord | null {
  if (!body || typeof body !== 'object') return null

  const maybeWebhook = body as ActiveBlockWebhookPayload
  if (maybeWebhook.record && typeof maybeWebhook.record === 'object') {
    return maybeWebhook.record
  }

  return body as ActiveBlockRecord
}

async function readBoundedJsonBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('request_body_too_large')
  }

  const rawBody = await req.text()
  if (rawBody.length > maxBytes) {
    throw new Error('request_body_too_large')
  }

  const parsed = JSON.parse(rawBody) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_json_body')
  }

  return parsed as Record<string, unknown>
}

Deno.serve(handler)

/**
 * DATABASE TRIGGER SETUP:
 *
 * Create this trigger so the Edge Function is called automatically
 * whenever an active_block is inserted:
 *
 * ```sql
 * create or replace function notify_block_created()
 * returns trigger as $$
 * begin
 *   -- Call the Edge Function via pg_net
 *   -- (requires pg_net extension to be installed)
 *   perform net.http_post(
 *     url := current_setting('app.supabase_url') || '/functions/v1/send-block-notification',
 *     headers := jsonb_build_object(
 *       'authorization', 'Bearer ' || current_setting('app.service_role_key'),
 *       'content-type', 'application/json'
 *     ),
 *     body := to_jsonb(new)
 *   );
 *   return new;
 * end;
 * $$ language plpgsql;
 *
 * create trigger on_active_block_created
 *   after insert on public.active_blocks
 *   for each row
 *   execute function notify_block_created();
 * ```
 *
 * ALTERNATIVE (Supabase Webhooks):
 *
 * If pg_net is not available, use Supabase Webhooks:
 * 1. Go to Database → Webhooks
 * 2. Create webhook on active_blocks INSERT
 * 3. POST to this Edge Function URL
 */
