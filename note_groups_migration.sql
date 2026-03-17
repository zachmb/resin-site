-- Create note groups table
CREATE TABLE IF NOT EXISTS note_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20), -- hex color or named color
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add group_id to saved_notes
ALTER TABLE saved_notes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES note_groups(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_note_groups_user_id ON note_groups(user_id);
CREATE INDEX idx_saved_notes_group_id ON saved_notes(group_id);

-- Add comments
COMMENT ON TABLE note_groups IS 'Groups for organizing saved notes';
COMMENT ON COLUMN note_groups.user_id IS 'User who owns this group';
COMMENT ON COLUMN note_groups.color IS 'Visual color for the group (e.g., resin-forest, resin-amber)';
