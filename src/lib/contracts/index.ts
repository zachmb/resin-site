/**
 * Resin Contracts - Shared TypeScript interfaces for Web, iOS, and Extension
 * Single source of truth for data models and API contracts
 */

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type SessionStatus = 'draft' | 'accepted' | 'scheduled' | 'completed' | 'failed' | 'canceled';
export type EnergyDemand = 'low' | 'medium' | 'high';
export type Chronotype = 'morning_person' | 'night_owl' | 'neutral';
export type ConnectionType = 'relates_to' | 'blocks' | 'supports' | 'depends_on' | 'references' | 'contradicts';

export enum TreeSpecies {
  Amber = 'amber',
  Stone = 'stone',
  Oak = 'oak',
  Pine = 'pine',
  Sprout = 'sprout',
  Cherry = 'cherry',
  Maple = 'maple',
  Birch = 'birch',
  Willow = 'willow',
  Jasmine = 'jasmine',
  Lavender = 'lavender',
  Redwood = 'redwood',
  Bamboo = 'bamboo',
  Palm = 'palm',
  Baobab = 'baobab',
  Sunflower = 'sunflower',
  Iris = 'iris',
  Sakura = 'sakura',
  Cypress = 'cypress',
  Moonlight = 'moonlight',
  Starry = 'starry',
  Aurora = 'aurora',
  Ancient = 'ancient',
  Crystalline = 'crystalline',
  Phoenix = 'phoenix',
  Eternal = 'eternal',
  RockStack = 'rockStack'
}

// ============================================================================
// CORE DATA MODELS
// ============================================================================

/**
 * User profile — represents a Resin user
 */
export interface UserProfile {
  id: string; // UUID
  email: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601

  // Gamification
  total_stones: number;
  current_streak: number;
  longest_streak: number;
  longest_streak_at?: string; // ISO8601

  // Preferences
  timezone: string;
  chronotype?: Chronotype;
  focus_success_rate?: number; // 0-1

  // Feature flags
  hardened_mode_enabled: boolean;
  widget_enabled: boolean;

  // Blocking
  blocked_domains: string[];

  // Profile metadata
  preferred_name?: string;
  avatar_url?: string;
}

/**
 * Amber Session — a user's activated brain dump/plan
 */
export interface AmberSession {
  id: string; // UUID
  user_id: string; // UUID
  raw_text: string; // Original brain dump
  display_title: string;
  status: SessionStatus;
  intensity: number; // 0-1
  energy_demand: EnergyDemand;

  // Timestamps
  created_at: string; // ISO8601
  scheduled_at?: string; // ISO8601
  completed_at?: string; // ISO8601

  // Metadata
  scheduling_error?: string;
  notes?: string;
}

/**
 * Amber Task — individual task within a session
 */
export interface AmberTask {
  id: string; // UUID
  session_id: string; // UUID
  title: string;
  description: string;
  estimated_minutes: number;
  sequence_order: number;

  // Scheduling
  calendar_event_id?: string;
  start_time?: string; // ISO8601
  end_time?: string; // ISO8601

  // Execution tracking
  actual_start_time?: string; // ISO8601
  actual_end_time?: string; // ISO8601
  is_completed?: boolean;

  // AI metadata
  session_type?: 'focus' | 'deep_work' | 'creative' | 'break' | 'standard';
  energy_demand?: EnergyDemand;
  energy_match_score?: number;

  // Verification
  requires_focus: boolean;
  requires_camera_verification: boolean;
  is_verified: boolean;

  // Reflection
  reflection?: string;
  estimate_accuracy?: 'much_shorter' | 'spot_on' | 'way_longer';
}

/**
 * Blocking Session — focus/blocking window
 */
export interface BlockingSession {
  id: string; // UUID
  user_id: string; // UUID
  start_time: string; // ISO8601
  end_time: string; // ISO8601

  // What to block
  blocked_domains: string[];
  blocked_apps?: string[]; // iOS app names/bundle IDs
  allow_emergency_only: boolean;

  // Status
  is_active: boolean;
  device_scheduled: boolean; // Has been scheduled on device

  // Metadata
  created_at: string; // ISO8601
  created_by?: string; // 'user' | 'automation' | 'admin'
}

/**
 * Focus Automation — recurring focus rules
 */
export interface FocusAutomation {
  id: string; // UUID
  user_id: string; // UUID

  // Recurrence
  days_of_week: number[]; // 0-6 (Sunday-Saturday)
  start_hour: number; // 0-23
  duration_minutes: number;

  // Content
  blocked_domains: string[];
  blocked_apps?: string[];

