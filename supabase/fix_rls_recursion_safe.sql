-- Safe fix: Remove only the recursive policy, keep everything else
BEGIN;

-- Drop ONLY the problematic view_group_notes policy that has the recursive subquery
DROP POLICY IF EXISTS "view_group_notes" ON amber_sessions;

COMMIT;

-- NOTE: This only removes the problematic policy.
-- Existing INSERT/UPDATE/DELETE/SELECT policies remain unchanged.
-- The home page can still read personal notes using existing policies.
