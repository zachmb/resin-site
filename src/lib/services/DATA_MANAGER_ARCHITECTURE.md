# Data Manager Architecture

## Overview

Local-first data loading with silent background synchronization. Pages load instantly from cache, then fetch fresh data without blocking the UI.

## The Three-Step Flow

### Step 1: Instant Load (Milliseconds)
```typescript
const cachedData = dataManager.getInitialData();
// Returns: cached data if available, null otherwise
// Effect: Page renders immediately with old data
// Logs: "[DataManager:notes_data] ✓ Loaded from cache (age: 2341ms)"
```

### Step 2: Background Sync (Silent)
```typescript
await dataManager.syncInBackground();
// Fetches fresh data from API
// Updates cache automatically
// Calls onDataUpdate callback when ready
// Effect: UI updates smoothly with new data
// Logs: "[DataManager:notes_data] 🔄 Starting background sync..."
//       "[DataManager:notes_data] ✓ Received fresh data (12547 bytes)"
//       "[DataManager:notes_data] 💾 Cached fresh data"
//       "[DataManager:notes_data] ✨ Component notified of update"
```

### Step 3: Error Handling
```typescript
// If sync fails, calls onError callback
// Component decides how to handle (show toast, retry, etc.)
// Logs: "[DataManager:notes_data] ✗ Sync failed: HTTP 500"
```

## File Structure

```
src/lib/services/
├── localCache.ts          # Low-level browser storage
├── DataManager.ts         # Main data loading orchestrator
├── backgroundSync.ts      # (Deprecated - use DataManager instead)
└── DATA_MANAGER_ARCHITECTURE.md (this file)
```

### localCache.ts
Handles localStorage operations with versioning:
- `setCacheData(key, data)` - Store data with metadata
- `getCacheData(key)` - Retrieve data or null
- `getCacheTimestamp(key)` - Get when data was cached
- `isCacheStale(key, maxAgeMs)` - Check if cache is old

### DataManager.ts
Orchestrates the entire flow:
```typescript
new DataManager({
    cacheKey: 'notes_data',           // localStorage key
    apiEndpoint: '/api/notes/data',   // where to fetch
    onDataUpdate: (data) => {},        // when new data arrives
    onError: (error) => {}             // when sync fails
})
```

## Usage Example

### Notes Page (`+page.svelte`)

```typescript
import { createNotesDataManager } from '$lib/services/DataManager';

let dataManager: DataManager;
let notes = $state<any[]>([]);
let profile = $state<any>(null);

onMount(() => {
    // Create manager with callbacks
    dataManager = createNotesDataManager(
        // When fresh data arrives
        (freshData) => {
            notes = freshData.notes || [];
            profile = freshData.profile || null;
        },
        // When sync fails
        (error) => {
            console.error('Sync failed:', error);
            showToast(`Failed to sync: ${error.message}`);
        }
    );

    // Load from cache (instant)
    const cachedData = dataManager.getInitialData();
    if (cachedData) {
        notes = cachedData.notes || [];
        profile = cachedData.profile || null;
    }

    // Start background fetch (silent)
    dataManager.syncInBackground();
});
```

## Debugging Guide

All operations log with consistent format:
```
[DataManager:CACHE_KEY] EMOJI MESSAGE
```

Emojis indicate state:
- `✓` Success operation completed
- `🔄` Operation in progress
- `💾` Data persisted
- `✨` Component notified
- `✗` Error occurred
- `⏸` Operation skipped
- `🗑` Cleanup operation
- `🚨` Force operation

### Example Debug Session

```
[DataManager:notes_data] ✓ Loaded from cache (age: 2341ms)
[notes:page] Loaded from cache
[notes:page] Starting background sync...
[DataManager:notes_data] 🔄 Starting background sync...
[DataManager:notes_data] ✓ Received fresh data (12547 bytes)
[DataManager:notes_data] 💾 Cached fresh data
[DataManager:notes_data] ✨ Component notified of update
[notes:page] Received fresh data from DataManager
```

## Performance Characteristics

| Operation | Time | Blocking |
|-----------|------|----------|
| Initial page load | 0ms | ✓ (shows cache) |
| Background sync | 100-500ms | ✗ (silent) |
| Cache read | <1ms | N/A |
| Cache write | <1ms | N/A |

## Error Scenarios

### Scenario 1: Cache Miss + Sync Succeeds
```
→ Load: Returns null (no cache)
→ Sync: Fetches data, updates cache
→ User sees empty page briefly, then filled
```

### Scenario 2: Cache Hit + Sync Fails
```
→ Load: Returns cached data
→ Sync: Fails, calls onError
→ User sees stale data, toast shows error
```

### Scenario 3: Cache Hit + Sync Succeeds
```
→ Load: Returns cached data
→ Sync: Fetches fresh data
→ User sees old data, then smoothly updates
```

## API Endpoints Required

These endpoints must return data in this format:

### `/api/notes/data`
```json
{
  "notes": [{ id, title, content, created_at, status }],
  "profile": { id, email, timezone },
  "connections": { noteId: { outgoing: [], incoming: [] } },
  "sharedWithMe": [{ id, title, owner_id }],
  "friends": [{ id, friendship_id }],
  "timestamp": 1234567890
}
```

### `/api/amber/data`
```json
{
  "sessions": [{ id, title, status, amber_tasks }],
  "profile": { id, email, timezone },
  "jointPlans": [{ id, title }],
  "timestamp": 1234567890
}
```

## Cache Keys

- `notes_data` - Full notes page data
- `amber_data` - Full amber page data

Data stored in localStorage as:
```javascript
localStorage.getItem('resin_cache_notes_data')
// Returns:
{
  "data": { ... },
  "timestamp": 1234567890,
  "version": 1
}
```

## Best Practices

1. **Always create with factory functions**
   ```typescript
   const mgr = createNotesDataManager(onUpdate, onError);
   ```

2. **Load cache first, then sync**
   ```typescript
   const cached = mgr.getInitialData();
   if (cached) { updateUI(cached); }
   mgr.syncInBackground();
   ```

3. **Handle errors gracefully**
   ```typescript
   mgr.syncInBackground();
   // Don't await - let it fail silently with error callback
   ```

4. **Use for other data types**
   ```typescript
   new DataManager({
     cacheKey: 'my_data',
     apiEndpoint: '/api/my-data',
     onDataUpdate: handleNewData,
     onError: handleSyncError
   })
   ```

## Future Enhancements

- [ ] TTL-based cache expiration
- [ ] Partial sync (only fetch changed items)
- [ ] Offline detection (don't sync if no connection)
- [ ] Request deduplication (multiple callers, one fetch)
- [ ] Cache versioning strategy
- [ ] Sync retry with exponential backoff
