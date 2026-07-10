import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await locals.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason, details } = body;

    const supabase = locals.supabase;

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
        { error: 'Failed to trigger emergency hardening' },
        { status: 500 }
      );
    }

    console.warn('[emergency] Emergency hardening triggered');

    return json({
      success: true,
      emergency_triggered: true,
      requires_device_sync: true,
      message: 'Emergency hardening was recorded. Open the iOS app to apply or verify device-level protection.',
    });
  } catch (err: any) {
    console.error('[emergency] Error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
