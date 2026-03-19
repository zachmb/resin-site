# Resin Database Schema — Source of Truth

**Last Updated:** 2026-03-19
**Purpose:** Complete reference for all tables, columns, and relationships used by the Resin web app.

---

## 📊 Core Tables

### `amber_sessions` — Personal Notes & Plans
Stores all user notes and plans. Status determines whether it's a draft note or an activated amber plan.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to profiles(id) |
| `raw_text` | text | Full note content (markdown) |
| `display_title` | text | Note title |
| `status` | text | `'draft'` (saved note), `'scheduled'` (activated), `'completed'`, `'failed'`, `'canceled'`, `'processing'` |
| `created_at` | timestamp | Created time |
| `updated_at` | timestamp | Last modified time |
| `intensity` | numeric | Focus intensity (0.0-1.0) |
| `user_preferences` | text | JSON stored preferences |
| `is_on_map` | boolean | Whether note is visible on mind map |
| `position_x` | double | Mind map X coordinate |
| `position_y` | double | Mind map Y coordinate |
| `stakes_amount` | integer | Amount of stones at stake |
| `bonus_stones_awarded` | integer | Bonus stones from completion |
| `was_celebrated` | boolean | Whether celebration shown |
| `ritual_started_at` | timestamp | When focus session started |
| `schedulingerror` | text | Error message if scheduling failed |
| `needssync` | boolean | Sync flag for iOS |
| `description` | text | Additional description |

**Key Queries:**
- Draft notes (saved): `WHERE status = 'draft'`
- Amber plans (scheduled+): `WHERE status IN ('scheduled', 'completed', 'processing', 'failed')`
- User's notes: `WHERE user_id = $1 ORDER BY created_at DESC`

---

### `amber_tasks` — Subtasks within Amber Plans
Related to `amber_sessions` via `session_id`. Represents individual tasks/subtasks with calendar integration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `session_id` | uuid | Foreign key to amber_sessions(id) |
| `estimated_minutes` | integer | Time estimate |
| `start_time` | timestamp | Scheduled start |
| `end_time` | timestamp | Scheduled end |
| `calendar_event_id` | text | Google Calendar event ID |

---

### `board_notes` — Collaborative Group Notes
Stores sticky notes for collaborative group boards. Part of the group feature.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `board_id` | uuid | Foreign key to boards(id) |
| `user_id` | uuid | Author (profiles.id) |
| `title` | text | Note title |
| `content` | text | Note content |
| `color` | text | Display color (amber, green, blue, purple) |
| `created_at` | timestamp | Created time |
| `updated_at` | timestamp | Last modified time |

**Key Relationship:**
- `boards` → `focus_groups.board_id` (each group has one board for collaborative notes)

---

### `focus_groups` — Collaborative Group Containers
Stores group metadata and links to the collaborative board.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `name` | text | Group name |
| `description` | text | Group description |
| `created_by` | uuid | Creator (profiles.id) |
| `created_at` | timestamp | Created time |
| `updated_at` | timestamp | Last modified time |
| `board_id` | uuid | Foreign key to boards(id) — links to collaborative note board |

---

### `focus_group_members` — Group Membership
Controls who is in which group and their role.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `group_id` | uuid | Foreign key to focus_groups(id) |
| `user_id` | uuid | Foreign key to profiles(id) |
| `role` | text | `'admin'` or `'member'` |
| `joined_at` | timestamp | When user joined |

---

### `group_focus_sessions` — Group Focus Sessions
Scheduled and active focus sessions for groups.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `group_id` | uuid | Foreign key to focus_groups(id) |
| `created_by` | uuid | Creator (profiles.id) |
| `title` | text | Session title |
| `description` | text | Session description |
| `start_time` | timestamp | Start time |
| `duration_minutes` | integer | Duration |
| `max_participants` | integer | Maximum people |
| `status` | text | `'scheduled'`, `'active'`, `'completed'`, `'cancelled'` |

---

### `group_session_participants` — Session Join Records
Tracks who has joined which group focus session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `session_id` | uuid | Foreign key to group_focus_sessions(id) |
| `user_id` | uuid | Foreign key to profiles(id) |
| `joined_at` | timestamp | When user joined |
| `left_at` | timestamp | When user left (null if still in) |

---

