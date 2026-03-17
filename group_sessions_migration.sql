-- Create group_focus_sessions table
CREATE TABLE IF NOT EXISTS group_focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    max_participants INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_session_participants table to track who's in each session
CREATE TABLE IF NOT EXISTS group_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES group_focus_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, user_id)
);

-- Create indexes
CREATE INDEX idx_group_focus_sessions_group_id ON group_focus_sessions(group_id);
CREATE INDEX idx_group_focus_sessions_status ON group_focus_sessions(status);
CREATE INDEX idx_group_focus_sessions_start_time ON group_focus_sessions(start_time);
CREATE INDEX idx_group_session_participants_session_id ON group_session_participants(session_id);
CREATE INDEX idx_group_session_participants_user_id ON group_session_participants(user_id);

-- Add comments
COMMENT ON TABLE group_focus_sessions IS 'Group focus sessions for collaborative focus and accountability';
COMMENT ON TABLE group_session_participants IS 'Tracks participation in group focus sessions';
