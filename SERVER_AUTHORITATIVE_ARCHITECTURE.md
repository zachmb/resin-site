# Server-Authoritative Root System: Complete Architecture

## Overview

This document describes the refactored Resin blocking architecture where **the server is the single source of truth** for blocking state. All platforms (iOS, Chrome Extension, Web) make real-time decisions based on server-authoritative data, not local time windows.

**Core Principle:**
> A user's decision to activate a note on the web triggers an instant, atomicblock across all devices simultaneously. The client never decides when blocking ends.

---

## 1. The "Sap-to-Hardening" Flow (Critical Path)

### Step 1a: User Activates Note on Web (Sap)

```
User: "I'm activating this brain dump as a focus plan"
              ↓
resinsite/src/routes/amber/+page.server.ts (activate action)
  → Extract task times (startTime, endTime)
  → Determine which categories to block (youtube, reddit, etc.)
  → Call create-block-from-session Edge Function
```

### Step 1b: Server Creates Authoritative Blocks (Sap Flows Root)

```
create-block-from-session Edge Function:
  1. Verify user authentication
  2. Fetch amber_sessions to get task times
  3. For each category_id in [youtube, reddit, ...]:
       INSERT INTO active_blocks (
         user_id, category_id, session_id,
         server_start_time, server_end_time
       )
  4. Database trigger fires → calls send-block-notification
  5. Edge Function sends APNs to user's iOS devices
  6. Supabase Realtime broadcasts change to all subscribed clients
```

**Key:** Timestamps are set by the **server**, not the client. Column names are `server_start_time` and `server_end_time` to emphasize this.

### Step 1c: iOS Receives APNs & Wakes (Hardening on Device 1)

```
APNs Payload (from server):
{
  "aps": {
    "content-available": 1  // Silent notification
  },
  "block_event": "created",
  "block_ids": ["uuid-1", "uuid-2"],
  "policy_version": "1.0"
}
                ↓
AppDelegate.userNotificationCenter(didReceive:)
  → Calls DeviceTokenService.handleBlockNotification()
  → Calls AppBlockingService.syncServerAuthoritativeBlocks()
                ↓
AppBlockingService.syncServerAuthoritativeBlocks():
  1. Calls fetchBlockingPolicy() → GET-BLOCK-POLICY Edge Function
  2. Server returns: { blocks: [{ id, category_id, is_active, server_start_time, server_end_time }] }
  3. For each active block:
       scheduleBlockedCategory(categoryId, serverStartTime, serverEndTime)
  4. Applies FamilyActivitySelection to ManagedSettingsStore
  5. Shield is live within <5 seconds of web activation
```

### Step 1d: Chrome Extension Receives Real-Time Update (Hardening on Device 2)

```
background-realtime.ts (Service Worker):
  • Has active Supabase Realtime subscription on active_blocks table
                ↓
Supabase broadcasts: INSERT active_blocks
                ↓
realtimeSubscription.on('postgres_changes', ...)
  → Debounce 2000ms (coalesce rapid changes)
  → Calls fetchPolicyAndUpdateRules()
                ↓
fetchPolicyAndUpdateRules():
  1. Calls GET-BLOCK-POLICY Edge Function (same as iOS)
  2. For each active block with category_id:
       Fetch resin_categories[category_id].chrome_url_patterns
  3. Create declarativeNetRequest rules for all patterns
       updateDynamicRules({ removeRuleIds: [...], addRules: [...] })
  4. Blocking is live on Chrome within <10 seconds
```

### Step 1e: Web (Resinsite) Shows Live Status

```
+page.svelte subscribes to active_blocks via Supabase Realtime
  → Shows badge: "🔒 Blocking active for YouTube, Reddit"
  → Displays countdown: "Time remaining: 1h 45m"
  → Button: "End block early" (calls cancel-block Edge Function)
```

---

## 2. Database Schema (Server-Authoritative Root)

### resin_categories (Canonical Mapping)

```sql
CREATE TABLE resin_categories (
  id UUID PRIMARY KEY,
  category_id TEXT UNIQUE NOT NULL,  -- "youtube", "reddit", "instagram", ...
  display_name TEXT NOT NULL,
  description TEXT,

  -- Chrome patterns: ["youtube.com/*", "*.youtube.com/*", ...]
  chrome_url_patterns JSONB NOT NULL DEFAULT '[]',

  -- iOS tokens: { "app_tokens": [...], "category_tokens": [...] }
  -- Populated by iOS clients when they upload tokens
  ios_tokens_json JSONB DEFAULT '{}',

  block_type TEXT DEFAULT 'website',  -- 'app' | 'website' | 'category'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allows all users to READ (shared reference), only admin to WRITE
```

