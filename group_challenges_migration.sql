-- Create group_challenges table
CREATE TABLE group_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES focus_groups(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    metric text NOT NULL DEFAULT 'sessions_completed', -- 'sessions_completed' | 'stones' | 'streak'
    target_value integer NOT NULL DEFAULT 5,
    start_at timestamptz DEFAULT now(),
    end_at timestamptz,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;

-- Members can read challenges for their groups
CREATE POLICY "group_members_read_challenges" ON group_challenges FOR SELECT
    USING (group_id IN (SELECT group_id FROM focus_group_members WHERE user_id = auth.uid()));

-- Only group admins can insert challenges
CREATE POLICY "group_admins_insert_challenges" ON group_challenges FOR INSERT
    WITH CHECK (group_id IN (
        SELECT group_id FROM focus_group_members WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Create index for faster queries
CREATE INDEX idx_group_challenges_group_id ON group_challenges(group_id);
CREATE INDEX idx_group_challenges_active ON group_challenges(group_id, end_at) WHERE end_at > now();
