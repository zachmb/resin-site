-- Status Field Migration for Amber Sessions
-- Ensures proper status tracking for amber_sessions

-- Add updated_at column if it doesn't exist
ALTER TABLE public.amber_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add intensity column if it doesn't exist
ALTER TABLE public.amber_sessions
ADD COLUMN IF NOT EXISTS intensity NUMERIC(3,2);

-- Add brain_dump, plan_steps, reflection columns for complete session data
ALTER TABLE public.amber_sessions
ADD COLUMN IF NOT EXISTS brain_dump TEXT,
ADD COLUMN IF NOT EXISTS plan_steps TEXT[],
ADD COLUMN IF NOT EXISTS reflection TEXT,
ADD COLUMN IF NOT EXISTS reflection_rating INTEGER;

-- Status values used by the application:
-- 'draft' - Session created but not yet processed
-- 'scheduled' - AI plan generated and scheduled
-- 'processing' - Currently generating plan
-- 'completed' - Session finished/completed
-- 'canceled' - Session was canceled by user
-- 'failed' - Plan generation failed

-- Add constraint to amber_tasks status if it doesn't exist
ALTER TABLE public.amber_tasks
ADD COLUMN IF NOT EXISTS requires_focus BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_camera_verification BOOLEAN DEFAULT FALSE;

-- Create an index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_amber_sessions_status ON public.amber_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_amber_sessions_created_at ON public.amber_sessions(user_id, created_at DESC);

-- Update RLS policies to ensure users can only see their own sessions
ALTER POLICY "Users can manage their own amber sessions"
ON public.amber_sessions
USING (auth.uid() = user_id);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_amber_sessions_updated_at ON public.amber_sessions;
CREATE TRIGGER update_amber_sessions_updated_at
    BEFORE UPDATE ON public.amber_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instant status updates
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.amber_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.amber_sessions;
