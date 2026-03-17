-- Add per-day availability schedule to profiles table
-- Stores as JSONB array with 7 elements (Sun=0 through Sat=6)
-- Each element: { "start": 0-23, "end": 0-23 }
-- Example: [{"start": 16, "end": 22}, {"start": 16, "end": 22}, ...]

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT NULL;

-- Optional: Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_availability_schedule ON profiles USING GIN (availability_schedule);

-- Migration complete
