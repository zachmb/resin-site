-- Add URLs column to saved_notes for bookmarking
ALTER TABLE saved_notes ADD COLUMN stored_urls TEXT[] DEFAULT '{}';

-- Create index for faster URL searches
CREATE INDEX idx_saved_notes_stored_urls ON saved_notes USING GIN(stored_urls);

-- Add comment
COMMENT ON COLUMN saved_notes.stored_urls IS 'Array of URLs bookmarked/stored with this note for quick reference';
