# Resin Web App: Architecture Discovery Manifest
**Generated:** 2026-03-26 | **Framework:** SvelteKit 2.50 | **Runtime:** Svelte 5.51 (Runes)

---

## 1. Filesystem Tree: `src/` Structure (3 Levels)

```
src/
├── lib/
│   ├── assets/
│   ├── components/           (27 reusable .svelte files)
│   ├── contracts/            (Resin protocol definitions)
│   ├── core/                 (Business logic: gamification, etc)
│   ├── services/             (DataManager, amber_service, etc)
│   ├── stores/               (Svelte stores: amberStore)
│   ├── utils/                (Helpers: scheduling, commandParser)
│   ├── supabase.ts           (Client initialization)
│   ├── supabaseMutations.ts  (Query builders)
│   ├── cache.ts              (Local cache layer)
│   ├── amber_service.ts      (Core business logic)
│   └── types.ts              (Shared TypeScript types)
│
└── routes/
    ├── +page.svelte          (Home/Dashboard)
    ├── +layout.svelte        (Global layout)
    ├── +layout.server.ts     (Auth setup)
    │
    ├── amber/                (Note activation/scheduling)
    │   ├── +page.svelte
    │   └── +page.server.ts
    ├── notes/                (Note editor & list)
    ├── friends/              (Friend management)
    ├── map/                  (Mind map canvas)
    ├── focus/                (Focus sessions)
    ├── insights/             (Analytics dashboard)
    ├── calendar/             (Calendar view)
    │
    └── api/                  (Backend endpoints)
        ├── amber/
        ├── focus/
        ├── auth/
        ├── gamification/
        ├── notifications/
        └── ...

**Components:** 51 total .svelte files
  - 27 in src/lib/components/ (reusable)
  - 23 route pages (route-specific)
```

---

## 2. Data Flow Sample: Notes Feature

### A. Route Component: `src/routes/notes/+page.svelte` (First 20 lines)

```svelte
<script lang="ts">
    import NotesEditor from "$lib/components/NotesEditor.svelte";
    import { page } from "$app/stores";
    import { fade } from "svelte/transition";
    import { setCache, clearCache, invalidateCache } from "$lib/cache";
    import { onMount } from "svelte";
    import { createNotesDataManager } from "$lib/services/DataManager";
    import type { DataManager } from "$lib/services/DataManager";

    let { data } = $props();

    // Data manager for notes - handles cache + sync
    let dataManager: DataManager;

    let notes = $state<any[]>([]);
    let profile = $state<any>(null);
    let connections = $state<any>({});
    let sharedWithMe = $state<any[]>([]);
    let friends = $state<any[]>([]);
```

**Pattern:** Svelte 5 Runes (`$props()`, `$state`)

---

### B. Load Function: `src/routes/notes/+page.server.ts` (First 50 lines)

```typescript
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { runActivationPipeline } from '$lib/amber_service';
import { syncStonesFromNotes, recordDailyActivity } from '$lib/gamification_service';

const extractTitle = (content: string) => {
    if (!content || !content.trim()) return null;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed !== '#') {
            return trimmed.replace(/^#+\s*/, '').substring(0, 60);
        }
    }
    return null;
};

const normalizeNote = (note: any) => ({
    ...note,
    title: note.display_title ?? note.title ?? '',
    content: note.raw_text ?? note.content ?? ''
});

const isMissingColumnError = (error: any) => {
    if (!error) return false;
    return error.code === 'PGRST204' || String(error.message || '').includes("Could not find");
};

const insertNote = async (supabase: any, row: { user_id: string; title: string; content: string; created_at: string }) => {
    const now = new Date().toISOString();
    // Insert into amber_sessions with status='draft'
    const insertResult = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at,
            updated_at: now
        })
        .select('id');

    if (insertResult.error) {
        return { data: null, error: insertResult.error };
    }

    // Check if the insert actually returned an ID (detects RLS or DB errors)
```

**Pattern:** Server-side data loading + mutations handled here (SvelteKit `+page.server.ts`)

---

### C. State Management: `src/lib/stores/amberStore.ts` (First 30 lines)

```typescript
import { writable, derived } from 'svelte/store';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AmberSession {
    id: string;
    user_id: string;
    display_title: string;
    title: string;
    raw_text: string;
    content: string;
    status: 'draft' | 'scheduled' | 'completed' | 'failed' | 'canceled' | 'processing';
    intensity: number;
    created_at: string;
    updated_at: string;
    start_time?: string;
    end_time?: string;
    sessionType?: 'amber' | 'focus';
    amber_tasks?: any[];
}

interface DeleteState {
    id: string;
    snapshot: AmberSession;
}

class AmberStore {
    // Core state
    private sessions = writable<AmberSession[]>([]);
    private deletingIds = writable<Set<string>>(new Set());
    private activatingIds = writable<Set<string>>(new Set());
```

