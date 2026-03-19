/**
 * Core gamification logic — database agnostic
 *
 * These functions contain pure business logic for calculating rewards, streaks, and achievements.
 * They don't directly access the database; instead, they work with data passed in.
 *
 * Web (resinsite) will fetch data from Supabase and pass it to these functions.
 * iOS will call Web API endpoints that use these functions.
 */

import type { UserProfile, EnergyDemand } from '../contracts';

// ============================================================================
// TYPES
// ============================================================================

export interface RewardOutcome {
  baseStones: number;
  bonusStones: number;
  totalStones: number;
  forestHealthGain: number;
  isBonusTriggered: boolean;
  celebrationLevel: 'standard' | 'bonus' | 'rare';
  message: string;
}

export interface EngagementBonus {
  type: 'daily_first' | 'streak_milestone' | 'weekly_challenge' | 'consistency' | 'long_session';
  stones: number;
  healthGain: number;
  message: string;
}

export interface UserGameState {
  totalStones: number;
  currentStreak: number;
  longestStreak: number;
  longestStreakAt: string | null;
  forestHealth: number;
  lastSessionDate: Date | null;
  lastActiveDate: Date | null;
  timezone: string;
  sesionsCompletedCount: number;
}

// ============================================================================
// PURE FUNCTIONS - No database access
// ============================================================================

/**
 * Calculate session reward based on history and randomness
 * Pure function — no side effects
 */
export function calculateSessionReward(
  currentStreak: number,
  _seed: number = Math.random() // For testing
): RewardOutcome {
  const baseStones = 5; // Base award for completion
  const bonusChance = 0.2 + Math.min(currentStreak, 10) * 0.01;
  const triggerBonus = _seed < bonusChance;

  const bonusStones = triggerBonus ? Math.floor(_seed * 100 % 4) + 2 : 0;
  const totalStones = baseStones + bonusStones;
  const forestHealthGain = triggerBonus ? Math.floor(_seed * 100 % 8) + 5 : 3;

  let celebrationLevel: 'standard' | 'bonus' | 'rare' = 'standard';
  let message = `Great focus session! +${baseStones} stones earned.`;

  if (bonusStones >= 4) {
    celebrationLevel = 'rare';
    message = `🎉 RARE BONUS! You've earned ${totalStones} stones! Your forest flourishes!`;
  } else if (bonusStones > 0) {
    celebrationLevel = 'bonus';
    message = `✨ Bonus! You earned +${bonusStones} extra stones! Total: +${totalStones} stones`;
  }

  return {
    baseStones,
    bonusStones,
    totalStones,
    forestHealthGain,
    isBonusTriggered: triggerBonus,
    celebrationLevel,
    message
  };
}

/**
 * Detect engagement bonuses based on user state
 * Pure function
 */
export function detectEngagementBonuses(
  newStreak: number,
  lastSessionDate: Date | null,
  now: Date = new Date()
): EngagementBonus[] {
  const bonuses: EngagementBonus[] = [];

  // Daily first bonus
  const isFirstOfDay = !lastSessionDate ||
    now.getTime() - lastSessionDate.getTime() > 18 * 60 * 60 * 1000;

  if (isFirstOfDay) {
    bonuses.push({
      type: 'daily_first',
      stones: 1,
      healthGain: 2,
      message: '🌅 Daily First! Consistency matters.'
    });
  }

  // Milestone bonuses
  if (newStreak > 1 && newStreak % 5 === 0) {
    const milestoneBonus = Math.floor(newStreak / 5) * 2;
    bonuses.push({
      type: 'streak_milestone',
      stones: milestoneBonus,
      healthGain: 5,
      message: `🔥 ${newStreak}-Day Streak! +${milestoneBonus} stones`
    });
  }

  // Weekly challenge
  if ([7, 14, 21, 30].includes(newStreak)) {
    bonuses.push({
      type: 'weekly_challenge',
      stones: 3 + newStreak / 7,
      healthGain: 8,
      message: `🏆 ${newStreak}-Day Milestone! Your forest celebrates!`
    });
  }

  // Consistency bonus
  if (newStreak >= 3 && newStreak % 3 === 0) {
    bonuses.push({
      type: 'consistency',
      stones: 1,
      healthGain: 3,
      message: '⭐ Consistency unlocked! Keep the rhythm.'
    });
  }

  return bonuses;
}

/**
 * Calculate new streak based on last session date
 * Pure function
 */
export function calculateNewStreak(
  lastSessionDate: Date | null,
  currentStreak: number,
  now: Date = new Date()
): number {
  if (!lastSessionDate) return 1;

  const hoursSinceLastSession = (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60);

  // Reset if more than 24 hours
  if (hoursSinceLastSession > 24) return 1;

  return currentStreak + 1;
}

/**
 * Calculate total reward (base + bonuses)
 * Pure function
 */
export function calculateTotalReward(
  reward: RewardOutcome,
  bonuses: EngagementBonus[]
): { totalStones: number; totalHealthGain: number } {
  let totalStones = reward.totalStones;
  let totalHealthGain = reward.forestHealthGain;

  for (const bonus of bonuses) {
    totalStones += bonus.stones;
    totalHealthGain += bonus.healthGain;
  }

  return { totalStones, totalHealthGain };
}

/**
 * Calculate new forest health (capped at 100)
 * Pure function
 */
export function calculateNewForestHealth(
  currentHealth: number,
  gainAmount: number
): number {
  return Math.min(100, currentHealth + gainAmount);
}

