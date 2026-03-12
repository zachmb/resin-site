-- Focus Groups table
CREATE TABLE focus_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Focus Group Members table
CREATE TABLE focus_group_members (
    group_id uuid REFERENCES focus_groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member', -- 'admin' | 'member'
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

-- Enable RLS
ALTER TABLE focus_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: members can read groups they belong to
CREATE POLICY "members_read_group" ON focus_groups FOR SELECT
    USING (id IN (SELECT group_id FROM focus_group_members WHERE user_id = auth.uid()));

-- RLS Policy: members can read group members of groups they belong to
CREATE POLICY "members_read_members" ON focus_group_members FOR SELECT
    USING (group_id IN (SELECT group_id FROM focus_group_members WHERE user_id = auth.uid()));

-- RLS Policy: admins can insert new members to their groups
CREATE POLICY "admin_insert_members" ON focus_group_members FOR INSERT
    WITH CHECK (
        group_id IN (
            SELECT group_id FROM focus_group_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes for performance
CREATE INDEX focus_group_members_user_id ON focus_group_members(user_id);
CREATE INDEX focus_group_members_group_id ON focus_group_members(group_id);
CREATE INDEX focus_groups_created_by ON focus_groups(created_by);
