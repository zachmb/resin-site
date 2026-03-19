-- MEGA SCHEMA VERIFICATION - ALL CHECKS IN ONE QUERY
-- Run this entire query at once to get complete database audit

WITH

-- ============================================================================
-- SECTION 1: TABLE STRUCTURES
-- ============================================================================
amber_sessions_cols AS (
  SELECT 'amber_sessions' as table_name, column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'amber_sessions'
),
amber_tasks_cols AS (
  SELECT 'amber_tasks', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'amber_tasks'
),
board_notes_cols AS (
  SELECT 'board_notes', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'board_notes'
),
focus_groups_cols AS (
  SELECT 'focus_groups', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'focus_groups'
),
focus_group_members_cols AS (
  SELECT 'focus_group_members', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'focus_group_members'
),
group_focus_sessions_cols AS (
  SELECT 'group_focus_sessions', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'group_focus_sessions'
),
group_session_participants_cols AS (
  SELECT 'group_session_participants', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'group_session_participants'
),
group_invites_cols AS (
  SELECT 'group_invites', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'group_invites'
),
boards_cols AS (
  SELECT 'boards', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'boards'
),
blocking_sessions_cols AS (
  SELECT 'blocking_sessions', column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns WHERE table_name = 'blocking_sessions'
),

table_structures AS (
  SELECT '1.1_TABLE_STRUCTURES' as section, table_name, column_name, data_type, is_nullable, ordinal_position::text as ordinal
  FROM (
    SELECT * FROM amber_sessions_cols
    UNION ALL SELECT * FROM amber_tasks_cols
    UNION ALL SELECT * FROM board_notes_cols
    UNION ALL SELECT * FROM focus_groups_cols
    UNION ALL SELECT * FROM focus_group_members_cols
    UNION ALL SELECT * FROM group_focus_sessions_cols
    UNION ALL SELECT * FROM group_session_participants_cols
    UNION ALL SELECT * FROM group_invites_cols
    UNION ALL SELECT * FROM boards_cols
    UNION ALL SELECT * FROM blocking_sessions_cols
  ) t
  ORDER BY table_name, ordinal_position
),

-- ============================================================================
-- SECTION 2: FOREIGN KEYS
-- ============================================================================
foreign_keys AS (
  SELECT
    '2_FOREIGN_KEYS' as section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.update_rule,
    rc.delete_rule
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
),

-- ============================================================================
-- SECTION 3: PRIMARY KEYS
-- ============================================================================
primary_keys AS (
  SELECT
    '3_PRIMARY_KEYS' as section,
    tc.table_name,
    kcu.column_name,
    'PK' as constraint_type
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_name IN ('amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
        'focus_group_members', 'group_focus_sessions', 'group_session_participants',
        'group_invites', 'boards', 'blocking_sessions')
),

-- ============================================================================
-- SECTION 4: UNIQUE CONSTRAINTS
-- ============================================================================
unique_constraints AS (
  SELECT
    '4_UNIQUE_CONSTRAINTS' as section,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
),

-- ============================================================================
-- SECTION 5: RLS STATUS
-- ============================================================================
rls_status AS (
  SELECT
    '5A_RLS_ENABLED' as section,
    tablename as table_name,
    rowsecurity::text as rls_enabled,
    '' as detail
  FROM pg_tables
  WHERE tablename IN ('amber_sessions', 'board_notes', 'focus_groups', 'focus_group_members',
      'group_focus_sessions', 'group_session_participants', 'group_invites')
),

-- ============================================================================
-- SECTION 5B: RLS POLICIES
-- ============================================================================
rls_policies AS (
  SELECT
    '5B_RLS_POLICIES' as section,
    tablename as table_name,
    policyname as policy_name,
    permissive::text,
    '' as detail
  FROM pg_policies
  WHERE tablename IN ('amber_sessions', 'board_notes', 'focus_groups', 'focus_group_members',
      'group_focus_sessions', 'group_session_participants', 'group_invites')
),

-- ============================================================================
-- SECTION 6: REALTIME PUBLICATIONS
-- ============================================================================
realtime_tables AS (
  SELECT
    '6_REALTIME_PUBLICATION' as section,
    tablename as table_name,
    'In supabase_realtime' as status,
    '' as detail
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
),

-- ============================================================================
-- SECTION 7: COLUMN DEFAULTS
-- ============================================================================
column_defaults AS (
  SELECT
    '7_COLUMN_DEFAULTS' as section,
    table_name,
    column_name,
    column_default as default_value,
    '' as detail
  FROM information_schema.columns
  WHERE table_name IN ('amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
      'focus_group_members', 'group_focus_sessions', 'group_session_participants', 'group_invites')
    AND column_default IS NOT NULL
),

