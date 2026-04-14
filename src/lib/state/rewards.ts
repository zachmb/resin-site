import { writable } from 'svelte/store';

export interface BonusLineItem {
    label: string;
    stones: number;
    healthGain: number;
    emoji: string;
}

export interface RewardEvent {
    timestamp: number;
    baseStones: number;
    bonusStones: number;
    totalStones: number;
    forestHealthGain: number;
    bonusBreakdown: BonusLineItem[];
    newAchievements: string[];
    celebrationLevel: 'standard' | 'bonus' | 'rare';
    message: string;
}

export const rewardTriggered = writable<RewardEvent | null>(null);

export function triggerReward(event: RewardEvent) {
    rewardTriggered.set(event);
    // Auto-clear after 8 seconds (longer for richer display)
    setTimeout(() => {
        rewardTriggered.set(null);
    }, 8000);
}
