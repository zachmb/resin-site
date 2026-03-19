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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const appleKeyId = Deno.env.get('APPLE_APNs_KEY_ID')!
const appleTeamId = Deno.env.get('APPLE_APNs_TEAM_ID')!
const appleP8Key = Deno.env.get('APPLE_APNs_P8_KEY')!  // Private key from Apple

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Main handler: triggered when active_blocks row is inserted
 */
async function handler(req: Request) {
  try {
    // This is called via pg_net or a Postgres trigger
    // The payload contains the newly created active_block record
    const record = await req.json()

    console.log('[send-block-notification] Processing block creation:', record.id)

    // Fetch the user's device tokens
    const { data: tokens, error } = await supabase
      .from('user_apns_tokens')  // Your custom table tracking device tokens
      .select('device_token, platform')
      .eq('user_id', record.user_id)
      .eq('platform', 'ios')

    if (error) {
      console.error('[send-block-notification] Failed to fetch tokens:', error)
      return new Response(JSON.stringify({ success: false }), { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
      console.log('[send-block-notification] No iOS devices registered for user', record.user_id)
      return new Response(JSON.stringify({ success: true, message: 'No devices' }), { status: 200 })
    }

    // Send APNs to each device
    const results = await Promise.all(
      tokens.map(token =>
        sendAPNsNotification({
          deviceToken: token.device_token,
          blockId: record.id,
          categoryId: record.category_id,
          userId: record.user_id
        })
      )
    )

    const successful = results.filter(r => r.success).length
    console.log('[send-block-notification] Sent to', successful, 'of', results.length, 'devices')

    return new Response(JSON.stringify({ success: true, sent: successful }), { status: 200 })

  } catch (err) {
    console.error('[send-block-notification] Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

/**
 * Send APNs silent notification to a specific device
 */
async function sendAPNsNotification(params: {
  deviceToken: string
  blockId: string
  categoryId: string
  userId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create JWT for APNs authentication
    // (APNs v2 requires HMAC-SHA256 signed JWT)
    const jwtToken = createAPNsJWT()

    // APNs payload: silent notification
    const payload = {
      aps: {
        alert: null,  // No visible alert
        badge: 0,
        sound: '',
        'content-available': 1  // Wake the app
      },
      block_event: 'created',
      block_ids: [params.blockId],
      category_id: params.categoryId,
      policy_version: '1.0',
      server_time: new Date().toISOString()
    }

    const payloadJson = JSON.stringify(payload)

    // APNs endpoint (production)
    // Use "https://api.sandbox.push.apple.com" for development
    const apnsUrl = `https://api.push.apple.com/3/device/${params.deviceToken}`

    const response = await fetch(apnsUrl, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwtToken}`,
        'apns-priority': '10',
        'apns-push-type': 'background',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600)  // Expires in 1 hour
      },
      body: payloadJson
    })

    if (response.ok) {
      console.log('[APNs] Successfully sent to', params.deviceToken.substring(0, 8))
      return { success: true }
    } else {
      const error = await response.text()
      console.error('[APNs] Failed:', response.status, error)
      return { success: false, error: `APNs ${response.status}` }
    }

  } catch (err) {
    console.error('[APNs] Send error:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Create JWT token for APNs v2 authentication
 *
 * APNs requires a signed JWT with:
 * - Header: { alg: 'ES256', kid: keyId }
 * - Payload: { iss: teamId, iat: now }
 */
function createAPNsJWT(): string {
  // IMPORTANT: This is a simplified placeholder.
  // In production, you'd use a proper JWT library with ECDSA P-256 signing.
  //
  // See: https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_certificate-based_connection_to_apns
  //
  // For Deno, you might use:
  // import { create } from 'https://deno.land/x/djwt@v2.9.1/mod.ts'

  // PLACEHOLDER implementation
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: appleKeyId }))
  const payload = btoa(JSON.stringify({
    iss: appleTeamId,
    iat: Math.floor(Date.now() / 1000)
  }))

  // In production, sign with ECDSA P-256 using the private key
  // const signature = signWithES256(header + '.' + payload, appleP8Key)

  // For now, return a dummy token (this will fail against real APNs)
  return `${header}.${payload}.DUMMY_SIGNATURE`
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
