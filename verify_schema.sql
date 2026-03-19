-- Comprehensive DATABASE_SCHEMA.md Verification Queries
-- Run these in Supabase SQL editor to verify schema matches documentation

-- ============================================================================
-- 1. VERIFY CORE TABLE STRUCTURES
-- ============================================================================

-- Check amber_sessions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'amber_sessions'
ORDER BY ordinal_position;

-- Check amber_tasks columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'amber_tasks'
ORDER BY ordinal_position;

-- Check board_notes columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'board_notes'
ORDER BY ordinal_position;

-- Check focus_groups columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'focus_groups'
ORDER BY ordinal_position;

-- Check focus_group_members columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'focus_group_members'
ORDER BY ordinal_position;

-- Check group_focus_sessions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_focus_sessions'
ORDER BY ordinal_position;

-- Check group_session_participants columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_session_participants'
ORDER BY ordinal_position;

-- Check group_invites columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_invites'
ORDER BY ordinal_position;

-- Check boards columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'boards'
ORDER BY ordinal_position;

-- Check blocking_sessions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'blocking_sessions'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- List all foreign keys in the schema
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 3. VERIFY PRIMARY KEYS
-- ============================================================================

SELECT
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_name IN (
        'amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
        'focus_group_members', 'group_focus_sessions', 'group_session_participants',
        'group_invites', 'boards'
    )
ORDER BY tc.table_name, kcu.ordinal_position;

-- ============================================================================
-- 4. VERIFY UNIQUE CONSTRAINTS
-- ============================================================================

SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 5. VERIFY RLS POLICIES
-- ============================================================================

-- Check RLS is enabled on tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN (
    'amber_sessions', 'board_notes', 'focus_groups', 'focus_group_members',
    'group_focus_sessions', 'group_session_participants', 'group_invites'
)
ORDER BY tablename;

-- List all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN (
    'amber_sessions', 'board_notes', 'focus_groups', 'focus_group_members',
    'group_focus_sessions', 'group_session_participants', 'group_invites'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. VERIFY REALTIME PUBLICATIONS
-- ============================================================================

-- Check which tables are in the supabase_realtime publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================================================
-- 7. VERIFY COLUMN DEFAULTS
-- ============================================================================

-- Check for DEFAULT values on key columns
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN (
    'amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
    'focus_group_members', 'group_focus_sessions', 'group_session_participants',
    'group_invites'
)
    AND column_default IS NOT NULL
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- 8. DATA SUMMARY (counts and sample data)
-- ============================================================================

-- Count records in each table
SELECT 'amber_sessions' as table_name, COUNT(*) as record_count FROM amber_sessions
UNION ALL
SELECT 'amber_tasks', COUNT(*) FROM amber_tasks
UNION ALL
SELECT 'board_notes', COUNT(*) FROM board_notes
UNION ALL
SELECT 'focus_groups', COUNT(*) FROM focus_groups
UNION ALL
SELECT 'focus_group_members', COUNT(*) FROM focus_group_members
UNION ALL
SELECT 'group_focus_sessions', COUNT(*) FROM group_focus_sessions
UNION ALL
SELECT 'group_session_participants', COUNT(*) FROM group_session_participants
UNION ALL
SELECT 'group_invites', COUNT(*) FROM group_invites
UNION ALL
SELECT 'boards', COUNT(*) FROM boards
UNION ALL
SELECT 'blocking_sessions', COUNT(*) FROM blocking_sessions
ORDER BY table_name;

-- ============================================================================
-- 9. VERIFY STATUS ENUM VALUES (if using ENUMs)
-- ============================================================================

-- Check if amber_sessions.status uses an enum or text
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'amber_sessions' AND column_name = 'status';

-- If text, sample distinct values
SELECT DISTINCT status FROM amber_sessions ORDER BY status;

-- ============================================================================
-- 10. VERIFY SPECIFIC DATA RELATIONSHIPS
-- ============================================================================

-- Check groups with missing board_id (should be none)
SELECT id, name, board_id FROM focus_groups WHERE board_id IS NULL;

-- Check group_focus_sessions foreign key integrity
SELECT COUNT(*) as invalid_group_fk_count
FROM group_focus_sessions
WHERE group_id NOT IN (SELECT id FROM focus_groups);

-- Check board_notes foreign key integrity
SELECT COUNT(*) as invalid_board_fk_count
FROM board_notes
WHERE board_id NOT IN (SELECT id FROM boards);

-- Check group_invites expiry (should have some expired)
SELECT COUNT(*) as expired_invites
FROM group_invites
WHERE expires_at < NOW();

-- ============================================================================
-- 11. INDEXES (check what's indexed for performance)
-- ============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
        'focus_group_members', 'group_focus_sessions', 'group_session_participants',
        'group_invites'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- 12. COLUMN TYPE VERIFICATION (for critical columns)
-- ============================================================================

-- Verify critical columns match expected types
SELECT
    table_name,
    column_name,
    data_type,
    CASE
        WHEN table_name = 'amber_sessions' AND column_name = 'id' AND data_type = 'uuid' THEN '✓ CORRECT'
        WHEN table_name = 'amber_sessions' AND column_name = 'raw_text' AND data_type = 'text' THEN '✓ CORRECT'
        WHEN table_name = 'amber_sessions' AND column_name = 'display_title' AND data_type = 'text' THEN '✓ CORRECT'
        WHEN table_name = 'amber_sessions' AND column_name = 'intensity' AND data_type = 'numeric' THEN '✓ CORRECT'
        WHEN table_name = 'board_notes' AND column_name = 'title' AND data_type = 'text' THEN '✓ CORRECT'
        WHEN table_name = 'board_notes' AND column_name = 'content' AND data_type = 'text' THEN '✓ CORRECT'
        WHEN table_name = 'group_invites' AND column_name = 'token' AND data_type = 'text' THEN '✓ CORRECT'
        ELSE 'CHECK'
    END as status
FROM information_schema.columns
WHERE (
    (table_name = 'amber_sessions' AND column_name IN ('id', 'raw_text', 'display_title', 'intensity'))
    OR (table_name = 'board_notes' AND column_name IN ('title', 'content'))
    OR (table_name = 'group_invites' AND column_name = 'token')
)
ORDER BY table_name, column_name;
