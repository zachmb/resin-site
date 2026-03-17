-- Migration for Focus Groups feature
-- Create focus_groups table
CREATE TABLE IF NOT EXISTS focus_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create focus_group_members table
CREATE TABLE IF NOT EXISTS focus_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES focus_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_groups_created_by ON focus_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_focus_group_members_group_id ON focus_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_focus_group_members_user_id ON focus_group_members(user_id);

-- Enable RLS on focus_groups
ALTER TABLE focus_groups ENABLE ROW LEVEL SECURITY;

-- Enable RLS on focus_group_members
ALTER TABLE focus_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can select groups they are members of
CREATE POLICY "Users can select groups they are members of" ON focus_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM focus_group_members
            WHERE focus_group_members.group_id = focus_groups.id
            AND focus_group_members.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert groups they create
CREATE POLICY "Users can create groups" ON focus_groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- RLS Policy: Group admins can update their group
CREATE POLICY "Group admins can update groups" ON focus_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM focus_group_members
            WHERE focus_group_members.group_id = focus_groups.id
            AND focus_group_members.user_id = auth.uid()
            AND focus_group_members.role = 'admin'
        )
    );

-- RLS Policy: Group admins can delete their group
CREATE POLICY "Group admins can delete groups" ON focus_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM focus_group_members
            WHERE focus_group_members.group_id = focus_groups.id
            AND focus_group_members.user_id = auth.uid()
            AND focus_group_members.role = 'admin'
        )
    );

-- RLS Policy: Users can select group members they are grouped with
CREATE POLICY "Users can view group members of their groups" ON focus_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM focus_group_members AS fm2
            WHERE fm2.group_id = focus_group_members.group_id
            AND fm2.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert themselves to a group (if invited or public)
CREATE POLICY "Users can join groups" ON focus_group_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policy: Group admins can manage members
CREATE POLICY "Group admins can manage group members" ON focus_group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM focus_group_members AS fm2
            WHERE fm2.group_id = focus_group_members.group_id
            AND fm2.user_id = auth.uid()
            AND fm2.role = 'admin'
        )
    );

-- RLS Policy: Group admins can remove members
CREATE POLICY "Group admins can remove group members" ON focus_group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM focus_group_members AS fm2
            WHERE fm2.group_id = focus_group_members.group_id
            AND fm2.user_id = auth.uid()
            AND fm2.role = 'admin'
        )
    );
