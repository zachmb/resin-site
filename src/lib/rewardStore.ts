import { writable } from 'svelte/store';

interface RewardEvent {
	timestamp: number;
}

export const rewardTriggered = writable<RewardEvent | null>(null);

export function triggerReward() {
	rewardTriggered.set({ timestamp: Date.now() });
	// Auto-clear after 5 seconds
	setTimeout(() => {
		rewardTriggered.set(null);
	}, 5000);
}
