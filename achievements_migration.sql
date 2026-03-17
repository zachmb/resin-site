-- Create user_achievements table to persist achievement unlocks across devices

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, achievement_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
    ON public.user_achievements(user_id);

-- Row-level security: users can only see their own achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Service can update achievements"
    ON public.user_achievements FOR UPDATE
    USING (TRUE);

-- Comments
COMMENT ON TABLE public.user_achievements IS 'Tracks unlocked achievements for users. Synced across iOS and web.';
COMMENT ON COLUMN public.user_achievements.achievement_id IS 'Unique achievement slug (e.g. week_streak, stone_collector)';
COMMENT ON COLUMN public.user_achievements.notified IS 'True if the user has been notified about this achievement. Prevents duplicate toasts.';
