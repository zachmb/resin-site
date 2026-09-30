import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};
const RECENT_DEVICE_CONFIRMATION_MS = 10 * 60 * 1000;

export const GET: RequestHandler = async ({ url, locals: { getAuthenticatedSupabase, session } }) => {
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const supabase = await getAuthenticatedSupabase();

    const id = url.searchParams.get('id');
    if (!id) {
        return json({ error: 'Missing session id' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!SESSION_ID_RE.test(id)) {
        return json({ error: 'Invalid session id' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data: sessionData, error } = await supabase
        .from('blocking_sessions')
        .select('device_scheduled, is_active, start_time, end_time')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (error || !sessionData) {
        return json({ error: 'Session not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const now = Date.now();
    const startMs = new Date(sessionData.start_time).getTime();
    const endMs = new Date(sessionData.end_time).getTime();
    const isActiveWindow = Boolean(
        sessionData.is_active &&
        Number.isFinite(startMs) &&
        Number.isFinite(endMs) &&
        startMs <= now &&
        endMs >= now
    );
    const isFutureWindow = Boolean(
        sessionData.is_active &&
        Number.isFinite(startMs) &&
        startMs > now
    );
    const isEndedWindow = Boolean(
        !sessionData.is_active ||
        (Number.isFinite(endMs) && endMs < now)
    );
    const deviceScheduled = sessionData.device_scheduled === true;
    const recentDeviceCutoff = new Date(now - RECENT_DEVICE_CONFIRMATION_MS).toISOString();
    const extensionConfirmationCutoff = new Date(Math.max(
        now - RECENT_DEVICE_CONFIRMATION_MS,
        Number.isFinite(startMs) ? startMs : 0
    )).toISOString();
    const { count: recentIOSDeviceCount, error: recentIOSDeviceError } = await supabase
        .from('device_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('device_type', 'ios')
        .eq('is_active', true)
        .gte('last_used_at', recentDeviceCutoff);
    const { count: recentExtensionDeviceCount, error: recentExtensionDeviceError } = await supabase
        .from('device_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('device_type', 'extension')
        .eq('is_active', true)
        .gte('last_used_at', extensionConfirmationCutoff);
    const recentDeviceError = recentIOSDeviceError || recentExtensionDeviceError;
    const hasRecentIOSDevice = (recentIOSDeviceCount || 0) > 0;
    const hasRecentExtensionDevice = (recentExtensionDeviceCount || 0) > 0;
    const confirmationIsFresh = !recentDeviceError && (
        (deviceScheduled && hasRecentIOSDevice) ||
        hasRecentExtensionDevice
    );

    const protectionStatus = recentDeviceError
        ? 'Recovering'
        : confirmationIsFresh && isActiveWindow
        ? 'Protected'
        : deviceScheduled && isActiveWindow
            ? 'Recovering'
        : isActiveWindow || isFutureWindow
            ? 'Waiting for device'
            : 'Needs setup';
    const statusReason = recentDeviceError
        ? 'device_confirmation_unavailable'
        : confirmationIsFresh && isActiveWindow
        ? hasRecentExtensionDevice
            ? 'active_session_confirmed_on_extension'
            : 'active_session_confirmed_on_device'
        : deviceScheduled && isActiveWindow
            ? 'active_session_confirmation_stale'
        : isActiveWindow
            ? 'active_session_waiting_for_device'
            : isFutureWindow
                ? 'future_session_scheduled'
                : isEndedWindow
                    ? 'session_not_active'
                    : 'setup_incomplete';

    return json({
        device_scheduled: deviceScheduled,
        is_active_window: isActiveWindow,
        is_future_window: isFutureWindow,
        is_ended_window: isEndedWindow,
        has_recent_device_confirmation: hasRecentIOSDevice || hasRecentExtensionDevice,
        recent_device_window_seconds: RECENT_DEVICE_CONFIRMATION_MS / 1000,
        seconds_until_start: isFutureWindow ? Math.max(0, Math.ceil((startMs - now) / 1000)) : 0,
        protectionStatus,
        statusReason
    }, { headers: NO_STORE_HEADERS });
};