**Purpose:** Maps a semantic category ID (youtube) to its technical identifiers:
- Web: URL patterns for declarativeNetRequest
- iOS: FamilyActivitySelection tokens (when uploaded by user)

---

### active_blocks (Authoritative State)

```sql
CREATE TABLE active_blocks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  category_id TEXT REFERENCES resin_categories(category_id),
  session_id UUID REFERENCES amber_sessions(id),  -- Origin

  -- SERVER-SET TIMESTAMPS (immutable via RLS)
  server_start_time TIMESTAMPTZ NOT NULL,
  server_end_time TIMESTAMPTZ NOT NULL,

  -- Client-only fields
  acknowledged_at TIMESTAMPTZ,
  acked_by_platform TEXT,  -- 'ios' | 'extension' | 'web'

  cancelled_by_user_at TIMESTAMPTZ,  -- Soft delete

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users see only their blocks
-- Can UPDATE: acknowledged_at only (not server_*_time)
-- Cannot INSERT/DELETE directly (only via Edge Functions)
```

**Key Insight:** `server_start_time` and `server_end_time` are computed once by the server and are **never modified by clients**. RLS enforces this. The column names themselves emphasize ownership.

```sql
-- RLS Policy: Users can only acknowledge (read + update acknowledged_at)
create policy "Users can acknowledge blocks" on public.active_blocks
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id AND
    OLD.server_start_time = NEW.server_start_time AND
    OLD.server_end_time = NEW.server_end_time
  );
```

This triggers a database error if client tries to modify timestamps.

---

### ios_token_registry (Bridge Layer)

```sql
CREATE TABLE ios_token_registry (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  category_id TEXT REFERENCES resin_categories(category_id),
  token_base64 TEXT NOT NULL,  -- Base64 of FamilyActivitySelection.Token
  token_type TEXT,  -- 'app' | 'category' | 'web_domain'

  app_bundle_id TEXT,
  app_name TEXT,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_confirmed_at TIMESTAMPTZ
);
```

**Purpose:** Allows iOS clients to say "my opaque token X corresponds to category youtube". Server then knows to include that token when sending category blocks to the device.

---

## 3. Edge Functions (Server-Side Logic)

### GET-BLOCK-POLICY (Source of Truth)

**Endpoint:** `POST /functions/v1/get-block-policy`

**Request:**
```json
{
  "categories_requested": ["youtube", "reddit"],  // optional
  "platform": "ios" | "extension" | "web",
  "device_id": "string"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "timestamp": "2026-03-19T14:30:00Z",
  "blocks": [
    {
      "id": "uuid",
      "category_id": "youtube",
      "is_active": true,
      "server_start_time": "2026-03-19T14:30:00Z",
      "server_end_time": "2026-03-19T16:30:00Z",
      "seconds_remaining": 3600
    }
  ],
  "signature": "hmac-sha256(...)"
}
```

**Logic:**
1. Verify JWT token
2. Query `active_blocks` where `user_id = auth.uid()`
3. Filter to blocks where `now() BETWEEN server_start_time AND server_end_time AND cancelled_by_user_at IS NULL`
4. Compute `is_active`, `seconds_remaining` on the server
5. Sign response to prevent tampering
6. Return

**Critical:** Clients never compute `is_active`. They only call this function and trust the response.

---

### CREATE-BLOCK-FROM-SESSION (Sap → Hardening Trigger)

**Endpoint:** `POST /functions/v1/create-block-from-session`

**Request:**
```json
{
  "session_id": "uuid",
  "category_ids": ["youtube", "reddit"],
  "block_entire_session": true
}
```

**Logic:**
1. Verify user owns the session
2. Fetch session tasks to get start/end times
3. Validate duration > 0 and end_time > now
4. For each category_id:
     ```sql
     INSERT INTO active_blocks (
       user_id, category_id, session_id,
       server_start_time, server_end_time
     )
     ```
5. Database trigger fires → `send-block-notification` function
6. Returns created blocks

**Important:** Timestamps are set here, computed from the session's tasks. Client cannot override.

---

### SEND-BLOCK-NOTIFICATION (APNs Trigger)

