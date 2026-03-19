/**
 * @resin/core - Shared core business logic
 *
 * Exports:
 * - Gamification functions (pure + database-agnostic)
 * - Focus scheduling logic
 * - Domain blocking rules
 * - Push notification helpers
 */

// Re-export all gamification functions explicitly for better tooling support
export {
  calculateSessionReward,
  detectEngagementBonuses,
  calculateNewStreak,
  calculateTotalReward,
  calculateNewForestHealth,
  calculateForestDecay,
  getForestHealthStatus,
  dateStringInTimeZone,
  calculateLongestStreakFromDates,
  shouldStreakAdvance,
  applySessionRewardWithDatabase,
  type RewardOutcome,
  type EngagementBonus,
  type UserGameState,
  type DatabaseAdapter
} from './gamification';
export { default } from './gamification';
