/**
 * Utility to send push notifications to iOS devices when focus session starts
 */

export async function notifyFocusSessionStart(options: {
    userId: string;
    sessionId: string;
    sessionTitle: string;
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
                userId: options.userId,
                sessionId: options.sessionId,
                sessionTitle: options.sessionTitle,
                endTime: options.endTime.toISOString(),
                groupId: options.groupId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(
                `[Focus Notifier] Sent focus session notifications to ${data.notificationsSent} devices`
            );
            return {
                success: true,
                notificationsSent: data.notificationsSent
            };
        }

        throw new Error(data.error || 'Failed to send notifications');
    } catch (error) {
        console.error('[Focus Notifier] Error sending notifications:', error);
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
    title: string;
    startTime: Date;
    endTime: Date;
    userId: string;
    groupId?: string;
}): Promise<void> {
    // Send push notification to iOS devices
    const result = await notifyFocusSessionStart({
        userId: sessionData.userId,
        sessionId: sessionData.sessionId,
        sessionTitle: sessionData.title || 'Focus Session',
        endTime: sessionData.endTime,
        groupId: sessionData.groupId
    });

    if (result.success) {
        console.log(
            `[Focus Session] Started "${sessionData.title}" and notified ${result.notificationsSent} iOS devices`
        );
    } else {
        console.warn('[Focus Session] Could not notify iOS devices (they may not have the app installed)');
    }
}
