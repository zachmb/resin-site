import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await locals.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    const { error: logError } = await supabase
      .from('time_sync_audit')
      .insert({
        user_id: user.id,
        device_time: new Date(device_time),
        server_time: new Date(server_time),
        drift_seconds: parseInt(drift_seconds),
        is_emergency: !!is_emergency,
        emergency_reason: reason || null,
        platform: platform || 'unknown',
        app_version: app_version || 'unknown',
      });

    if (logError) {
      console.error('[time-drift] Logging error:', logError);
      return json(
        { error: 'Failed to log drift event', details: logError.message },
        { status: 500 }
      );
    }

    // If drift is emergency-level, notify user
    if (is_emergency && Math.abs(drift_seconds) > 300) {
      console.warn(`[time-drift] Emergency drift detected for user ${user.id}: ${drift_seconds}s`);

      // TODO: Send push notification to user
      // TODO: Mark user as requiring clock verification
    }

    return json({ success: true, drift_logged: true });
  } catch (err: any) {
    console.error('[time-drift] Error:', err);
    return json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
};
