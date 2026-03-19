-- ============================================================================
-- DEVICE LEDGER MIGRATION: Fixing Cross-Platform Split-Brain
-- ============================================================================
-- Transforms blocking_sessions from a global flag (device_scheduled: boolean)
-- to a per-device acknowledgment ledger (device_schedules: jsonb).
--
-- Problem: When multiple devices sync the same block, a single boolean can't
-- track which devices have scheduled. This causes Split-Brain (Mac blocks,
-- iPad doesn't).
--
-- Solution: device_schedules = { "ios-uuid": "2026-03-19T14:00:00Z", ... }
-- Each device records when it scheduled, proving idempotency.
-- ============================================================================

-- Step 1: Add new JSONB column for device ledger
ALTER TABLE blocking_sessions 
ADD COLUMN IF NOT EXISTS device_schedules jsonb DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing data (if device_scheduled=true, mark as legacy scheduled)
UPDATE blocking_sessions
SET device_schedules = jsonb_object(ARRAY['_legacy', now()::text])
WHERE device_scheduled = true
  AND device_schedules = '{}'::jsonb;

-- Step 3: Mark old column for deprecation (don't delete; may break old clients)
COMMENT ON COLUMN blocking_sessions.device_scheduled IS 'DEPRECATED: Use device_schedules instead';

-- Step 4: Create index for fast device ledger lookups
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_device_schedules 
ON blocking_sessions USING gin (device_schedules);

-- Step 5: Helper function to check if device is scheduled
CREATE OR REPLACE FUNCTION is_device_scheduled(
    p_session_id uuid,
    p_device_id text
) RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT device_schedules->p_device_id IS NOT NULL
        FROM blocking_sessions
        WHERE id = p_session_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Helper function to add device to ledger (idempotent)
CREATE OR REPLACE FUNCTION acknowledge_device_scheduled(
    p_session_id uuid,
    p_device_id text
) RETURNS void AS $$
BEGIN
    UPDATE blocking_sessions
    SET device_schedules = jsonb_set(
        device_schedules,
        ARRAY[p_device_id],
        to_jsonb(now()::text)
    )
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: View for device sync status (for web UI)
CREATE OR REPLACE VIEW device_sync_status AS
SELECT 
    id,
    user_id,
    title,
    start_time,
    end_time,
    jsonb_object_keys(device_schedules) AS scheduled_devices,
    jsonb_each(device_schedules) AS device_acknowledgments
FROM blocking_sessions
WHERE status = 'active';

COMMENT ON VIEW device_sync_status IS 'Shows which devices have acknowledged scheduling for each block';

-- ============================================================================
-- CLEANUP: Sessions older than 30 days can have device_schedules cleaned
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_device_ledgers()
RETURNS void AS $$
BEGIN
    UPDATE blocking_sessions
    SET device_schedules = '{}'::jsonb
    WHERE end_time < now() - interval '30 days'
      AND device_schedules != '{}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily
-- SELECT cron.schedule('cleanup-device-ledgers', '0 2 * * *', 'SELECT cleanup_old_device_ledgers()');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After migration, test:
-- SELECT id, device_schedules FROM blocking_sessions LIMIT 5;
-- SELECT is_device_scheduled('session-uuid', 'ios-device-uuid');
-- SELECT acknowledge_device_scheduled('session-uuid', 'ios-device-uuid');
