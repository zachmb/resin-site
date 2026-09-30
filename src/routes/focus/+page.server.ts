import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isPermanentAPNsTokenFailure, sendPushWithResult } from '$lib/services/apns';
import type { APNsPayload } from '$lib/services/apns';
import { adminClient } from '$lib/server/auth';

const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 480;
const ACTIVE_DEVICE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TITLE_LENGTH = 120;
const MAX_FOCUS_PAGE_SESSIONS = 100;
const MAX_FOCUS_PAGE_AUTOMATIONS = 50;
const MAX_FOCUS_PAGE_FRIENDSHIPS = 200;
const MAX_FOCUS_PAGE_GROUPS = 100;
const MAX_FOCUS_PAGE_PUSH_TOKENS = 50;
const MAX_FOCUS_PAGE_EXPANSIONS = 200;
const MAX_DISPLAY_NAME_LENGTH = 80;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;

function sanitizeFocusTitle(value: unknown): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
        : '';
}

function cleanDisplayName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const displayName = value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    return displayName || null;
}

function focusActionFailure(action: string, userMessage = 'Something went sideways. Please try again.'): { success: false; error: string } {
    console.error(`[focus] ${action} failed`);
    return { success: false, error: userMessage };
}

async function sendIOSPushesWithCleanup(
    supabase: any,
    userIds: string | string[],
    tokens: { token: string }[],
    payload: APNsPayload
) {
    const results = await Promise.allSettled(tokens.map(async ({ token }) => {
        const result = await sendPushWithResult(token, payload);
        return { token, permanentFailure: isPermanentAPNsTokenFailure(result) };
    }));

    const permanentlyFailedTokens = results
        .filter((result): result is PromiseFulfilledResult<{ token: string; permanentFailure: boolean }> =>
            result.status === 'fulfilled' && result.value.permanentFailure
        )
        .map((result) => result.value.token);

    if (permanentlyFailedTokens.length > 0) {
        const scopedUserIds = Array.isArray(userIds) ? userIds : [userIds];
        const { error } = await supabase
            .from('device_tokens')
            .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
            .in('token', permanentlyFailedTokens)
            .in('user_id', scopedUserIds);

        if (error) {
            console.warn('[focus] Failed to deactivate stale APNs token(s)');
        }
    }
}

async function sendBlockingSyncPush(
    userId: string,
    session?: { id: string; start_time: string; end_time: string } | null
) {
    const { data: tokens } = await adminClient
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('device_type', 'ios')
        .eq('is_active', true)
        .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

    if (!tokens || tokens.length === 0) return;

    await sendIOSPushesWithCleanup(adminClient, userId, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
        title: 'Focus protection',
        body: 'Your protection state changed.',
        pushType: 'background',
        data: session
            ? {
                type: 'focus_session_start',
                sessionId: session.id,
                startTime: session.start_time,
                endTime: session.end_time
            }
            : { type: 'sync_blocking' }
    });
}

function parseFocusWindow(date: string, time: string, duration: number): { startTime: Date; endTime: Date } | { error: string } {
    if (!Number.isFinite(duration) || duration < MIN_FOCUS_MINUTES || duration > MAX_FOCUS_MINUTES) {
        return { error: `Duration must be between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES} minutes` };
    }
    const startTime = new Date(`${date}T${time}`);
    if (!Number.isFinite(startTime.getTime())) {
        return { error: 'Invalid session start time' };
    }
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    return { startTime, endTime };
}

