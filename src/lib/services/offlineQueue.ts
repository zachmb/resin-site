const QUEUE_KEY = 'resin_offline_queue';

export interface QueuedAction {
    id: string;
    url: string;
    formData: Record<string, string>;
    timestamp: number;
}

/**
 * Add an action to the offline queue
 */
export function enqueue(url: string, formData: Record<string, string>) {
    const queue = getQueue();
    queue.push({
        id: crypto.randomUUID(),
        url,
        formData,
        timestamp: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[offline_queue] Queued action: ${url}`);
}

/**
 * Get all queued actions
 */
export function getQueue(): QueuedAction[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Remove a queued action by ID
 */
export function dequeue(id: string) {
    const queue = getQueue().filter(a => a.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[offline_queue] Dequeued action: ${id}`);
}

/**
 * Clear all queued actions
 */
export function clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
    console.log(`[offline_queue] Cleared all queued actions`);
}

/**
 * Flush all queued actions and retry failed ones
 */
export async function flushQueue() {
    const queue = getQueue();
    if (queue.length === 0) return;

    console.log(`[offline_queue] Flushing ${queue.length} queued action(s)...`);

    for (const action of queue) {
        try {
            const fd = new FormData();
            for (const [k, v] of Object.entries(action.formData)) {
                fd.append(k, v);
            }

            const res = await fetch(action.url, {
                method: 'POST',
                body: fd
            });

            if (res.ok) {
                dequeue(action.id);
                console.log(`[offline_queue] ✅ Successfully synced: ${action.url}`);
            } else {
                console.log(`[offline_queue] ⚠️ Failed to sync: ${action.url} (${res.status})`);
            }
        } catch (error) {
            console.log(`[offline_queue] ⚠️ Network error syncing: ${action.url}`, error);
        }
    }
}
