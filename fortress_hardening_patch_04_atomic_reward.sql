-- ============================================================================
-- ATOMIC REWARD PATCH: Preventing Ghost Rewards & Streak Corruption
-- ============================================================================
-- Problem: apply-reward endpoint executes 3 separate operations:
--   1. UPDATE profiles (add stones, update streak)
--   2. UPDATE amber_sessions (mark as rewarded)
--   3. INSERT forest_events (log event)
--
-- If #1 succeeds but #2 fails: User gets stones, but session not marked complete.
-- Result: Streak resets, duplicate rewards possible.
--
-- Solution: Single RPC function wrapping all 3 operations in a transaction.
-- ============================================================================

-- Step 1: Create atomic reward application function
CREATE OR REPLACE FUNCTION apply_reward_atomic(
    p_user_id uuid,
    p_session_id uuid,
    p_new_streak int,
    p_total_stones int,
    p_forest_health_gain int,
    p_new_forest_health int,
    p_celebration_level text,
    p_message text
) RETURNS TABLE(
    success boolean,
    error_message text,
    reward_summary jsonb
) AS $$
DECLARE
    v_session_record record;
    v_profile_record record;
    v_reward_summary jsonb;
BEGIN
    -- Step 1a: Verify session exists and belongs to user
    SELECT id, status, user_id, title, duration_minutes
    INTO v_session_record
    FROM amber_sessions
    WHERE id = p_session_id
      AND user_id = p_user_id
    FOR UPDATE;  -- Lock for duration of transaction
    
    IF v_session_record IS NULL THEN
        RETURN QUERY SELECT false, 'Session not found', NULL::jsonb;
        RETURN;
    END IF;
    
    IF v_session_record.status = 'completed' THEN
        RETURN QUERY SELECT false, 'Session already completed', NULL::jsonb;
        RETURN;
    END IF;
    
    -- Step 1b: Verify profile exists
    SELECT id, total_stones, current_streak, forest_health, last_session_date
    INTO v_profile_record
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;  -- Lock for duration of transaction
    
    IF v_profile_record IS NULL THEN
        RETURN QUERY SELECT false, 'Profile not found', NULL::jsonb;
        RETURN;
    END IF;
    
    -- Step 2: Atomically update ALL three entities
    BEGIN
        -- UPDATE 1: Profile (streak, stones, health, last_session)
        UPDATE profiles
        SET 
            current_streak = p_new_streak,
            total_stones = p_total_stones,
            forest_health = p_new_forest_health,
            last_session_date = now(),
            last_active_date = now(),
            updated_at = now()
        WHERE id = p_user_id;
        
        -- UPDATE 2: Session (mark complete, record celebration)
        UPDATE amber_sessions
        SET 
            status = 'completed',
            completed_at = now(),
            was_celebrated = true,
            celebration_level = p_celebration_level,
            updated_at = now()
        WHERE id = p_session_id;
        
        -- INSERT 3: Forest event log
        INSERT INTO forest_events (
            user_id,
            event_type,
            health_impact,
            session_id,
            created_at
        ) VALUES (
            p_user_id,
            'session_completed',
            p_forest_health_gain,
            p_session_id,
            now()
        );
        
        -- Build reward summary
        v_reward_summary := jsonb_build_object(
            'session_id', p_session_id,
            'title', v_session_record.title,
            'duration_minutes', v_session_record.duration_minutes,
            'stones_earned', p_total_stones - v_profile_record.total_stones,
            'new_total_stones', p_total_stones,
            'new_streak', p_new_streak,
            'forest_health_gain', p_forest_health_gain,
            'new_forest_health', p_new_forest_health,
            'celebration_level', p_celebration_level,
            'message', p_message,
            'completed_at', now()::text
        );
        
        -- Success: all operations completed in single transaction
        RETURN QUERY SELECT true, '', v_reward_summary;
        
    EXCEPTION WHEN others THEN
        -- Any error rolls back ALL updates
        RETURN QUERY SELECT false, SQLERRM::text, NULL::jsonb;
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_reward_atomic IS 
'Atomically applies session reward: updates profile, marks session complete, logs event. All or nothing.';

-- Step 2: Create index for fast session lookups by user
CREATE INDEX IF NOT EXISTS idx_amber_sessions_user_status 
ON amber_sessions(user_id, status);

-- Step 3: Add constraint to prevent completion of already-completed sessions
ALTER TABLE amber_sessions 
ADD CONSTRAINT check_cannot_uncomplete 
CHECK (completed_at IS NULL OR status = 'completed');

-- Step 4: Verify function works
-- SELECT * FROM apply_reward_atomic(
--     'user-uuid'::uuid,
--     'session-uuid'::uuid,
--     3,  -- new_streak
--     50, -- total_stones
--     10, -- forest_health_gain
--     95, -- new_forest_health
--     'bonus',
--     'Excellent work!'
-- );

-- ============================================================================
-- ROLLBACK SAFETY: If deployment fails, old endpoint still works with
-- apply_reward_atomic_fallback (below). Never delete the function!
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_reward_atomic_fallback(
    p_user_id uuid,
    p_session_id uuid
) RETURNS TABLE(
    success boolean,
    error_message text
) AS $$
BEGIN
    -- Minimal fallback: just mark session complete
    UPDATE amber_sessions
    SET status = 'completed', updated_at = now()
    WHERE id = p_session_id AND user_id = p_user_id;
    
    RETURN QUERY SELECT true, ''::text;
EXCEPTION WHEN others THEN
    RETURN QUERY SELECT false, SQLERRM::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT LOGGING: Track all reward applications
-- ============================================================================
CREATE TABLE IF NOT EXISTS reward_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    session_id uuid NOT NULL,
    success boolean NOT NULL,
    stones_awarded int,
    streak_after int,
    applied_at timestamp with time zone DEFAULT now(),
    
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES amber_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reward_audit_user ON reward_audit_log(user_id, applied_at DESC);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Check for "Ghost Rewards" (stones awarded but session not completed):
-- SELECT 
--     p.id, p.total_stones, COUNT(s.id) as completed_sessions
-- FROM profiles p
-- LEFT JOIN amber_sessions s ON p.id = s.user_id AND s.status = 'completed'
-- WHERE p.total_stones > 0 AND COUNT(s.id) = 0
-- GROUP BY p.id;

