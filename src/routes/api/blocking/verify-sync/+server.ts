import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminClient as supabase, getAuthenticatedUserId, userHasProAccess } from '$lib/server/auth';
import { getUserBlockedDomains } from '$lib/server/blockingDomains';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const ACTIVE_DEVICE_WINDOW_MS = 10 * 60 * 1000;

function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

/**
 * Verify cross-blocking status between web and iOS
 * Returns the current state of blocked domains and their sync status
 */
export const POST: RequestHandler = async (event) => {
    const headers = responseHeaders(event.request);
    try {
        const userId = await getAuthenticatedUserId(event);
        if (!userId) return json({ error: 'Unauthorized' }, { status: 401, headers });
        if (!(await userHasProAccess(userId))) {
            return json({
                error: 'Pro required',
                code: 'PRO_REQUIRED',
                message: 'Web and extension blocking require Resin Pro.'
            }, { status: 402, headers });
        }

        // Fetch full profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('blocked_domains, blocking_enabled, extension_enabled, updated_at')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('[verify-sync] Profile lookup failed');
            return json(
                { error: 'Failed to verify blocking status' },
                { status: 500, headers }
            );
        }

        const nowIso = new Date().toISOString();
        const activeDeviceCutoff = new Date(Date.now() - ACTIVE_DEVICE_WINDOW_MS).toISOString();

        // Count actually active sessions separately from future scheduled sessions.
        // Treating all unexpired sessions as "active" made diagnostics overstate
        // protection when a session existed but had not started yet.
        const { data: activeSessions, count: activeSessionCount, error: activeSessionError } = await supabase
            .from('blocking_sessions')
            .select('start_time', { count: 'exact' })
            .eq('user_id', userId)
            .eq('is_active', true)
            .lte('start_time', nowIso)
            .gte('end_time', nowIso);

        const { count: protectedActiveSessionCount, error: protectedSessionError } = await supabase
            .from('blocking_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true)
            .eq('device_scheduled', true)
            .lte('start_time', nowIso)
            .gte('end_time', nowIso);

        const { count: upcomingSessionCount, error: upcomingSessionError } = await supabase
            .from('blocking_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true)
            .gt('start_time', nowIso);

        const { count: recentIOSDeviceCount, error: recentIOSDeviceError } = await supabase
            .from('device_tokens')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('device_type', 'ios')
            .eq('is_active', true)
            .gte('last_used_at', activeDeviceCutoff);
        const latestActiveSessionStartMs = Math.max(
            0,
            ...(activeSessions || []).map((activeSession) => new Date(activeSession.start_time).getTime()).filter(Number.isFinite)
        );
        const extensionConfirmationCutoff = new Date(Math.max(
            Date.now() - ACTIVE_DEVICE_WINDOW_MS,
            latestActiveSessionStartMs
        )).toISOString();

        const { count: recentExtensionDeviceCount, error: recentExtensionDeviceError } = await supabase
            .from('device_tokens')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('device_type', 'extension')
            .eq('is_active', true)
            .gte('last_used_at', extensionConfirmationCutoff);

        const recentDeviceError = recentIOSDeviceError || recentExtensionDeviceError;
        const diagnosticError = activeSessionError || protectedSessionError || upcomingSessionError || recentDeviceError;
        if (diagnosticError) {
            console.warn('[verify-sync] Diagnostic query degraded');
        }

        const hasActiveSession = (activeSessionCount || 0) > 0;
        const hasProtectedActiveSession = (protectedActiveSessionCount || 0) > 0;
        const hasUpcomingSession = (upcomingSessionCount || 0) > 0;
        const hasRecentIOSDevice = (recentIOSDeviceCount || 0) > 0;
        const hasRecentExtensionDevice = (recentExtensionDeviceCount || 0) > 0;
        const hasRecentlyConfirmedIOSProtection = hasProtectedActiveSession && hasRecentIOSDevice;
        const hasRecentlyConfirmedExtensionProtection = hasActiveSession && hasRecentExtensionDevice;
        const hasRecentlyConfirmedProtection = hasRecentlyConfirmedIOSProtection || hasRecentlyConfirmedExtensionProtection;
        const hasBlockingSetup = Boolean(profile?.blocking_enabled && profile?.extension_enabled);
        const blockedDomains = await getUserBlockedDomains(userId);
        const statusReason = diagnosticError
            ? 'diagnostic_query_failed'
            : hasRecentlyConfirmedProtection
                ? hasRecentlyConfirmedExtensionProtection
                    ? 'active_session_confirmed_on_extension'
                    : 'active_session_confirmed_on_device'
                : hasProtectedActiveSession
                    ? 'active_session_confirmation_stale'
                : hasActiveSession && (hasRecentIOSDevice || hasRecentExtensionDevice)
                    ? 'active_session_waiting_for_device'
                    : hasActiveSession
                        ? 'active_session_without_recent_device'
                        : hasUpcomingSession
                            ? 'future_session_scheduled'
                            : hasBlockingSetup && (hasRecentIOSDevice || hasRecentExtensionDevice)
                                ? 'ready_no_active_session'
                                : 'setup_incomplete';
        const protectionStatus = diagnosticError
            ? 'Recovering'
            : hasRecentlyConfirmedProtection
                ? 'Protected'
                : hasProtectedActiveSession
                    ? 'Recovering'
                : hasActiveSession && (hasRecentIOSDevice || hasRecentExtensionDevice)
                    ? 'Waiting for device'
                    : 'Needs setup';

        // Calculate sync score (0-100)
        const blockedDomainsScore = blockedDomains.length > 0 ? 25 : 0;
        const blockingEnabledScore = profile?.blocking_enabled ? 25 : 0;
        const extensionEnabledScore = profile?.extension_enabled ? 25 : 0;
        const hasSessionsScore = (hasActiveSession || hasUpcomingSession) ? 25 : 0;
        const syncScore = blockedDomainsScore + blockingEnabledScore + extensionEnabledScore + hasSessionsScore;

        return json({
            status: diagnosticError ? 'recovering' : 'synced',
            protectionStatus,
            statusReason,
            isProtectionRelevantNow: hasActiveSession,
            syncScore,
            blockedDomains: {
                count: blockedDomains.length
            },
            settings: {
                blockingEnabled: profile?.blocking_enabled || false,
                extensionEnabled: profile?.extension_enabled || false
            },
            sessions: {
                active: activeSessionCount || 0,
                protectedActive: protectedActiveSessionCount || 0,
                upcoming: upcomingSessionCount || 0
            },
            devices: {
                hasRecentConfirmation: hasRecentIOSDevice || hasRecentExtensionDevice,
                hasRecentIOSConfirmation: hasRecentIOSDevice,
                hasRecentExtensionConfirmation: hasRecentExtensionDevice,
                activeWindowMinutes: ACTIVE_DEVICE_WINDOW_MS / 60_000
            },
            lastUpdated: profile?.updated_at,
            timestamp: new Date().toISOString()
        }, { headers });
    } catch {
        console.error('[verify-sync] Verification failed');
        return json(
            { error: 'Internal server error' },
            { status: 500, headers: responseHeaders(event.request) }
        );
    }
};

export const OPTIONS: RequestHandler = async ({ request }) => browserCorsOptions(request);
