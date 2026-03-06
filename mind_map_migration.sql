-- Add mind map columns to amber_sessions
ALTER TABLE public.amber_sessions 
ADD COLUMN IF NOT EXISTS is_on_map BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS position_x DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS position_y DOUBLE PRECISION;

-- Create mind_map_edges table
CREATE TABLE IF NOT EXISTS public.mind_map_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.amber_sessions(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.amber_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, source_id, target_id)
);

-- Enable RLS
ALTER TABLE public.mind_map_edges ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for mind_map_edges
CREATE POLICY "Users can manage their own edges" 
ON public.mind_map_edges 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure amber_sessions columns are indexed for performance
CREATE INDEX IF NOT EXISTS idx_amber_sessions_on_map ON public.amber_sessions(user_id, is_on_map) WHERE is_on_map = TRUE;
