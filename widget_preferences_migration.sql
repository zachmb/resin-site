-- Add widget_enabled preference to profiles table
-- Created: 2026-03-11

-- Add column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT true;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_widget_enabled ON public.profiles(widget_enabled);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.widget_enabled IS 'User preference to enable/disable the home screen widget';