export const load: PageServerLoad = async ({ locals: { getAuthenticatedSupabase, getUser, session }, setHeaders, url }) => {
    // Disable server caching for fresh data
    setHeaders({
        'cache-control': 'no-cache, no-store, must-revalidate'
    });

    const user = await getUser();

    if (!user || !session) {
        throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
    }

    const supabase = await getAuthenticatedSupabase();

    // Expand focus automations into blocking sessions for next 7 days
    // This ensures coverage whether user opened the app or not
    const expandPromise = (async () => {
        try {
            // Fetch enabled automations
            const { data: automations } = await supabase
                .from('focus_automations')
                .select('title, time, duration_minutes, days_of_week')
                .eq('user_id', user.id)
                .eq('enabled', true)
                .limit(MAX_FOCUS_PAGE_AUTOMATIONS + 1);

            if (!automations || automations.length === 0) return;

            const now = new Date();
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const sessionsToCreate: any[] = [];

            for (const automation of automations) {
                const [hours, minutes] = automation.time.split(':').map(Number);
                const dayMap: { [key: string]: number } = {
                    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
                    'Friday': 5, 'Saturday': 6, 'Sunday': 0
                };

                const targetDays = automation.days_of_week
                    .split(',')
                    .map((day: string) => dayMap[day.trim()])
                    .filter((d: number) => d !== undefined);

                let currentDate = new Date(now);
                currentDate.setHours(0, 0, 0, 0);

                while (currentDate <= sevenDaysLater) {
                    const dayOfWeek = currentDate.getDay();

                    if (targetDays.includes(dayOfWeek)) {
                        const startTime = new Date(currentDate);
                        startTime.setHours(hours, minutes, 0, 0);

                        if (startTime > now && sessionsToCreate.length < MAX_FOCUS_PAGE_EXPANSIONS) {
                            const endTime = new Date(startTime.getTime() + automation.duration_minutes * 60 * 1000);

                            // Check for existing session
                            const { data: existing } = await supabase
                                .from('blocking_sessions')
                                .select('id')
                                .eq('user_id', user.id)
                                .eq('title', automation.title)
                                .gte('start_time', startTime.toISOString())
                                .lt('start_time', new Date(startTime.getTime() + 60 * 1000).toISOString())
                                .single();

                            if (!existing) {
                                sessionsToCreate.push({
                                    user_id: user.id,
                                    title: automation.title,
                                    start_time: startTime.toISOString(),
                                    end_time: endTime.toISOString(),
                                    is_active: true,
                                    device_scheduled: false
                                });
                            }
                        }
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            if (sessionsToCreate.length > 0) {
                await supabase.from('blocking_sessions').insert(sessionsToCreate);
            }
        } catch {
            console.warn('[focus] automation expansion failed');
            // Don't fail the page load if this fails
        }
    })();

    // Run expansion in background
    expandPromise.catch(() => {});

    // Fetch active sessions (started but not ended)
    const now = new Date().toISOString();
    const { data: activeSessions } = await supabase
        .from('blocking_sessions')
        .select('id, title, start_time, end_time, duration_minutes, is_active, device_scheduled')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('start_time', { ascending: false })
        .limit(MAX_FOCUS_PAGE_SESSIONS);

    // Fetch scheduled sessions (upcoming)
    const { data: scheduledSessions } = await supabase
        .from('blocking_sessions')
        .select('id, title, start_time, end_time, duration_minutes, is_active, device_scheduled')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .gt('start_time', now)
        .order('start_time', { ascending: true })
        .limit(MAX_FOCUS_PAGE_SESSIONS);

    // Fetch automations
    const { data: automations } = await supabase
        .from('focus_automations')
        .select('id, title, time, duration_minutes, days_of_week, enabled')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_FOCUS_PAGE_AUTOMATIONS);

    // Fetch accepted friends (for invite dropdown)
    const { data: friendships } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`)
        .eq('status', 'accepted')
        .limit(MAX_FOCUS_PAGE_FRIENDSHIPS);

    const friendIds = friendships?.map(f =>
        f.requester_id === session.user.id ? f.addressee_id : f.requester_id
    ) || [];

    let friends: any[] = [];
    if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', friendIds.slice(0, MAX_FOCUS_PAGE_FRIENDSHIPS));

        friends = friendProfiles?.map(p => ({
            id: p.id,
            displayName: cleanDisplayName(p.full_name)
                || cleanDisplayName(p.username)
                || 'Resin user'
        })) || [];
    }

    // Fetch shared focus sessions
    const { data: sharedSessions } = await supabase
        .from('shared_focus_sessions')
        .select('id, title, start_time, end_time, status, collaborator_id')
        .or(`initiator_id.eq.${session.user.id},collaborator_id.eq.${session.user.id}`)
        .neq('status', 'declined')
        .order('created_at', { ascending: false })
        .limit(MAX_FOCUS_PAGE_SESSIONS);

    // Count active, recently-seen devices for protection confidence.
    const nowMs = Date.now();
    const activeDeviceCutoff = new Date(nowMs - ACTIVE_DEVICE_WINDOW_MS).toISOString();
    const latestActiveSessionStartMs = (activeSessions || [])
        .map((activeSession) => new Date(activeSession.start_time).getTime())
        .filter(Number.isFinite)
        .reduce((latest, startMs) => Math.max(latest, startMs), 0);
    const extensionConfirmationCutoff = new Date(Math.max(
        nowMs - ACTIVE_DEVICE_WINDOW_MS,
        latestActiveSessionStartMs
    )).toISOString();
    const { count: deviceCount, error: deviceCountError } = await supabase
        .from('device_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .gte('last_used_at', activeDeviceCutoff);
    const { count: extensionDeviceCount, error: extensionDeviceCountError } = await supabase
        .from('device_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('device_type', 'extension')
        .eq('is_active', true)
        .gte('last_used_at', extensionConfirmationCutoff);

    if (deviceCountError || extensionDeviceCountError) {
        console.warn('[focus] Device count unavailable');
    }

    // Fetch user's focus groups
    const { data: userGroups } = await supabase
        .from('focus_group_members')
        .select(`
            group_id,
            role,
            joined_at,
            focus_groups (
                id,
                name,
                description,
                created_by,
                created_at
            )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false })
        .limit(MAX_FOCUS_PAGE_GROUPS);

    const groups = (userGroups || []).map((ug: any) => ({
        ...ug.focus_groups,
        userRole: ug.role,
        joinedAt: ug.joined_at
    }));

    return {
        activeSessions: activeSessions || [],
        scheduledSessions: scheduledSessions || [],
        automations: automations || [],
        friends: friends || [],
        sharedSessions: sharedSessions || [],
        deviceCount: deviceCount || 0,
        extensionDeviceCount: extensionDeviceCount || 0,
        deviceStatusUnavailable: Boolean(deviceCountError || extensionDeviceCountError),
        groups: groups || []
    };
};