  // Status
  is_active: boolean;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

/**
 * Saved Note
 */
export interface SavedNote {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  content: string;
  tags: string[];
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  pinned: boolean;
}

/**
 * Note Connection — relationship between notes
 */
export interface NoteConnection {
  id: string; // UUID
  from_note_id: string; // UUID
  to_note_id: string; // UUID
  connection_type: ConnectionType;
  created_at: string; // ISO8601
}

/**
 * Device Token — for push notifications
 */
export interface DeviceToken {
  id: string; // UUID
  user_id: string; // UUID
  token: string; // APNs token
  platform: 'ios' | 'web';
  device_name?: string;
  created_at: string; // ISO8601
  last_seen: string; // ISO8601
}

/**
 * Daily Activity — for streak tracking
 */
export interface DailyActivity {
  id: string; // UUID
  user_id: string; // UUID
  date: string; // YYYY-MM-DD
  has_completed_session: boolean;
  sessions_count: number;
  total_minutes: number;
}

/**
 * User Achievement
 */
export interface UserAchievement {
  id: string; // UUID
  user_id: string; // UUID
  achievement_id: string;
  unlocked_at: string; // ISO8601
}

// ============================================================================
// API REQUEST/RESPONSE CONTRACTS
// ============================================================================

/**
 * POST /api/activate - Trigger plan scheduling
 */
export interface ActivateRequest {
  session_id: string; // UUID
  raw_text: string;
  intensity: number;
  start_hour: number;
  end_hour: number;
  user_preferences: string; // JSON string
  timezone: string;
  access_token?: string;
  google_access_token?: string;
  chronotype?: Chronotype;
  focus_success_rate?: number;
}

export interface ActivateResponse {
  status: 'scheduled' | 'error';
  session_id: string;
  task?: {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    calendar_event_id?: string;
    requires_focus: boolean;
    requires_camera_verification: boolean;
    notification_copy: string;
    energy_demand?: EnergyDemand;
    session_type?: string;
    energy_match_score?: number;
  };
  error?: string;
}

/**
 * POST /api/profile/sync - Sync user profile
 */
export interface ProfileSyncRequest {
  // Empty body — server fetches from JWT
}

export interface ProfileSyncResponse {
  profile: UserProfile;
  stones_earned?: number;
  streak_maintained: boolean;
  newly_unlocked_achievements: string[];
}

/**
 * POST /api/blocking/register-token - Register device token
 */
export interface RegisterTokenRequest {
  token: string;
  platform: 'ios' | 'web';
  device_name?: string;
}

export interface RegisterTokenResponse {
  success: boolean;
  device_id: string;
}

/**
 * GET /api/tree-svg - Generate tree SVG
 */
export interface TreeSVGRequest {
  species: TreeSpecies | string;
  size: number;
  health: number; // 0-100
}

// Response is SVG content type (string)

/**
 * POST /api/notes/create - Create a saved note
 */
export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateNoteResponse {
  note: SavedNote;
}

/**
 * POST /api/notes/{id}/connect - Create note connection
 */
export interface ConnectNotesRequest {
  to_note_id: string; // UUID
  connection_type: ConnectionType;
}

export interface ConnectNotesResponse {
  connection: NoteConnection;
}

/**
 * POST /api/focus/expand-automations - Expand recurring focus rules
 */
export interface ExpandAutomationsRequest {
  days_ahead: number; // How many days to expand (default 7)
}

export interface ExpandAutomationsResponse {
  expanded_count: number;
  blocking_sessions: BlockingSession[];
}

/**
 * POST /api/amber/reschedule - Reschedule plan
 */
export interface RescheduleRequest {
  session_id: string; // UUID
  start_hour: number;
  end_hour: number;
}

export interface RescheduleResponse {
  status: 'rescheduled' | 'error';
  session_id: string;
  error?: string;
}

/**
 * POST /api/gamification/apply-reward - Apply session completion reward
 */
export interface ApplyRewardRequest {
  session_id: string; // UUID
  duration_minutes: number;
}

export interface ApplyRewardResponse {
  status: string;
  total_stones: number;
  forest_health_gain: number;
  new_forest_health: number;
  celebration_level: 'standard' | 'bonus' | 'rare';
  message: string;
  new_streak: number;
  forest_status: {
    level: 'thriving' | 'healthy' | 'struggling' | 'dying';
    percentage: number;
    message: string;
    color: string;
  };
}

/**
 * GET /api/gamification/forest-status - Get forest status
 */
export interface ForestStatusResponse {
  forest_health: number;
  level: 'thriving' | 'healthy' | 'struggling' | 'dying';
  message: string;
  color: string;
  total_stones: number;
  current_streak: number;
  longest_streak: number;
}

// ============================================================================
// PUSH NOTIFICATION PAYLOADS
// ============================================================================

export type PushNotificationType = 'plan_ready' | 'session_due' | 'achievement_unlocked' | 'streak_milestone';

export interface PushNotificationPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  data: Record<string, string>;

  // Type-specific fields
  session_id?: string; // for plan_ready, session_due
  achievement_id?: string; // for achievement_unlocked
  milestone?: number; // for streak_milestone
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a session is in a completable state
 */
export function isSessionCompletable(session: AmberSession): boolean {
  return ['scheduled', 'accepted'].includes(session.status);
}

/**
 * Check if a blocking session is currently active
 */
export function isBlockingSessionActive(session: BlockingSession, now: Date = new Date()): boolean {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  return now >= start && now <= end;
}

/**
 * Check if focus automation should trigger today
 */
export function shouldFocusAutomationTrigger(automation: FocusAutomation, now: Date = new Date()): boolean {
  const today = now.getDay();
  return automation.is_active && automation.days_of_week.includes(today);
}

/**
 * Version check helper
 */
export function versionGreaterThan(version: string, minimum: string): boolean {
  const parts = version.split('.').map(Number);
  const minParts = minimum.split('.').map(Number);

  for (let i = 0; i < Math.max(parts.length, minParts.length); i++) {
    const part = parts[i] || 0;
    const minPart = minParts[i] || 0;
    if (part > minPart) return true;
    if (part < minPart) return false;
  }
  return false;
}

// ============================================================================
// RE-EXPORT CONFIG TYPES
// ============================================================================
export type { ResinConfig } from './config';
export { isFeatureEnabled, versionGreaterOrEqual, parseConfig, validateConfig } from './config';

export default {
  TreeSpecies,
  isSessionCompletable,
  isBlockingSessionActive,
  shouldFocusAutomationTrigger,
  versionGreaterThan
};
