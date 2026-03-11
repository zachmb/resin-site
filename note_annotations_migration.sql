-- Note Annotations Table
-- Stores drawings and annotations on notes
-- Created: 2026-03-11

CREATE TABLE IF NOT EXISTS public.note_annotations (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id         UUID NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    drawing_data    BYTEA NOT NULL,  -- PKDrawing encoded as binary data
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
CREATE POLICY "Users can view own note annotations"
ON public.note_annotations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note annotations"
ON public.note_annotations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note annotations"
ON public.note_annotations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own note annotations"
ON public.note_annotations FOR DELETE
USING (auth.uid() = user_id);
