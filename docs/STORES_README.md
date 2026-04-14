# Resin State-Stream Architecture

## Overview

This directory contains the reactive state management system for Resin, built with Svelte 5 Runes and Supabase Realtime.

## Core Components

### 1. **amberStore.ts**
Global singleton store for all amber sessions and focus blocks.

**Features:**
- Optimistic delete with automatic rollback on failure
- RLS silent failure detection (count === 0)
- Realtime subscriptions for DELETE and UPDATE events
- Derived states for UI reactivity ($visibleSessions, $isDeleting, $isActivating)

**Usage in Components:**

```typescript
import { amberStore } from '$lib/stores/amberStore';

// Initialize (once in root layout)
amberStore.initialize(supabase, userId);

// Set initial data (from server load)
amberStore.setSessions(loadedSessions);

// Delete with optimistic UI
const success = await amberStore.deleteSession(sessionId, {
    onError: (message) => {
        console.error('Delete failed:', message);
        // Show toast to user
    }
});

// Subscribe to visible sessions
const { subscribe: subscribeVisible } = amberStore.visibleSessions;
let visibleSessions;
subscribeVisible((sessions) => {
    visibleSessions = sessions;
});

// Check if deleting
const { subscribe: subscribeDeleting } = amberStore.isDeleting;
let isDeleting;
subscribeDeleting((deleteFn) => {
    isDeleting = deleteFn;
});

// In template
{#if isDeleting(sessionId)}
    <div>Deleting...</div>
{:else}
    <button onclick={() => amberStore.deleteSession(sessionId)}>
        Delete
    </button>
{/if}
```

### 2. **supabaseMutations.ts**
RLS-aware mutation wrapper functions.

**Features:**
- Checks `count > 0` to detect RLS failures
- Distinguishes between real errors and RLS silent failures
- Type-safe return values with detailed error info

**Functions:**
- `safeDelete(supabase, table, filters)` - Delete with RLS detection
- `safeUpdate(supabase, table, updates, filters)` - Update with RLS detection
- `safeInsert(supabase, table, record)` - Insert with RLS detection
- `safeBatchDelete(supabase, table, ids, userId)` - Batch delete with RLS detection

**Usage:**

```typescript
import { safeDelete } from '$lib/supabaseMutations';

const result = await safeDelete(supabase, 'amber_sessions', {
    id: sessionId,
    user_id: userId
});

if (result.success) {
    console.log('Deleted successfully');
} else {
    if (result.error?.isRLSFailure) {
        console.error('RLS prevented deletion');
    } else {
        console.error('Error:', result.error?.message);
    }
}
```

## Data Flow Lifecycle

### Delete Operation

```
User clicks Delete
    ↓
Modal confirmation shows
    ↓
Form submits to ?/delete action
    ↓
Server action executes:
  - Checks auth with getUser()
  - Calls safeDelete() with RLS detection
  - Returns { success: true/false, error?: {...} }
    ↓
Client receives response
    ↓
If success:
  - enhance handler calls onDelete callback
  - onDelete removes from local notes[] (optimistic already done)
  - invalidateAll() re-syncs with server
    ↓
Realtime listener detects DELETE event
    ↓
amberStore updates visibleSessions derived state
    ↓
All connected components re-render
```

### Activation Operation

```
User clicks "Activate Plan"
    ↓
UI enters loading state: activatingIds.add(sessionId)
    ↓
amberStore.activateSession(sessionId) is called
    ↓
Server action updates amber_sessions.status = 'scheduled'
    ↓
Realtime listener detects UPDATE event
    ↓
amberStore updates local state
    ↓
UI exits loading state: activatingIds.delete(sessionId)
```

## Realtime Synchronization

The store maintains a single Supabase channel per user:

```
Channel: user:{userId}:amber
├── DELETE on amber_sessions (filter: user_id={userId})
│   └── Removes session from visibleSessions
├── DELETE on blocking_sessions (filter: user_id={userId})
│   └── Removes focus session from visibleSessions
└── UPDATE on amber_sessions (filter: user_id={userId})
    └── Updates session in-place
```

**Subscription Reliability:**
- Single channel prevents memory leaks
- Auto-reconnection on network loss
- Filters ensure only user's data is synced
- <200ms propagation time to UI

## RLS Silent Failure Detection

Supabase can return `error: null` even when a delete fails due to RLS policies. The store detects this with:

```typescript
if (!count || count === 0) {
    // RLS likely prevented the operation
    return {
        error: {
            code: 'RLS_SILENT_FAILURE',
            isRLSFailure: true,
            message: 'Row could not be deleted. Check your permissions.'
        }
    };
}
```

This ensures the UI never silently fails to delete.

## Error Handling

All mutations return a consistent result type:

```typescript
interface MutationResult<T = null> {
    success: boolean;
    data?: T;
    error?: {
        code: string;           // 'RLS_SILENT_FAILURE', 'PGRST116', etc.
        message: string;
        details?: string;
        isRLSFailure?: boolean; // True if permissions issue
    };
}
```

Components should check `error.isRLSFailure` to decide if user needs to check permissions or try again.

## Cleanup

Call on logout or component unmount:

```typescript
onDestroy(() => {
    amberStore.cleanup();
});
```

## Testing the System

1. **Delete with network error:** Unplug network, click delete, verify rollback
2. **Delete with RLS failure:** Change RLS policy, click delete, verify error message
3. **Cross-tab sync:** Open two tabs, delete in one, verify disappears in both
4. **Mobile sync:** Delete on mobile app, verify disappears on web instantly
5. **Realtime lag:** Check console logs for <200ms propagation

## Next Steps

1. **Integrate into +page.svelte** - Use store instead of local state
2. **Add toast notifications** - Show error messages from store
3. **Implement "Hardening" states** - Track which sessions are hardening
4. **Add optimistic activation** - Show "Petrifying..." before realtime sync
