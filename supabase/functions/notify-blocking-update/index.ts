/**
 * notify-blocking-update
 *
 * Supabase Edge Function: Triggered when active_blocks table changes.
 * Sends Silent APNs push to iOS devices to wake them up and sync.
 *
 * Deployment:
 * supabase functions deploy notify-blocking-update
 */

import { createClient } from '@supabase/supabase-js';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    user_id: string;
    status: string;
    server_start_time: string;
    server_end_time: string;
  };
  old_record: any;
}

async function sendAPNsPush(
  token: string,
  payload: {
    type: 'blocking_update' | 'block_ended';
    sessionId: string;
    isActive: boolean;
  }
) {
  // NOTE: Requires Apple Push Certificate configured in Supabase settings
  // For MVP: Use a third-party service (Firebase Cloud Messaging, OneSignal)
  //
  // Example with Firebase:
  const firebaseToken = Deno.env.get('FIREBASE_TOKEN');
  
  const response = await fetch(
    'https://fcm.googleapis.com/v1/projects/your-project/messages:send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: token,
          data: {
            type: payload.type,
            sessionId: payload.sessionId,
            isActive: String(payload.isActive),
          },
          android: {
            priority: 'high',
            notification: {
              title: 'Resin',
              body: payload.isActive ? 'Block activated' : 'Block ended',
            },
          },
          apns: {
            payload: {
              aps: {
                'content-available': 1,  // Silent
                'mutable-content': 0,
                badge: payload.isActive ? 1 : 0,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Push failed: ${response.status} ${errorText}`);
    throw new Error(`APNs push failed: ${response.status}`);
  }
}

export async function handler(req: Request): Promise<Response> {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle active_blocks table
    if (payload.table !== 'active_blocks') {
      return new Response(JSON.stringify({ ok: true, skipped: 'not active_blocks' }), {
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, id: session_id, status } = payload.record;

    console.log(
      `[notify-blocking-update] ${payload.type} active_blocks: session=${session_id}, user=${user_id}`
    );

    // Step 1: Fetch user's device tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('apns_device_tokens')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.apns_device_tokens) {
      console.log(`[notify-blocking-update] No device tokens for user ${user_id}`);
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no_device_tokens' }),
        { status: 200 }
      );
    }

    // Step 2: Prepare push payload
    const pushPayload = {
      type: payload.type === 'DELETE' || status === 'ended' ? 'block_ended' : 'blocking_update',
      sessionId: session_id,
      isActive: status === 'active',
    };

    // Step 3: Send to all device tokens
    const tokens = Array.isArray(profile.apns_device_tokens)
      ? profile.apns_device_tokens
      : [];

    console.log(`[notify-blocking-update] Notifying ${tokens.length} devices`);

    const results = await Promise.allSettled(
      tokens.map((token: string) => sendAPNsPush(token, pushPayload))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        ok: true,
        devices_notified: succeeded,
        devices_failed: failed,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[notify-blocking-update] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
