-- Create shared_focus_sessions table
CREATE TABLE shared_focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  collaborator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'scheduled', 'completed', 'canceled')),
  initiator_blocking_session_id UUID REFERENCES blocking_sessions(id) ON DELETE SET NULL,
  collaborator_blocking_session_id UUID REFERENCES blocking_sessions(id) ON DELETE SET NULL,
  initiator_completed BOOLEAN DEFAULT false,
  collaborator_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their shared sessions"
  ON shared_focus_sessions FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = collaborator_id);

CREATE POLICY "Users can create shared sessions"
  ON shared_focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update shared sessions"
  ON shared_focus_sessions FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = collaborator_id);
