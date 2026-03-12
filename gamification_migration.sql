-- Add gamification tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS forest_health integer DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sessions_completed_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_session_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_ritual_time text DEFAULT '09:00'; -- HH:MM format for daily ritual prompt
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS forest_petrification_rate real DEFAULT 0.0; -- 0-1, how much forest "decays"

-- Track session stakes and outcomes
ALTER TABLE amber_sessions ADD COLUMN IF NOT EXISTS stakes_amount integer DEFAULT 0;
ALTER TABLE amber_sessions ADD COLUMN IF NOT EXISTS bonus_stones_awarded integer DEFAULT 0;
ALTER TABLE amber_sessions ADD COLUMN IF NOT EXISTS was_celebrated boolean DEFAULT false;
ALTER TABLE amber_sessions ADD COLUMN IF NOT EXISTS ritual_started_at timestamptz;

-- Create forest_events table for tracking forest health changes
CREATE TABLE IF NOT EXISTS forest_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'tree_grown', 'tree_petrified', 'forest_flourished', 'forest_decayed'
    amount integer DEFAULT 1,
    related_session_id uuid REFERENCES amber_sessions(id),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forest_events_user_id ON forest_events(user_id);
CREATE INDEX IF NOT EXISTS idx_forest_events_created_at ON forest_events(user_id, created_at DESC);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_forest_health ON profiles(id, forest_health) WHERE forest_health > 0;
CREATE INDEX IF NOT EXISTS idx_amber_sessions_bonus_stones ON amber_sessions(user_id, bonus_stones_awarded) WHERE bonus_stones_awarded > 0;
