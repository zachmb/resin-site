/**
 * Utility to send push notifications to iOS devices when focus session starts
 */

const FOCUS_NOTIFICATION_TIMEOUT_MS = 8000;

export async function notifyFocusSessionStart(options: {
    sessionId: string;
    startTime: Date;
    endTime: Date;
    groupId?: string;
}): Promise<{ success: boolean; notificationsSent: number }> {
    try {
        const response = await fetch('/api/notifications/send-focus-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: options.sessionId,
                groupId: options.groupId
            }),
            signal: AbortSignal.timeout(FOCUS_NOTIFICATION_TIMEOUT_MS)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('[Focus Notifier] Device wake requested');
            return {
                success: true,
                notificationsSent: data.notificationsSent
            };
        }

        throw new Error('Failed to send notifications');
    } catch {
        console.error('[Focus Notifier] Error sending notifications');
        return {
            success: false,
            notificationsSent: 0
        };
    }
}

/**
 * Call this function when a user starts a focus session from the web
 * It will trigger silent push notifications to all their iOS devices
 */
export async function onFocusSessionStart(sessionData: {
    sessionId: string;
    startTime: Date;
    endTime: Date;
    groupId?: string;
}): Promise<void> {
    // Send push notification to iOS devices
    const result = await notifyFocusSessionStart({
        sessionId: sessionData.sessionId,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        groupId: sessionData.groupId
    });

    if (result.success) {
        console.log('[Focus Session] Started and requested iOS device wake');
    } else {
        console.warn('[Focus Session] Could not notify iOS devices (they may not have the app installed)');
    }
}