export const actions: Actions = {
    scheduleSession: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const title = sanitizeFocusTitle(data.get('title')?.toString());
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        const focusWindow = parseFocusWindow(date, time, duration);
        if ('error' in focusWindow) {
            return { success: false, error: focusWindow.error };
        }
        const { startTime, endTime } = focusWindow;
        const sessionId = crypto.randomUUID();

        try {
            const { data: insertedSession, error } = await supabase
                .from('blocking_sessions')
                .insert({
                    id: sessionId,
                    user_id: user.id,
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    is_active: true,
                    device_scheduled: false
                })
                .select('id, title, start_time, end_time, is_active, device_scheduled')
                .single();

            if (error) throw error;

            // Send silent push notification to iOS devices
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', user.id)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(supabase, user.id, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus session',
                        body: 'Your protection window is ready.',
                        pushType: 'background',
                        data: {
                            type: 'focus_session_start',
                            sessionId: sessionId,
                            startTime: startTime.toISOString(),
                            endTime: endTime.toISOString()
                        }
                    });
            }

            return { success: true, session: insertedSession };
        } catch {
            return focusActionFailure('schedule session', 'Could not schedule protection right now.');
        }
    },

    cancelSession: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return fail(401, { error: 'Unauthorized' });

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();

        if (!sessionId) return fail(400, { error: 'Missing session ID' });

        try {
            const { count, error } = await supabase
                .from('blocking_sessions')
                .delete({ count: 'exact' })
                .eq('id', sessionId)
                .eq('user_id', user.id);

            if (error) throw error;
            if (!count || count === 0) return fail(404, { error: 'Session not found or insufficient permissions' });

            // Notify device to sync
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', user.id)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(supabase, user.id, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Session Cancelled',
                        body: 'A scheduled focus session was removed.',
                        data: { type: 'sync_blocking' }
                    });
            }

            return { success: true };
        } catch {
            console.error('[focus] cancel session failed');
            return fail(500, { error: 'Could not remove that focus session right now.' });
        }
    },

    createAutomation: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const title = sanitizeFocusTitle(data.get('title')?.toString());
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '25');
        const daysOfWeek = data.get('daysOfWeek')?.toString() || '';

        if (!title || !time || !daysOfWeek) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            const { data: automation, error } = await supabase
                .from('focus_automations')
                .insert({
                    user_id: user.id,
                    title: title,
                    time: time,
                    duration_minutes: duration,
                    days_of_week: daysOfWeek,
                    enabled: true
                })
                .select('id, title, time, duration_minutes, days_of_week, enabled')
                .single();

            if (error) throw error;

            return { success: true, automation };
        } catch {
            return focusActionFailure('create automation', 'Could not create that routine right now.');
        }
    },

    deleteAutomation: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const automationId = data.get('automationId')?.toString();

        if (!automationId) return { success: false, error: 'Missing automation ID' };

        try {
            const { count, error } = await supabase
                .from('focus_automations')
                .delete({ count: 'exact' })
                .eq('id', automationId)
                .eq('user_id', user.id);

            if (error) throw error;
            if (!count || count === 0) return { success: false, error: 'Automation not found or insufficient permissions' };

            return { success: true };
        } catch {
            return focusActionFailure('delete automation', 'Could not remove that routine right now.');
        }
    },

    updateSession: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const title = sanitizeFocusTitle(data.get('title')?.toString());
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!sessionId || !title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        const focusWindow = parseFocusWindow(date, time, duration);
        if ('error' in focusWindow) {
            return { success: false, error: focusWindow.error };
        }
        const { startTime, endTime } = focusWindow;

        try {
            const { data: updatedSession, error } = await supabase
                .from('blocking_sessions')
                .update({
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString()
                })
                .eq('id', sessionId)
                .eq('user_id', user.id)
                .select('id, title, start_time, end_time, is_active, device_scheduled')
                .single();

            if (error) throw error;

            // Send push notification to device
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', user.id)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(supabase, user.id, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Session Updated',
                        body: `Focus protection updated for ${startTime.toLocaleTimeString()}`,
                        data: { type: 'sync_blocking' }
                    });
            }

            return { success: true, session: updatedSession };
        } catch {
            return focusActionFailure('update session', 'Could not update protection right now.');
        }
    },

    makeRecurring: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const sessionId = data.get('sessionId')?.toString();
        const daysOfWeek = data.get('daysOfWeek')?.toString() || '';

        if (!sessionId || !daysOfWeek) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            // Fetch the session to get its details
            const { data: blockingSession, error: fetchError } = await supabase
                .from('blocking_sessions')
                .select('title, start_time, end_time')
                .eq('id', sessionId)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !blockingSession) throw fetchError || new Error('Session not found');
            const safeTitle = sanitizeFocusTitle(blockingSession.title) || 'Focus session';

            // Extract time from start_time
            const startDate = new Date(blockingSession.start_time);
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            // Calculate duration in minutes
            const durationMinutes = Math.round(
                (new Date(blockingSession.end_time).getTime() - new Date(blockingSession.start_time).getTime()) / 60000
            );

            // Create automation
            const { data: automation, error } = await supabase
                .from('focus_automations')
                .insert({
                    user_id: user.id,
                    title: safeTitle,
                    time: timeStr,
                    duration_minutes: durationMinutes,
                    days_of_week: daysOfWeek,
                    enabled: true
                })
                .select('id, title, time, duration_minutes, days_of_week, enabled')
                .single();

            if (error) throw error;

            // Expand automation into blocking_sessions for next 7 days
            const now = new Date();
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const dayMap: { [key: string]: number } = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
                'Friday': 5, 'Saturday': 6, 'Sunday': 0
            };

            const targetDays = daysOfWeek
                .split(',')
                .map((day: string) => dayMap[day.trim()])
                .filter((d: number) => d !== undefined);

            const sessionsToCreate: any[] = [];
            let currentDate = new Date(now);
            currentDate.setHours(0, 0, 0, 0);

            while (currentDate <= sevenDaysLater) {
                const dayOfWeek = currentDate.getDay();

                if (targetDays.includes(dayOfWeek)) {
                    const startTime = new Date(currentDate);
                    const [h, m] = timeStr.split(':').map(Number);
                    startTime.setHours(h, m, 0, 0);

                    if (startTime > now && sessionsToCreate.length < MAX_FOCUS_PAGE_EXPANSIONS) {
                        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
                        sessionsToCreate.push({
                            user_id: user.id,
                            title: safeTitle,
                            start_time: startTime.toISOString(),
                            end_time: endTime.toISOString(),
                            is_active: true,
                            device_scheduled: false
                        });
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (sessionsToCreate.length > 0) {
                await supabase.from('blocking_sessions').insert(sessionsToCreate);
            }

            // Send push notification to device
            const { data: tokens } = await supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', user.id)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(supabase, user.id, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Routine Created',
                        body: `Focus protection will repeat on ${daysOfWeek.split(',').map(d => d.trim().slice(0, 3)).join(', ')}`,
                        data: { type: 'sync_blocking' }
                    });
            }

            return { success: true, automation };
        } catch {
            return focusActionFailure('create recurring session', 'Could not make that session recurring right now.');
        }
    },

    inviteFriendToFocus: async ({ request, locals: { getAuthenticatedSupabase, getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const supabase = await getAuthenticatedSupabase();

        const data = await request.formData();
        const collaboratorId = data.get('collaboratorId')?.toString();
        const title = sanitizeFocusTitle(data.get('title')?.toString());
        const date = data.get('date')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '30');

        if (!collaboratorId || !title || !date || !time) {
            return { success: false, error: 'Missing required fields' };
        }

        try {
            // Verify friendship exists
            const { data: friendship, error: friendError } = await supabase
                .from('friendships')
                .select('id')
                .or(`and(requester_id.eq.${user.id},addressee_id.eq.${collaboratorId}),and(requester_id.eq.${collaboratorId},addressee_id.eq.${user.id})`)
                .eq('status', 'accepted')
                .single();

            if (friendError || !friendship) {
                return { success: false, error: 'Friendship not found or not accepted' };
            }

            // Create shared focus session
            const focusWindow = parseFocusWindow(date, time, duration);
            if ('error' in focusWindow) {
                return { success: false, error: focusWindow.error };
            }
            const { startTime, endTime } = focusWindow;

            const { data: sharedSession, error } = await adminClient
                .from('shared_focus_sessions')
                .insert({
                    initiator_id: user.id,
                    collaborator_id: collaboratorId,
                    title: title,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'pending'
                })
                .select('id, title, start_time, end_time, status, collaborator_id')
                .single();

            if (error) throw error;

            // Send push notification to collaborator
            const { data: tokens } = await adminClient
                .from('device_tokens')
                .select('token')
                .eq('user_id', collaboratorId)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(supabase, collaboratorId, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Session Invite',
                        body: `A friend invited you to focus at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        data: { type: 'focus_invite' }
                    });
            }

            return { success: true, session: sharedSession };
        } catch {
            return focusActionFailure('invite friend to focus', 'Could not send that focus invite right now.');
        }
    },

    acceptSharedFocus: async ({ request, locals: { getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch shared session
            const { data: sharedSession, error: fetchError } = await adminClient
                .from('shared_focus_sessions')
                .select('id, initiator_id, collaborator_id, title, start_time, end_time, status')
                .eq('id', sharedSessionId)
                .eq('collaborator_id', user.id)
                .single();

            if (fetchError || !sharedSession) throw fetchError || new Error('Session not found');
            const safeTitle = sanitizeFocusTitle(sharedSession.title) || 'Focus session';

            if (sharedSession.status !== 'pending') {
                return { success: false, error: 'This focus invite is no longer pending.' };
            }

            // Create blocking sessions for both users
            const { data: initiatorSession, error: initiatorError } = await adminClient
                .from('blocking_sessions')
                .insert({
                    user_id: sharedSession.initiator_id,
                    title: safeTitle,
                    start_time: sharedSession.start_time,
                    end_time: sharedSession.end_time,
                    is_active: true,
                    device_scheduled: false
                })
                .select('id, start_time, end_time')
                .single();

            if (initiatorError) throw initiatorError;

            const { data: collaboratorSession, error: collaboratorError } = await adminClient
                .from('blocking_sessions')
                .insert({
                    user_id: sharedSession.collaborator_id,
                    title: safeTitle,
                    start_time: sharedSession.start_time,
                    end_time: sharedSession.end_time,
                    is_active: true,
                    device_scheduled: false
                })
                .select('id, start_time, end_time')
                .single();

            if (collaboratorError) {
                await adminClient
                    .from('blocking_sessions')
                    .delete()
                    .eq('id', initiatorSession.id)
                    .eq('user_id', sharedSession.initiator_id);
                throw collaboratorError;
            }

            // Update shared session with session IDs and status
            const { data: claimedSession, error: updateError } = await adminClient
                .from('shared_focus_sessions')
                .update({
                    status: 'scheduled',
                    initiator_blocking_session_id: initiatorSession.id,
                    collaborator_blocking_session_id: collaboratorSession.id
                })
                .eq('id', sharedSessionId)
                .eq('collaborator_id', user.id)
                .eq('status', 'pending')
                .select('id')
                .maybeSingle();

            if (updateError || !claimedSession) {
                await Promise.all([
                    adminClient
                        .from('blocking_sessions')
                        .delete()
                        .eq('id', initiatorSession.id)
                        .eq('user_id', sharedSession.initiator_id),
                    adminClient
                        .from('blocking_sessions')
                        .delete()
                        .eq('id', collaboratorSession.id)
                        .eq('user_id', sharedSession.collaborator_id)
                ]);

                if (updateError) throw updateError;
                return { success: false, error: 'This focus invite is no longer pending.' };
            }

            // Send push notification to initiator
            const { data: initiatorTokens } = await adminClient
                .from('device_tokens')
                .select('token')
                .eq('user_id', sharedSession.initiator_id)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (initiatorTokens && initiatorTokens.length > 0) {
                await sendIOSPushesWithCleanup(adminClient, sharedSession.initiator_id, initiatorTokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Session Accepted',
                        body: `Your friend accepted the focus session at ${new Date(sharedSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        data: { type: 'focus_accepted' }
                    });
            }

            await Promise.all([
                sendBlockingSyncPush(sharedSession.initiator_id, initiatorSession),
                sendBlockingSyncPush(sharedSession.collaborator_id, collaboratorSession)
            ]);

            return { success: true };
        } catch {
            return focusActionFailure('accept shared focus', 'Could not accept that shared focus right now.');
        }
    },

    declineSharedFocus: async ({ request, locals: { getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            const { data: sharedSession } = await adminClient
                .from('shared_focus_sessions')
                .select('collaborator_id')
                .eq('id', sharedSessionId)
                .single();

            if (sharedSession?.collaborator_id !== user.id) {
                return { success: false, error: 'Unauthorized' };
            }

            const { error } = await adminClient
                .from('shared_focus_sessions')
                .update({ status: 'declined' })
                .eq('id', sharedSessionId)
                .eq('collaborator_id', user.id)
                .eq('status', 'pending');

            if (error) throw error;

            return { success: true };
        } catch {
            return focusActionFailure('decline shared focus', 'Could not decline that invite right now.');
        }
    },

    completeSharedFocus: async ({ request, locals: { getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch current shared session
            const { data: sharedSession } = await adminClient
                .from('shared_focus_sessions')
                .select('id, initiator_id, collaborator_id, status, initiator_completed, collaborator_completed')
                .eq('id', sharedSessionId)
                .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`)
                .single();

            if (!sharedSession) throw new Error('Session not found');

            const isInitiator = user.id === sharedSession.initiator_id;
            if (!isInitiator && user.id !== sharedSession.collaborator_id) {
                return { success: false, error: 'Unauthorized' };
            }

            // Update completion status
            const updateData = isInitiator
                ? { initiator_completed: true }
                : { collaborator_completed: true };

            if (sharedSession.status !== 'scheduled') {
                return { success: false, error: 'This shared focus is not active anymore.' };
            }

            const { data: updatedSession, error: updateError } = await adminClient
                .from('shared_focus_sessions')
                .update(updateData)
                .eq('id', sharedSessionId)
                .eq('initiator_id', sharedSession.initiator_id)
                .eq('collaborator_id', sharedSession.collaborator_id)
                .eq('status', 'scheduled')
                .select('initiator_completed, collaborator_completed')
                .maybeSingle();

            if (updateError) throw updateError;
            if (!updatedSession) {
                return { success: false, error: 'This shared focus is not active anymore.' };
            }

            // Check if both completed
            const bothCompleted = (isInitiator ? true : updatedSession.initiator_completed) &&
                                 (!isInitiator ? true : updatedSession.collaborator_completed);

            if (bothCompleted) {
                // Update status and award stones to both users
                const { count: completedCount, error: statusError } = await adminClient
                    .from('shared_focus_sessions')
                    .update({ status: 'completed' }, { count: 'exact' })
                    .eq('id', sharedSessionId)
                    .eq('initiator_id', sharedSession.initiator_id)
                    .eq('collaborator_id', sharedSession.collaborator_id)
                    .eq('status', 'scheduled');

                if (statusError) throw statusError;
                if (!completedCount) return { success: true, bothCompleted: true };

                // Award +5 stones to initiator
                const { data: initiatorProfile } = await adminClient
                    .from('profiles')
                    .select('total_stones')
                    .eq('id', sharedSession.initiator_id)
                    .single();

                if (initiatorProfile) {
                    await adminClient
                        .from('profiles')
                        .update({ total_stones: (initiatorProfile.total_stones || 0) + 5 })
                        .eq('id', sharedSession.initiator_id);
                }

                // Award +5 stones to collaborator
                const { data: collaboratorProfile } = await adminClient
                    .from('profiles')
                    .select('total_stones')
                    .eq('id', sharedSession.collaborator_id)
                    .single();

                if (collaboratorProfile) {
                    await adminClient
                        .from('profiles')
                        .update({ total_stones: (collaboratorProfile.total_stones || 0) + 5 })
                        .eq('id', sharedSession.collaborator_id);
                }
            }

            return { success: true, bothCompleted };
        } catch {
            return focusActionFailure('complete shared focus', 'Could not complete that shared focus right now.');
        }
    },

    cancelSharedFocus: async ({ request, locals: { getUser } }) => {
        const user = await getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const sharedSessionId = data.get('sharedSessionId')?.toString();

        if (!sharedSessionId) {
            return { success: false, error: 'Missing session ID' };
        }

        try {
            // Fetch shared session
            const { data: sharedSession, error: fetchError } = await adminClient
                .from('shared_focus_sessions')
                .select('initiator_id, collaborator_id, initiator_blocking_session_id, collaborator_blocking_session_id')
                .eq('id', sharedSessionId)
                .or(`initiator_id.eq.${user.id},collaborator_id.eq.${user.id}`)
                .single();

            if (fetchError || !sharedSession) throw fetchError || new Error('Session not found');

            if (user.id !== sharedSession.initiator_id && user.id !== sharedSession.collaborator_id) {
                return { success: false, error: 'Unauthorized' };
            }

            // Claim cancellation before deleting either participant's blocking session.
            const { data: canceledSession, error: updateError } = await adminClient
                .from('shared_focus_sessions')
                .update({ status: 'canceled' })
                .eq('id', sharedSessionId)
                .eq('initiator_id', sharedSession.initiator_id)
                .eq('collaborator_id', sharedSession.collaborator_id)
                .in('status', ['pending', 'scheduled'])
                .select('id')
                .maybeSingle();

            if (updateError) throw updateError;
            if (!canceledSession) {
                return { success: false, error: 'This shared focus is not active anymore.' };
            }

            // Delete blocking sessions
            if (sharedSession.initiator_blocking_session_id) {
                await adminClient
                    .from('blocking_sessions')
                    .delete()
                    .eq('id', sharedSession.initiator_blocking_session_id)
                    .eq('user_id', sharedSession.initiator_id);
            }

            if (sharedSession.collaborator_blocking_session_id) {
                await adminClient
                    .from('blocking_sessions')
                    .delete()
                    .eq('id', sharedSession.collaborator_blocking_session_id)
                    .eq('user_id', sharedSession.collaborator_id);
            }

            // Notify other participant
            const otherUserId = user.id === sharedSession.initiator_id
                ? sharedSession.collaborator_id
                : sharedSession.initiator_id;

            const { data: tokens } = await adminClient
                .from('device_tokens')
                .select('token')
                .eq('user_id', otherUserId)
                .eq('device_type', 'ios')
                .eq('is_active', true)
                .limit(MAX_FOCUS_PAGE_PUSH_TOKENS + 1);

            if (tokens && tokens.length > 0) {
                await sendIOSPushesWithCleanup(adminClient, otherUserId, tokens.slice(0, MAX_FOCUS_PAGE_PUSH_TOKENS), {
                        title: 'Focus Session Canceled',
                        body: 'A shared focus session was canceled.',
                        data: { type: 'focus_canceled' }
                    });
            }

            await Promise.all([
                sendBlockingSyncPush(sharedSession.initiator_id),
                sendBlockingSyncPush(sharedSession.collaborator_id)
            ]);

            return { success: true };
        } catch {
            return focusActionFailure('cancel shared focus', 'Could not cancel that shared focus right now.');
        }
    },

    refresh: async ({ locals: { getUser } }) => {
        // This action is called by the client to refresh data
        // SvelteKit will automatically invalidate the page data
        const user = await getUser();
        if (!user) return { success: false };
        return { success: true };
    }
};