Triggered by database trigger when `active_blocks` row is inserted.

**Logic:**
1. Fetch user's device tokens from `user_apns_tokens` table
2. For each iOS device:
     - Create JWT signed with Apple P-8 key
     - POST to APNs endpoint with silent notification payload
3. Supabase Realtime automatically broadcasts change to subscribers

---

## 4. Client Implementation

### iOS (AppBlockingService + Extensions)

**Real-Time Flow:**

```
1. App launch:
   → restoreBlockingStateOnLaunch()
   → Calls syncServerAuthoritativeBlocks()

2. APNs notification received:
   → handleBlockNotification()
   → Calls syncServerAuthoritativeBlocks()

3. User manually opens app:
   → Can manually call syncServerAuthoritativeBlocks()
   → Updates policy every 60 seconds (background task)

syncServerAuthoritativeBlocks():
  a) Call GET-BLOCK-POLICY Edge Function
  b) For each block in response:
       scheduleBlockedCategory(categoryId, serverStartTime, serverEndTime)
  c) Apply FamilyActivitySelection to shield
  d) Upload acknowledgment to server
```

**No Local Time Windows:** iOS never checks `Date() > sessionStart`. It only uses times from the server.

---

### Chrome Extension (background-realtime.ts)

**Real-Time Flow:**

```
1. Service Worker startup:
   → setupRealtimeListener()
   → Subscribe to active_blocks table via Supabase Realtime

2. Postgres change detected:
   → Debounce 2000ms
   → fetchPolicyAndUpdateRules()

3. Periodic fallback:
   → chrome.alarms fires every 1 minute
   → Reconnects Realtime if needed
   → Calls fetchPolicyAndUpdateRules()

fetchPolicyAndUpdateRules():
  a) Call GET-BLOCK-POLICY Edge Function
  b) For each block with category_id:
       Fetch resin_categories[category_id].chrome_url_patterns
  c) Create DNR rules for all patterns
  d) Apply atomically
```

**Realtime + Fallback:** Realtime is primary (instant), alarm is fallback (max 60s delay).

---

## 5. Real-Time Propagation Timeline

```
T=0:00s  Web: User clicks "activate"
         → Inserts into amber_sessions, calls create-block-from-session

T=0:01s  Server: INSERT active_blocks
         → Postgres trigger fires send-block-notification
         → APNs queued for iOS
         → Supabase Realtime broadcasts to subscribers

T=0:02s  iOS: APNs received
         → If foreground: immediate sync
         → If backgrounded: woken up, ~2-3 seconds to exec
         → Calls syncServerAuthoritativeBlocks

T=0:04s  iOS: Shield is applied

T=0:02s  Extension: Realtime channel receives change
         → Callback fires immediately
         → Debounce starts (wait 2000ms for more changes)

T=0:04s  Extension: Debounce elapsed
         → fetchPolicyAndUpdateRules() called
         → GET-BLOCK-POLICY called

T=0:05s  Extension: DNR rules updated, blocking active

TOTAL: From web activation to Chrome blocking: ~5 seconds (real-time)
       From web activation to iOS blocking: ~4 seconds (APNs)
       FALLBACK: If all else fails, alarm catches it within 60 seconds
```

---

## 6. Offline Reconciliation

### iPhone Offline (WiFi down)

```
Scenario:
  1. iPhone offline, web activates a plan
  2. APNs cannot be delivered
  3. iPhone comes online

Flow:
  1. App enters foreground
  2. Calls syncServerAuthoritativeBlocks()
  3. Fetches GET-BLOCK-POLICY from server
  4. Server returns active blocks (even though time has passed)
  5. Applies blocking immediately

No data loss: Active blocks persist on server until server_end_time expires.
```

### Extension Offline

```
Scenario:
  1. Extension sleeping/not polling
  2. Web activates a plan
  3. Extension wakes up

Flow:
  1. chrome.alarms fires (after ≤60s)
  2. Calls fetchPolicyAndUpdateRules()
  3. Detects active block, applies DNR rules

Or:
  1. Realtime WebSocket reconnects
  2. Receives queued postgres_change events
  3. Immediately syncs policy
```

---

## 7. Preventing Client-Side Bypass

### Vulnerability: Client Decides When to Stop Blocking

**Old System:**
```swift
// ❌ BAD: Client-computed
let isActive = now >= session.startTime && now < session.endTime
if isActive { applyShield() }
else { clearShield() }  // Client decides blocking ends!
```