/**
 * Calculate new forest health after decay/loss
 * Pure function
 */
export function calculateForestDecay(
  currentHealth: number,
  stakeAmount: number = 0,
  _seed: number = Math.random()
): { newHealth: number; stonePenalty: number } {
  const decayAmount = Math.floor(_seed * 100 % 10) + 10; // 10-20%
  const stonePenalty = Math.min(stakeAmount, Math.floor(stakeAmount * 0.5));

  return {
    newHealth: Math.max(0, currentHealth - decayAmount),
    stonePenalty
  };
}

/**
 * Get forest health status with messaging
 * Pure function
 */
export function getForestHealthStatus(forestHealth: number): {
  level: 'thriving' | 'healthy' | 'struggling' | 'dying';
  percentage: number;
  message: string;
  color: string;
} {
  if (forestHealth >= 80) {
    return {
      level: 'thriving',
      percentage: forestHealth,
      message: '🌳 Your forest is thriving! Keep up the focus.',
      color: '#22c55e'
    };
  } else if (forestHealth >= 60) {
    return {
      level: 'healthy',
      percentage: forestHealth,
      message: '🌲 Your forest is healthy. Continue your ritual.',
      color: '#84cc16'
    };
  } else if (forestHealth >= 30) {
    return {
      level: 'struggling',
      percentage: forestHealth,
      message: '⚠️ Your forest is struggling. A focus session will help it recover.',
      color: '#f97316'
    };
  } else {
    return {
      level: 'dying',
      percentage: forestHealth,
      message: '🪨 Your forest is turning to stone. Focus now to save it!',
      color: '#ef4444'
    };
  }
}

/**
 * Helper: format date in user's timezone
 * Pure function
 */
export function dateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  return parts;
}

/**
 * Calculate longest streak from session history
 * Pure function
 */
export function calculateLongestStreakFromDates(
  sessionDates: string[],
  timeZone: string = 'UTC'
): { longestStreak: number; longestStreakAt: string | null } {
  if (sessionDates.length === 0) {
    return { longestStreak: 0, longestStreakAt: null };
  }

  const uniqueDates = Array.from(new Set(sessionDates)).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let longestStreakAt: string | null = null;
  let lastDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr);

    if (lastDate) {
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      longestStreakAt = dateStr;
    }

    lastDate = currentDate;
  }

  return { longestStreak, longestStreakAt };
}

/**
 * Calculate whether streak should advance (based on last active date)
 * Pure function
 */
export function shouldStreakAdvance(
  lastActiveStr: string | null,
  todayStr: string
): boolean {
  if (!lastActiveStr) return true;
  if (lastActiveStr === todayStr) return false; // Already recorded today

  // Check if yesterday
  const today = new Date(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = dateStringInTimeZone(yesterday, 'UTC');

  return lastActiveStr === yesterdayStr;
}

// ============================================================================
// DATABASE INTEGRATION - Supabase specific (used by Web)
// ============================================================================

export interface DatabaseAdapter {
  fetchUserProfile(userId: string): Promise<UserGameState | null>;
  fetchSessionCount(userId: string): Promise<number>;
  fetchSessionDates(userId: string): Promise<string[]>;
  updateProfile(userId: string, updates: Partial<UserGameState>): Promise<void>;
  updateSession(sessionId: string, updates: any): Promise<void>;
  insertAchievement(userId: string, achievementId: string): Promise<void>;
  insertForestEvent(userId: string, eventType: string, amount: number, sessionId?: string): Promise<void>;
}

/**
 * Full reward application flow (database-aware)
 * This orchestrates all the pure functions with database calls
 */
export async function applySessionRewardWithDatabase(
  userId: string,
  sessionId: string,
  db: DatabaseAdapter
): Promise<{ totalStones: number; totalHealthGain: number; message: string }> {
  // Fetch user state
  const state = await db.fetchUserProfile(userId);
  if (!state) throw new Error('User profile not found');

  // Calculate new streak
  const newStreak = calculateNewStreak(state.lastSessionDate, state.currentStreak);

  // Calculate reward
  const reward = calculateSessionReward(newStreak);

  // Detect bonuses
  const bonuses = detectEngagementBonuses(newStreak, state.lastSessionDate);

  // Calculate totals
  const { totalStones, totalHealthGain } = calculateTotalReward(reward, bonuses);

  // Calculate new forest health
  const newForestHealth = calculateNewForestHealth(state.forestHealth, totalHealthGain);

  // Update profile
  await db.updateProfile(userId, {
    currentStreak: newStreak,
    forestHealth: newForestHealth,
    lastSessionDate: new Date(),
    lastActiveDate: new Date()
  });

  // Update session with reward
  await db.updateSession(sessionId, {
    bonus_stones_awarded: reward.bonusStones,
    was_celebrated: true
  });

  // Insert forest event
  await db.insertForestEvent(
    userId,
    reward.isBonusTriggered ? 'forest_flourished' : 'tree_grown',
    reward.forestHealthGain,
    sessionId
  );

  return {
    totalStones: state.totalStones + totalStones,
    totalHealthGain,
    message: reward.message
  };
}

export default {
  calculateSessionReward,
  detectEngagementBonuses,
  calculateNewStreak,
  calculateTotalReward,
  calculateNewForestHealth,
  calculateForestDecay,
  getForestHealthStatus,
  dateStringInTimeZone,
  calculateLongestStreakFromDates,
  shouldStreakAdvance
};
