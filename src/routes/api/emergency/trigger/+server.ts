import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { user } = await locals.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason, details } = body;

    const supabase = await locals.getSupabaseClient();

    // Insert into emergency_blocks table
    const { error: insertError } = await supabase
      .from('emergency_blocks')
      .insert({
        user_id: user.id,
        reason: reason || 'unknown',
        details: details || {},
        triggered_at: new Date(),
      });

    if (insertError) {
      console.error('[emergency] Insert error:', insertError);
      return json(
        { error: 'Failed to trigger emergency hardening', details: insertError.message },
        { status: 500 }
      );
    }

    console.warn(`[emergency] Emergency hardening triggered for user ${user.id}: ${reason}`);

    // TODO: Send push notification to all user devices
    // TODO: Send email alert
    // TODO: Log to security audit table

    return json({
      success: true,
      emergency_triggered: true,
      message: 'Emergency hardening activated. All apps are now blocked until manual intervention.',
    });
  } catch (err: any) {
    console.error('[emergency] Error:', err);
    return json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
};
