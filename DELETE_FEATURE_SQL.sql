-- SQL code to ensure delete functionality works properly
-- Run this in your Supabase SQL editor

-- 1. Enable delete on amber_sessions with proper RLS
-- This policy allows users to delete only their own sessions
CREATE POLICY "Users can delete own amber sessions"
ON amber_sessions FOR DELETE
USING (auth.uid() = user_id);

-- 2. Ensure cascade delete is set up for amber_tasks
-- This will automatically delete associated tasks when a session is deleted
ALTER TABLE amber_tasks
DROP CONSTRAINT IF EXISTS amber_tasks_amber_session_id_fkey;

ALTER TABLE amber_tasks
ADD CONSTRAINT amber_tasks_amber_session_id_fkey
FOREIGN KEY (amber_session_id)
REFERENCES amber_sessions(id)
ON DELETE CASCADE;

-- 3. Ensure mind_map_edges are cleaned up when sessions are deleted
-- This cleans up any map connections when a session is deleted
ALTER TABLE mind_map_edges
DROP CONSTRAINT IF EXISTS mind_map_edges_session_id_fkey;

ALTER TABLE mind_map_edges
ADD CONSTRAINT mind_map_edges_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES amber_sessions(id)
ON DELETE CASCADE;

-- 4. Ensure shared_notes cascade delete (if a note is deleted, sharing is removed)
ALTER TABLE shared_notes
DROP CONSTRAINT IF EXISTS shared_notes_note_id_fkey;

ALTER TABLE shared_notes
ADD CONSTRAINT shared_notes_note_id_fkey
FOREIGN KEY (note_id)
REFERENCES amber_sessions(id)
ON DELETE CASCADE;

-- 5. Verify RLS is enabled on amber_sessions
ALTER TABLE amber_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Check if a select policy exists (if not, add one)
-- This ensures users can only see/delete their own sessions
CREATE POLICY "Users can select own amber sessions"
ON amber_sessions FOR SELECT
USING (auth.uid() = user_id);

-- 7. Update policy (make sure users can update their own sessions)
CREATE POLICY "Users can update own amber sessions"
ON amber_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Insert policy
CREATE POLICY "Users can insert own amber sessions"
ON amber_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);
