-- Add web_onboarded field to profiles table
ALTER TABLE public.profiles
ADD COLUMN web_onboarded boolean DEFAULT false;

-- Create index on web_onboarded for faster queries
CREATE INDEX idx_profiles_web_onboarded ON public.profiles(web_onboarded);

-- Update RLS policy if needed (profiles already have RLS in place)