**New System:**
```swift
// ✅ GOOD: Server-computed
let policy = await fetchBlockingPolicy()  // Server decides
for block in policy.blocks {
  if block.is_active {  // Server says so
    applyShield()
  }
}
```

### Vulnerability: Modify Timestamps in UserDefaults

**Old System:**
```swift
let sessionEndTime = userDefaults.object(forKey: "sessionEndTime") as? TimeInterval
// User can edit this value with a debugger
userDefaults.set(Date().timeIntervalSince1970, forKey: "sessionEndTime")  // Cheat!
```

**New System:**
```
// No end times stored locally
// Only fetch from server (server_end_time is in Supabase, not on device)
```

### Vulnerability: Force-Quit the App to Clear Shield

**Old System:**
```
App killed → ManagedSettingsStore cleared → Blocking stops
(Until Monitor extension reapplies it)
```

**New System:**
```
Monitor extension runs independently on server_*_time schedule.
Even if app is killed, extension continues blocking until server_end_time.
If user force-quits both, they need to:
  1. Kill the entire Screen Time infrastructure (requires passcode)
  2. Disable Resin from Screen Time settings
```

### Still Possible Bypasses (Accept These)

1. **User disables Screen Time permission** → Resin cannot block. Accept: intentional choice.
2. **Force-kill iOS entirely** → All blocking stops. Accept: rebooting resets everything.
3. **Modify DNS/use VPN** → Bypass Chrome Extension. Accept: requires technical knowledge; server still thinks they're blocked.

---

## 8. Implementation Checklist

### Phase 1: Database & Edge Functions
- [ ] Apply `server_authoritative_schema.sql` migration
- [ ] Deploy `get-block-policy` Edge Function
- [ ] Deploy `create-block-from-session` Edge Function
- [ ] Deploy `send-block-notification` Edge Function
- [ ] Set up APNs certificate in Supabase
- [ ] Enable Realtime publishing on `active_blocks` table
- [ ] Create database trigger for `send-block-notification`

### Phase 2: Chrome Extension
- [ ] Rename `background.ts` to `background-polling.ts` (backup)
- [ ] Use `background-realtime.ts` as new main background service worker
- [ ] Update manifest.json to reference new file
- [ ] Test Realtime connection in DevTools
- [ ] Verify DNR rules update instantly on policy change

### Phase 3: iOS
- [ ] Add `AppBlockingService+ServerAuthoritative.swift` extension
- [ ] Add `DeviceTokenService+APNsHandler.swift` extension
- [ ] Update `AppDelegate` to register `NotificationDelegate`
- [ ] Call `uploadIOSTokensToServer()` when user updates blocking selection
- [ ] Test APNs delivery in Xcode console
- [ ] Verify shield applies within 5 seconds of web activation

### Phase 4: Web
- [ ] Update `amber/+page.server.ts` to call `create-block-from-session` instead of direct insert
- [ ] Add UI to show live block status (countdown, active categories)
- [ ] Add "Cancel block early" button that calls `cancel-block` Edge Function
- [ ] Subscribe to `active_blocks` for real-time status updates

### Phase 5: Testing
- [ ] End-to-end test: Activate plan on web → Shield on iOS within 5s → DNR on extension within 10s
- [ ] Test offline: Activate while iOS offline → Shield applies when online
- [ ] Test timeout: Verify shield auto-clears at server_end_time
- [ ] Test bypass prevention: Modify UserDefaults → verify server policy still enforced
- [ ] Test APNs failure: Disable APNs → fallback alarm activates within 60s

---

## 9. Monitoring & Debugging

### Audit Trail (block_audit_log table)

```sql
SELECT * FROM block_audit_log
WHERE user_id = '...'
ORDER BY created_at DESC
LIMIT 20;

-- Events: 'created', 'acknowledged', 'cancelled', 'expired', 'policy_requested'
```

### Real-Time Status (Chrome DevTools)

```javascript
// In extension console
chrome.declarativeNetRequest.getDynamicRules().then(rules => {
  console.log('Active DNR rules:', rules.length);
});

// Check last policy fetch
chrome.storage.local.get(['lastSynced'], (data) => {
  console.log('Last sync:', new Date(data.lastSynced));
});
```

### iOS Debugging (Xcode Console)

