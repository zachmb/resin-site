-- Note Annotations Table
-- Stores drawings and annotations on notes
-- Optimized: Images stored in Supabase Storage, URLs in database
-- Created: 2026-03-11

CREATE TABLE IF NOT EXISTS public.note_annotations (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id         UUID NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    drawing_data    TEXT NOT NULL,  -- Public URL to image in Supabase Storage
    file_path       TEXT,  -- Path in storage bucket: user_id/note_id/timestamp.webp
    annotation_type VARCHAR(50) DEFAULT 'freehand',  -- freehand | highlight | circle | rectangle | arrow
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index for faster lookups by note_id and user_id
CREATE INDEX IF NOT EXISTS idx_note_annotations_note_user ON public.note_annotations(note_id, user_id);
CREATE INDEX IF NOT EXISTS idx_note_annotations_user ON public.note_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_note_annotations_created ON public.note_annotations(created_at);

-- Enable RLS
ALTER TABLE public.note_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see and modify their own annotations
DROP POLICY IF EXISTS "Users can view own note annotations" ON public.note_annotations;
CREATE POLICY "Users can view own note annotations"
ON public.note_annotations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own note annotations" ON public.note_annotations;
CREATE POLICY "Users can insert own note annotations"
ON public.note_annotations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own note annotations" ON public.note_annotations;
CREATE POLICY "Users can update own note annotations"
ON public.note_annotations FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own note annotations" ON public.note_annotations;
CREATE POLICY "Users can delete own note annotations"
ON public.note_annotations FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET SETUP
-- ============================================================
-- Create index for file_path lookups
CREATE INDEX IF NOT EXISTS idx_note_annotations_file_path ON public.note_annotations(file_path);

-- Note: Create the 'annotations' storage bucket manually in Supabase:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: annotations
-- 4. Public: No (use RLS instead)
-- 5. Run these RLS policies in the Storage configuration:

-- Storage RLS: Allow users to upload to their own folder
-- INSERT: (auth.uid())::text = (storage.foldername[1])::text

-- Storage RLS: Allow users to read/download their own files
-- SELECT: (auth.uid())::text = (storage.foldername[1])::text

-- Storage RLS: Allow users to delete their own files
-- DELETE: (auth.uid())::text = (storage.foldername[1])::text