**Pattern:** Classic Svelte stores with `writable` + `derived` (works in both Svelte 4 & 5)

---

### D. Data Flow Diagram

```
+─────────────────────────────────────────────────────────────────────+
│                        HTTP REQUEST                                  │
+─────────────────────────────────────────────────────────────────────+
                                 │
                    ┌────────────▼────────────┐
                    │   +page.server.ts       │
                    │  (PageServerLoad)       │
                    │  ├─ Load notes[]        │
                    │  ├─ Load profile        │
                    │  └─ Pass to .svelte     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   +page.svelte          │
                    │  (Route component)      │
                    │  ├─ let { data }        │
                    │  ├─ Init DataManager    │
                    │  └─ Render UI           │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌────▼─────────┐      ┌──────▼──────────┐    ┌────────▼───────┐
   │ NotesEditor  │      │ Cache Layer     │    │ DataManager    │
   │ (SMART)      │      │ (cache.ts)      │    │ (bg sync)      │
   │ - Callbacks  │      │ - Local storage │    │ - Poll API     │
   │ - Form posts │      │ - TTL tracking  │    │ - Update cache │
   └────┬─────────┘      └────────┬────────┘    └────────┬───────┘
        │                         │                       │
        │      ┌──────────────────┼───────────────────┐   │
        │      │                  │                   │   │
        └──────┼──────────────────▼───────────────────┼───┘
               │            Supabase Client           │
               │       (createBrowserClient)          │
               └──────────────────┬───────────────────┘
                                  │
                    ┌─────────────┴────────────┐
                    │                          │
              ┌─────▼──────┐          ┌────────▼─────┐
              │  Database  │          │ Google Auth  │
              │(Postgres)  │          │(OAuth + SSR) │
              └────────────┘          └──────────────┘
```

---

## 3. SDK Integration Check

### A. Supabase Client Initialization

**Location:** `src/lib/supabase.ts` (10 lines)

```typescript
import { createBrowserClient, isBrowser, parse } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const createSupabaseClient = () => {
    return createBrowserClient(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY
    )
}
```

**Pattern:** Using **Supabase SSR** pattern (browser-side client initialization)
**Architecture:** Factory function, not a singleton—each component can call this
**Auth:** SSR manages cookies + JWT tokens automatically

---

### B. PowerSync Integration

**Status:** ❌ **NOT USED** (no PowerSync imports found)

Alternative: Using **DataManager** pattern for local-first caching + background sync (custom implementation in `src/lib/services/DataManager.ts`)

---

### C. Direct Supabase Imports in `.svelte` Files

**Count:** 8 files import supabase directly

```
src/routes/+layout.svelte
src/routes/extension-settings/+page.svelte
src/routes/note-groups/+page.svelte
src/routes/referrals/+page.svelte
src/routes/calendar/+page.svelte
src/routes/insights/+page.svelte
src/lib/components/Dashboard.svelte
src/lib/components/GroupFocusSession.svelte
```

**Assessment:** ✅ **GOOD ISOLATION** — Only 8 out of 51 files directly access Supabase. Most data flows through server-side load functions.

---

## 4. Component "Purity" Check

### Sample: `ConnectionChip.svelte` (Pure/Dumb Component)

```svelte
<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		noteId: string;
		noteTitle: string;
		connectionType: string;
		isOutgoing: boolean;
		onClick?: () => void;
	}

	let { noteId, noteTitle, connectionType, isOutgoing, onClick }: Props = $props();

	const connectionLabels: Record<string, string> = {
		relates_to: 'Related to',
		blocks: 'Blocks',
		supports: 'Supports',
		depends_on: 'Depends on',
		references: 'References',
		contradicts: 'Contradicts'
	};

	const connectionColors: Record<string, { bg: string; text: string; border: string }> = {
		relates_to: { bg: 'bg-resin-forest/5', text: 'text-resin-forest', border: 'border-resin-forest/20' },
		blocks: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
		// ... other colors
	};

	const colors = $derived(connectionColors[connectionType] || connectionColors.relates_to);
	const label = $derived(connectionLabels[connectionType] || connectionType);
	const direction = $derived(isOutgoing ? '→' : '←');
</script>

<button class="inline-flex items-center gap-2 ...">
	<span class="opacity-60">{direction}</span>
	<span class="truncate max-w-xs">{noteTitle}</span>
	<ChevronRight class="w-3 h-3 opacity-60" />
</button>
```