```
[AppBlockingService] ✅ Received policy with 2 active blocks
[AppBlockingService] ✅ Scheduled block <uuid> until 2026-03-19 16:30:00
[Monitor] Interval started, applying shield
[Monitor] Shield applied: 2 apps, 3 categories
```

---

## 10. Future Enhancements

1. **iOS Token Upload:** Current implementation has placeholders for token encoding. Implement full PropertyListEncoder serialization once FamilyActivitySelection.Token serialization is determined.

2. **Smart Category Assignment:** Let server recommend categories based on app usage analytics. E.g., "You use YouTube for 3h/day; auto-block during focus?"

3. **Graduated Escalation:** Start with gentle reminder block → soft block (grayed out) → hard block → can't bypass.

4. **Cross-Device Coordination:** Show which devices are blocked. E.g., "Blocking on iPhone and Chrome. Not blocking on iPad (out of date)."

5. **Server-Side Rules Engine:** Move all business logic to server. E.g., "Auto-extend block if user tries to re-enable within 10 minutes."

---

## 11. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (Source of Truth)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Supabase Postgres                                        │  │
│  │  - active_blocks (timestamps set here, never modified)   │  │
│  │  - resin_categories (URL patterns, iOS tokens)           │  │
│  │  - ios_token_registry (device → category mapping)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │ Edge Functions (Server-Side Logic)                       │   │
│  │  - get-block-policy (👈 SOURCE OF TRUTH)               │   │
│  │  - create-block-from-session (Sap → Hardening)         │   │
│  │  - send-block-notification (APNs trigger)              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│           ┌──────────────────┼──────────────────┐               │
│           │ Postgres Trigger │ Realtime Channel │ APNs Service  │
│           ▼                  ▼                  ▼               │
└───────────┬──────────────────┬──────────────────┬───────────────┘
            │                  │                  │
            │                  │                  │ (Silent Push)
            │                  │ (WebSocket)      │
    ┌───────▼────────┐   ┌────▼──────────┐   ┌──▼─────────────┐
    │                │   │                │   │                │
    │  iOS Device    │   │ Chrome Browser │   │   (APNs from   │
    │                │   │  (Extension)   │   │    Apple)      │
    │ ┌────────────┐ │   │ ┌────────────┐ │   └────────────────┘
    │ │AppDelegate │ │   │ │background- │ │
    │ │receives    │ │   │ │realtime.ts │ │
    │ │APNs        │ │   │ │            │ │
    │ └────┬───────┘ │   │ │Subscribe:  │ │
    │      │         │   │ │active_blocks
    │      ▼         │   │ │            │ │
    │ ┌────────────┐ │   │ │On change:  │ │
    │ │AppBlocking │ │   │ │call get-   │ │
    │ │Service     │ │   │ │block-      │ │
    │ │            │ │   │ │policy()    │ │
    │ │syncServer  │ │   │ │            │ │
    │ │Authorit...│ │   │ │Update DNR  │ │
    │ │            │ │   │ │rules       │ │
    │ │calls:      │ │   │ └────────────┘ │
    │ │get-block-  │ │   └────────────────┘
    │ │policy()    │ │
    │ └────┬───────┘ │
    │      │         │
    │      ▼         │
    │ ┌────────────┐ │
    │ │Managed     │ │
    │ │Settings    │ │
    │ │Store       │ │
    │ │(shield on) │ │
    │ └────────────┘ │
    │                │
    └────────────────┘

Flow: Web activation → active_blocks INSERT
      → Postgres trigger → send-block-notification APNs
      → APNs wakes iOS
      → iOS calls get-block-policy (👈 Server decides: is_active=true)
      → iOS applies shield

OR:   Web activation → active_blocks INSERT
      → Supabase Realtime broadcast
      → Extension Realtime channel receives
      → Extension calls get-block-policy (👈 Server decides: is_active=true)
      → Extension updates DNR rules
```

---

## Summary

**The "Server-Authoritative Root" System ensures:**

✅ **Single Source of Truth** — Server computes all blocking decisions
✅ **Real-Time Propagation** — Active blocks reach devices within seconds (APNs + Realtime)
✅ **Client-Proof Enforcement** — Timestamps and decisions are server-side, client just executes
✅ **Offline Resilience** — Server remembers blocks; clients sync when online
✅ **Atomic Updates** — All platforms see consistent state
✅ **Audit Trail** — Every decision logged server-side

**Clients are no longer "Root"** — they cannot decide when blocking ends. They only request policy from the server and apply what the server says.