### `group_invites` — Token-Based Group Invitations
Shareable invite links for joining groups.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `group_id` | uuid | Foreign key to focus_groups(id) |
| `token` | text | UNIQUE invite token (hex) |
| `created_by` | uuid | Creator (profiles.id) |
| `expires_at` | timestamp | Expiration time (default +7 days) |
| `max_uses` | integer | Max number of uses (default 100) |
| `uses_count` | integer | Current uses (increment on join) |
| `created_at` | timestamp | Created time |

---

## 🔄 Data Flow by Feature

### Save/Delete Notes (`/notes`)
```
POST /notes?/createNote   → INSERT amber_sessions (status='draft')
POST /notes?/saveNote     → INSERT OR UPDATE amber_sessions (status='draft')
POST /notes?/deleteNote   → DELETE FROM amber_sessions WHERE id=X AND user_id=Y
```

**RLS Silent Failure Check:** All deletes MUST verify `count > 0` after `.delete()`

### Activate Notes to Amber (`/amber`)
```
POST /amber?/activate     → UPDATE amber_sessions SET status='scheduled'
GET  /amber              → SELECT * FROM amber_sessions WHERE status IN ('scheduled', 'completed', 'failed')
```

### Group Collaboration (`/groups/[id]`)
```
POST /groups?/addNote       → INSERT board_notes (via boards)
POST /groups?/scheduleSession → INSERT group_focus_sessions
POST /groups?/joinSession   → INSERT group_session_participants
```

### Realtime Sync (Supabase Broadcast)
```
Channel: user:{userId}:amber
├── DELETE on amber_sessions
├── UPDATE on amber_sessions
├── DELETE on blocking_sessions
└── UPDATE on blocking_sessions

Channel: group-board:{boardId}
└── DELETE/INSERT/UPDATE on board_notes

Channel: group-focus:{groupId}
└── DELETE/INSERT/UPDATE on group_focus_sessions
```

---

## 🔐 Security Rules

### Authentication
- **All mutations** must use `getUser()` (NOT `getSession()`)
- `getUser()` validates token server-side, `getSession()` trusts cookies

### RLS Policies
- `amber_sessions`: User can only see/modify their own rows
- `board_notes`: Only group members can view/edit
- `group_focus_sessions`: Only group members can join
- `group_invites`: Only admins can create, only members can view

### Silent Failures
Delete operations must check:
```typescript
const { count, error } = await supabase.from(table).delete()...;

if (error) return fail(500, { error: 'Database error' });
if (!count || count === 0) return fail(403, { error: 'RLS silent failure' });
```

---

## 📋 Data Normalization

### Column Name Mapping
- `amber_sessions`: Uses `raw_text` + `display_title` (NOT `content` + `title`)
- `board_notes`: Uses `title` + `content` (NOT `raw_text` + `display_title`)

**When querying amber_sessions:**
```typescript
const notes = data.map(n => ({
  id: n.id,
  title: n.display_title ?? n.title ?? '',
  content: n.raw_text ?? n.content ?? ''
}));
```

---

## ✅ Verification Checklist

- [ ] All `getSession()` calls replaced with `getUser()` in server actions
- [ ] All deletes check `count > 0` for RLS silent failures
- [ ] Realtime subscriptions filter by `user_id` where applicable
- [ ] Optimistic UI removes item before server response
- [ ] Rollback mechanism on delete failure
- [ ] Error responses include error code for client handling

---

## 🔗 Useful SQL Queries

```sql
-- Count all user's notes and plans
SELECT status, COUNT(*) FROM amber_sessions WHERE user_id=$1 GROUP BY status;

-- Find broken group links
SELECT id, name, board_id FROM focus_groups WHERE board_id IS NULL;

-- List active group sessions with participants
SELECT g.name, s.title, COUNT(p.id) as participants
FROM group_focus_sessions s
JOIN focus_groups g ON s.group_id = g.id
LEFT JOIN group_session_participants p ON s.id = p.session_id
WHERE s.status = 'active'
GROUP BY g.id, s.id;

-- Check invite expiry
SELECT token, group_id, expires_at FROM group_invites
WHERE expires_at < NOW() AND uses_count > 0;
```

---

**Version History:**
- 2026-03-19: Initial comprehensive audit and documentation
