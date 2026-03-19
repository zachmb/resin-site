-- Groups Page Migration — Replace Boards
-- Run this BEFORE any code changes

-- 1. Add board_id to focus_groups (each group owns one note board)
ALTER TABLE focus_groups ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL;

-- 2. Fix group_focus_sessions FK (references non-existent `groups`, should be `focus_groups`)
ALTER TABLE group_focus_sessions
  DROP CONSTRAINT IF EXISTS group_focus_sessions_group_id_fkey;

ALTER TABLE group_focus_sessions
  ADD CONSTRAINT group_focus_sessions_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES focus_groups(id) ON DELETE CASCADE;

-- 3. Token-based invite links for groups
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  max_uses INT DEFAULT 100,
  uses_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS on group_invites
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view invites" ON group_invites;
CREATE POLICY "Members can view invites" ON group_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM focus_group_members
      WHERE group_id = group_invites.group_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create invites" ON group_invites;
CREATE POLICY "Admins can create invites" ON group_invites FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM focus_group_members
    WHERE group_id = group_invites.group_id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Enable realtime on group_focus_sessions and group_session_participants
-- (Skip if already in publication - will get error 42710 if already added)
-- ALTER PUBLICATION supabase_realtime ADD TABLE group_focus_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE group_session_participants;
