-- 1. boards table
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. board_members table
CREATE TABLE IF NOT EXISTS board_members (
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor', -- 'owner' | 'editor'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (board_id, user_id)
);

-- 3. board_notes table
CREATE TABLE IF NOT EXISTS board_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'amber', -- 'amber'|'forest'|'rose'|'sky'|'neutral'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for board_notes and board_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;

-- 4. board_invites table
CREATE TABLE IF NOT EXISTS board_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    max_uses INT DEFAULT 50,
    uses_count INT DEFAULT 0
);

-- 5. Enable RLS on all tables

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board members can read" ON boards FOR SELECT
    USING (id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid()));
CREATE POLICY "authenticated users can create boards" ON boards FOR INSERT
    WITH CHECK (auth.uid() = created_by);
CREATE POLICY "board owners can delete" ON boards FOR DELETE
    USING (created_by = auth.uid());

ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can read board_members" ON board_members FOR SELECT
    USING (board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid()));
CREATE POLICY "owners can manage members" ON board_members FOR ALL
    USING (board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'owner'));

ALTER TABLE board_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can read notes" ON board_notes FOR SELECT
    USING (board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid()));
CREATE POLICY "members can insert notes" ON board_notes FOR INSERT
    WITH CHECK (board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid()));
CREATE POLICY "note owner or board owner can update/delete" ON board_notes FOR ALL
    USING (user_id = auth.uid() OR board_id IN (
        SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

ALTER TABLE board_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read invites" ON board_invites FOR SELECT USING (true);
CREATE POLICY "board owner can create invites" ON board_invites FOR INSERT
    WITH CHECK (board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid() AND role = 'owner'));
