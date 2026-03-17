-- Create daily activity tracking table
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    focus_minutes INTEGER DEFAULT 0,
    notes_created INTEGER DEFAULT 0,
    amber_plans_completed INTEGER DEFAULT 0,
    amber_plans_created INTEGER DEFAULT 0,
    longest_focus_session INTEGER DEFAULT 0, -- minutes
    app_blocks_triggered INTEGER DEFAULT 0,
    domain_blocks_triggered INTEGER DEFAULT 0,
    stones_earned INTEGER DEFAULT 0,
    streak_maintained BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Create index for efficient date range queries
CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);
CREATE INDEX idx_daily_activity_user_month ON daily_activity(user_id, DATE_TRUNC('month', activity_date));

-- Add comments
COMMENT ON TABLE daily_activity IS 'Daily productivity metrics for activity calendar and analytics';
COMMENT ON COLUMN daily_activity.user_id IS 'User who owns this activity record';
COMMENT ON COLUMN daily_activity.activity_date IS 'The date this activity occurred';
COMMENT ON COLUMN daily_activity.focus_minutes IS 'Total minutes spent in focus sessions';
COMMENT ON COLUMN daily_activity.notes_created IS 'Number of notes created or saved';
COMMENT ON COLUMN daily_activity.amber_plans_completed IS 'Number of amber execution plans completed';
COMMENT ON COLUMN daily_activity.longest_focus_session IS 'Longest continuous focus session in minutes';
COMMENT ON COLUMN daily_activity.stones_earned IS 'Petrified stones earned this day';
COMMENT ON COLUMN daily_activity.streak_maintained IS 'Whether the user maintained their streak today';