**Purity:** ✅ **PURE/DUMB**
- No database calls
- No API fetches
- Accepts props: `noteId`, `noteTitle`, `connectionType`, `isOutgoing`, `onClick`
- Renders UI + emits events
- Logic: Computed colors/labels using Svelte 5 `$derived` runes

---

### Sample: `NotesEditor.svelte` (Smart/Container Component)

```svelte
<script lang="ts">
    import { enhance } from "$app/forms";
    import { parseCommands } from "$lib/utils/commandParser";
    import CommandPalette from "./CommandPalette.svelte";
    import ConfirmDeleteModal from "./ConfirmDeleteModal.svelte";

    let {
        activeNote,
        notes = [],
        profile = null,
        friends = [],
        connections = {},
        showToast,
        updateActiveNoteContent,     // Callback
        onBack,                       // Callback
        onSaveSuccess,                // Callback
        onAutoSaveUpdate,             // Callback
        onSelectNote,                 // Callback
        onDeleteNote,                 // Callback
    } = $props<{...}>;
```

**Purity:** ✅ **SMART/CONTAINER** (but callbacks-driven, not data-fetching)
- Receives data via props
- Calls callbacks to parent (`onBack`, `onSaveSuccess`, etc.)
- Delegates data mutations to parent (no `await fetch()`)
- **Pattern:** Container that orchestrates child components + event bubbling
- Uses `enhance` from SvelteKit (progressive form submission)

---

## 5. Svelte Version Check

### Current Version: **Svelte 5.51** ✅ (Modern Runes)

**In `package.json`:**
```json
{
  "devDependencies": {
    "svelte": "^5.51.0"
  }
}
```

### Runes Usage Detected:

1. **`$props()` binding:**
   ```svelte
   let { data } = $props();
   let { activeNote, notes = [] } = $props<{ ... }>();
   ```

2. **`$state()` for reactive variables:**
   ```svelte
   let notes = $state<any[]>([]);
   let profile = $state<any>(null);
   ```

3. **`$derived()` for computed properties:**
   ```svelte
   const colors = $derived(connectionColors[connectionType] || connectionColors.relates_to);
   const label = $derived(connectionLabels[connectionType] || connectionType);
   ```

### Backwards Compatibility:

- **`writable` & `derived` stores still work** in Svelte 5 (seen in `amberStore.ts`)
- **No Svelte 4 stores** issues detected—good migration path
- **Can mix both patterns** (stores + runes) during gradual migration

---

## Key Architectural Insights

### ✅ Strengths

1. **Good separation of concerns:** Server-side load → client-side runes
2. **Smart/Dumb component split:** Pure UI components + smart containers
3. **Local-first caching:** DataManager handles offline + bg sync (not PowerSync)
4. **Limited Supabase imports:** Only 8 of 51 files access DB directly
5. **Modern Svelte 5:** Runes for better reactivity + TypeScript support

### ⚠️ Areas for Optimization

1. **Store pattern inconsistency:** `amberStore.ts` uses old Svelte 4 `writable/derived`, rest uses Svelte 5 runes
   - **Recommendation:** Gradually migrate stores to runes for consistency

2. **DataManager in multiple places:** If `createNotesDataManager` is called in multiple routes, consider singleton or context API
   - **Recommendation:** Use SvelteKit's `setContext()` / `getContext()` to share instance

3. **Type safety:** Some `any` types in props
   - **Recommendation:** Define shared `Note`, `Profile`, `Connection` interfaces in `src/lib/types.ts`

4. **Cache invalidation strategy:** Manual `invalidateCache()` calls scattered throughout
   - **Recommendation:** Centralize cache invalidation rules (e.g., "delete note → invalidate notes + mind_map")

---

## Data Flow Optimization Checklist

For AI clarity + speed:

- [ ] **Consolidate store patterns:** Migrate `amberStore.ts` to Svelte 5 runes
- [ ] **Add request deduplication:** Cache + deduplicate pending API calls in `DataManager`
- [ ] **Document RLS impact:** Note which queries are blocked by database row-level security
- [ ] **Add load timing telemetry:** Measure: initial load → first paint → data sync complete
- [ ] **Index Supabase queries:** Ensure frequently-loaded queries have DB indexes
- [ ] **Consider fetch deduplication:** Use `Promise<T>` caching for concurrent requests

---

Generated with ❤️ for architectural clarity
Last updated: 2026-03-26
