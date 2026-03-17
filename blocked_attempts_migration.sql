-- Create blocked_attempts table to log when users hit blocked sites
CREATE TABLE IF NOT EXISTS public.blocked_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.blocked_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own blocked attempts
CREATE POLICY "Users view own blocked attempts"
ON public.blocked_attempts FOR SELECT
USING (auth.uid() = user_id);

-- Extension can insert blocked attempts (requires auth)
CREATE POLICY "Users can insert own blocked attempts"
ON public.blocked_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying by user and time
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_user_time
ON public.blocked_attempts(user_id, timestamp DESC);

-- Create index for analytics (all blocks today)
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_timestamp
ON public.blocked_attempts(timestamp DESC);

-- Comment on table
COMMENT ON TABLE public.blocked_attempts IS 'Logs each time a user attempts to access a blocked site during a focus session';
COMMENT ON COLUMN public.blocked_attempts.user_id IS 'User who was blocked';
COMMENT ON COLUMN public.blocked_attempts.url IS 'URL that was blocked';
COMMENT ON COLUMN public.blocked_attempts.timestamp IS 'When the block occurred';