-- ============================================================================
-- SECTION 8: RECORD COUNTS
-- ============================================================================
record_counts AS (
  SELECT '8_RECORD_COUNTS' as section,
    'amber_sessions' as table_name,
    COUNT(*)::text as record_count,
    '' as detail
  FROM amber_sessions
  UNION ALL SELECT '8_RECORD_COUNTS', 'amber_tasks', COUNT(*)::text, '' FROM amber_tasks
  UNION ALL SELECT '8_RECORD_COUNTS', 'board_notes', COUNT(*)::text, '' FROM board_notes
  UNION ALL SELECT '8_RECORD_COUNTS', 'focus_groups', COUNT(*)::text, '' FROM focus_groups
  UNION ALL SELECT '8_RECORD_COUNTS', 'focus_group_members', COUNT(*)::text, '' FROM focus_group_members
  UNION ALL SELECT '8_RECORD_COUNTS', 'group_focus_sessions', COUNT(*)::text, '' FROM group_focus_sessions
  UNION ALL SELECT '8_RECORD_COUNTS', 'group_session_participants', COUNT(*)::text, '' FROM group_session_participants
  UNION ALL SELECT '8_RECORD_COUNTS', 'group_invites', COUNT(*)::text, '' FROM group_invites
  UNION ALL SELECT '8_RECORD_COUNTS', 'boards', COUNT(*)::text, '' FROM boards
  UNION ALL SELECT '8_RECORD_COUNTS', 'blocking_sessions', COUNT(*)::text, '' FROM blocking_sessions
),

-- ============================================================================
-- SECTION 9: STATUS VALUES
-- ============================================================================
status_values AS (
  SELECT
    '9_AMBER_STATUS_VALUES' as section,
    status as value,
    COUNT(*)::text as count,
    '' as expected
  FROM amber_sessions
  GROUP BY status
),

-- ============================================================================
-- SECTION 10: DATA INTEGRITY CHECKS
-- ============================================================================
integrity_checks AS (
  SELECT '10_INTEGRITY' as section, 'groups_without_board' as check_name,
    COUNT(*)::text as result, 'should be 0' as expected
  FROM focus_groups WHERE board_id IS NULL
  UNION ALL
  SELECT '10_INTEGRITY', 'orphaned_group_focus_sessions',
    COUNT(*)::text, 'should be 0'
  FROM group_focus_sessions
  WHERE group_id NOT IN (SELECT id FROM focus_groups)
  UNION ALL
  SELECT '10_INTEGRITY', 'orphaned_board_notes',
    COUNT(*)::text, 'should be 0'
  FROM board_notes
  WHERE board_id NOT IN (SELECT id FROM boards)
  UNION ALL
  SELECT '10_INTEGRITY', 'orphaned_group_invites',
    COUNT(*)::text, 'should be 0'
  FROM group_invites
  WHERE group_id NOT IN (SELECT id FROM focus_groups)
  UNION ALL
  SELECT '10_INTEGRITY', 'amber_sessions_with_invalid_user',
    COUNT(*)::text, 'should be 0'
  FROM amber_sessions
  WHERE user_id NOT IN (SELECT id FROM auth.users) AND user_id IS NOT NULL
),

-- ============================================================================
-- SECTION 11: INDEXES
-- ============================================================================
indexes AS (
  SELECT
    '11_INDEXES' as section,
    tablename as table_name,
    indexname,
    '' as detail
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('amber_sessions', 'amber_tasks', 'board_notes', 'focus_groups',
        'focus_group_members', 'group_focus_sessions', 'group_session_participants', 'group_invites')
),

-- ============================================================================
-- SECTION 12: CRITICAL COLUMN TYPE VERIFICATION
-- ============================================================================
critical_columns AS (
  SELECT
    '12_CRITICAL_COLUMNS' as section,
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
),

-- ============================================================================
-- UNIFIED OUTPUT
-- ============================================================================
all_results AS (
  -- Section 1: Structures
  SELECT section, table_name, column_name, data_type, is_nullable, ordinal, '', '' FROM (
    SELECT section, table_name, column_name, data_type, is_nullable, ordinal, '', ''
    FROM table_structures
  ) t(section, table_name, column_name, data_type, is_nullable, ordinal, c1, c2)

  UNION ALL

  -- Section 2: Foreign Keys
  SELECT section, table_name, 'FK:', foreign_table || '(' || foreign_column || ')',
    delete_rule, update_rule, '', ''
  FROM foreign_keys

  UNION ALL

  -- Section 3: Primary Keys
  SELECT section, table_name, column_name, constraint_type, '', '', '', ''
  FROM primary_keys

  UNION ALL

  -- Section 4: Unique
  SELECT section, table_name, column_name, constraint_name, '', '', '', ''
  FROM unique_constraints

  UNION ALL

  -- Section 5A: RLS
  SELECT section, table_name, rls_enabled, '', '', '', '', ''
  FROM rls_status

  UNION ALL

  -- Section 5B: Policies
  SELECT section, table_name, policy_name, permissive, '', '', '', ''
  FROM rls_policies

  UNION ALL

  -- Section 6: Realtime
  SELECT section, table_name, status, '', '', '', '', ''
  FROM realtime_tables

  UNION ALL

  -- Section 7: Defaults
  SELECT section, table_name, column_name, default_value, '', '', '', ''
  FROM column_defaults

  UNION ALL

  -- Section 8: Counts
  SELECT section, table_name, record_count, '', '', '', '', ''
  FROM record_counts

  UNION ALL

  -- Section 9: Status
  SELECT section, value::text, count, expected, '', '', '', ''
  FROM status_values

  UNION ALL

  -- Section 10: Integrity
  SELECT section, check_name, result, expected, '', '', '', ''
  FROM integrity_checks

  UNION ALL

  -- Section 11: Indexes
  SELECT section, table_name, indexname, '', '', '', '', ''
  FROM indexes

  UNION ALL

  -- Section 12: Critical
  SELECT section, table_name, column_name, data_type || ' ' || status, '', '', '', ''
  FROM critical_columns
)

-- ============================================================================
-- FINAL OUTPUT
-- ============================================================================
SELECT * FROM all_results
ORDER BY section, column_name, data_type;
