# Instant Loading Architecture

## What Changed

Pages now load **instantly** from browser cache and update **silently** in the background. Database fetches never block the UI.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/DataManager.ts` | Core orchestrator - handles cache + sync |
| `src/lib/services/localCache.ts` | Browser storage layer |
| `src/lib/services/DATA_MANAGER_ARCHITECTURE.md` | Detailed architecture docs |
| `src/routes/api/notes/data/+server.ts` | Notes data endpoint |
| `src/routes/api/amber/data/+server.ts` | Amber data endpoint |

## How It Works

### Before (Old Pattern)
```
User visits /notes
  ↓
Server load() fetches from database (BLOCKS)
  ↓
Page renders with fresh data (500ms later)
```

### After (New Pattern)
```
User visits /notes
  ↓
Server load() returns empty (INSTANT)
  ↓
Component renders with cached data (0ms)
  ↓
Background sync fetches fresh data (silent)
  ↓
UI updates when ready (smooth)
```

## For Developers

### Adding Instant Loading to a New Page

1. **Create a data endpoint** (`src/routes/api/mydata/+server.ts`)
   ```typescript
   export const GET = async ({ locals: { getUser, getAuthenticatedSupabase } }) => {
       const user = await getUser();
       const supabase = await getAuthenticatedSupabase();

       const data = await supabase.from('mytable').select('*');

       return json({
           mydata: data.data,
           profile: profile,
           timestamp: Date.now()
       });
   };
   ```

2. **Simplify the page load** (`+page.server.ts`)
   ```typescript
   export const load = async ({ locals: { getUser } }) => {
       const user = await getUser();
       if (!user) throw redirect(303, '/login');

       return {
           shouldFetchData: true  // Signal client to fetch
       };
   };
   ```

3. **Wire up the page** (`+page.svelte`)
   ```typescript
   import { createDataManager } from '$lib/services/DataManager';

   let dataManager: DataManager;
   let mydata = $state<any[]>([]);

   onMount(() => {
       dataManager = new DataManager({
           cacheKey: 'mydata',
           apiEndpoint: '/api/mydata',
           onDataUpdate: (freshData) => {
               mydata = freshData.mydata || [];
           },
           onError: (error) => {
               showToast(`Sync failed: ${error.message}`);
           }
       });

       // Load from cache (instant)
       const cached = dataManager.getInitialData();
       if (cached) {
           mydata = cached.mydata || [];
       }

       // Sync in background (silent)
       dataManager.syncInBackground();
   });
   ```

## Debugging

All operations log with timestamps and emojis:

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

**Check browser console (F12) to see the full flow.**

### Common Issues

**Issue: Page shows empty initially**
- ✓ This is expected if no cache exists
- ✓ Check console for sync status
- ✓ Should populate once sync completes

**Issue: Data doesn't update after editing**
- Call `dataManager.syncInBackground()` to re-fetch
- Or implement optimistic updates (update local state first)

**Issue: Stale data showing**
- Cache is working correctly
- Sync is fetching fresh data
- UI will update when sync completes
- Check console for sync logs

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Page load time | 500-1000ms | 0-50ms |
| Time to interactive | 500-1000ms | 0-50ms |
| Data freshness | Always fresh | Eventually consistent |
| Network usage | One load per visit | One load + periodic syncs |
| User experience | Wait for data | See cached, update smoothly |

## Cache Management

Cache is stored in browser localStorage under keys like:
```
resin_cache_notes_data
resin_cache_amber_data
```

Clear cache by opening DevTools → Application → Local Storage → Delete:
```javascript
localStorage.removeItem('resin_cache_notes_data')
```

Or programmatically:
```typescript
dataManager.clearCache();
```

## Error Handling

Errors are handled gracefully:
1. If sync fails → return cached data (graceful degradation)
2. Call `onError` callback → component can show toast
3. Log error with context → easy debugging

## Trade-offs

✓ **Pros:**
- Instant page loads (better UX)
- Non-blocking data fetches
- Always have something to show (offline friendly)
- Clear logging for debugging

✗ **Cons:**
- Data is eventually consistent (not real-time)
- First visit shows nothing (can pre-populate via endpoint)
- Need to handle optimistic updates for edits

## Future Improvements

- [ ] Hybrid rendering: Server hydrates with initial data
- [ ] WebSocket subscriptions for real-time updates
- [ ] Service worker for offline support
- [ ] Request deduplication (avoid duplicate fetches)
- [ ] Cache invalidation on user action
