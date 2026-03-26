# Resin Web — Development Guardrails

## 🎯 Architecture Philosophy

This web app is aligned with the iOS app's **Modular Vertical Slice (MVS)** architecture. The goal is strict type safety, clear separation of concerns, and zero tolerance for "magical" direct database access from components.

---

## 🏗️ Core Principles

### 1. Type Safety: NO `any` Types

- **Rule:** All data in Svelte components must conform to `src/lib/types.ts`.
- **Why:** Static type safety catches bugs at compile time. `any` is a type safety escape hatch that defeats the purpose.
- **How to apply:**
  - Import all types from `$lib/types` (which re-exports from `@resin/contracts`)
  - Use strict interfaces: `SavedNote`, `AmberSession`, `UserProfile`, `FocusSession`, etc.
  - Never define ad-hoc interfaces inside `.svelte` files. All types live in `src/lib/contracts/index.ts`.
  - When adding data to `$state`, annotate it: `let notes = $state<SavedNote[]>([])`

### 2. Reactivity: Svelte 5 Runes Only

- **Rule:** Use Svelte 5 Runes (`$state`, `$derived`, `$props`) for all new reactive logic.
- **Why:** Runes are more ergonomic, statically analyzable, and composable. Svelte 4 `writable`/`derived` stores are the old pattern.
- **How to apply:**
  - Use `let myData = $state<Type>(initialValue)` for reactive data
  - Use `let computed = $derived(...)` for computed properties
  - Use `let { prop } = $props<{ prop: string }>()` to receive props
  - **Deprecated:** Svelte 4 `writable` and `derived` stores (e.g., in `src/lib/stores/amberStore.ts`) are legacy. Do not create new ones.

### 3. Data Access: No Direct Supabase in Components

- **Rule:** NO direct Supabase imports/calls in `.svelte` files.
- **Exception:** `src/routes/+layout.svelte` is the auth/realtime entry point (allowed to call `supabase.auth.onAuthStateChange()` and set up profile realtime subscriptions).
- **Why:** Components should not know about the database. All data comes through the architecture layers.
- **How to apply:**
  - Component reads data via `let { data } = $props()` from SvelteKit load functions
  - Component writes data via `<form use:enhance>` + server actions
  - Complex data orchestration → use `src/lib/state/` (rune-based stores)
  - Realtime subscriptions → belong in `src/lib/state/` or the layout
  - Shared data fetching → use `src/lib/services/DataManager` via context

### 4. Data Flow: Load Function → Props → Runes → UI

```
┌─────────────────────────────────────────────────────────────┐
│ SvelteKit Load Function (+page.server.ts / +layout.server.ts)│
│         ↓ queries DB, handles auth, builds data             │
│      Returns: data object                                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Page/Layout Component (+page.svelte / +layout.svelte)       │
│  let { data } = $props()                                     │
│         ↓ derives local state from data prop                 │
│  let notes = $state(data.notes)                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Child Components                                              │
│  let { notes, onSave } = $props()  // pure via props        │
│  <ChildComponent {notes} on:action={handleAction} />         │
└─────────────────────────────────────────────────────────────┘
```

### 5. Mutations: Server Actions Always

- **Rule:** All data mutations go through SvelteKit server actions, never via direct Supabase calls.
- **How to apply:**
  - Form submission: `<form method="POST" use:enhance>`
  - Async actions: define `export const actions = { actionName }` in `+page.server.ts`
  - Component handling: `import { enhance } from "$app/forms"` + `use:enhance` on forms
  - Never call `supabase.from(...).update(...)` or `.insert(...)` from a `.svelte` file

---

## 📁 Directory Structure & Responsibilities

```
src/lib/
├── contracts/          # Data models (single source of truth for types)
│   └── index.ts        # Interfaces: SavedNote, AmberSession, etc.
├── types.ts            # Barrel re-export from contracts
├── state/
│   └── amber.svelte.ts # Svelte 5 rune store for amber sessions
├── services/
│   ├── DataManager.ts  # Local-first cache + background sync
│   └── localCache.ts   # localStorage abstraction
└── components/
    └── *.svelte        # Pure/dumb UI components (no DB access)

src/routes/
├── +layout.svelte      # Global auth + realtime setup (ONLY place with direct Supabase)
├── +layout.server.ts   # Auth context, provides supabase to children
├── notes/
│   ├── +page.server.ts # Load notes; handle save/delete actions
│   └── +page.svelte    # Reactive UI, calls server actions
├── amber/
│   ├── +page.server.ts # Load sessions; handle activate action
│   └── +page.svelte    # Render; call server actions
└── api/
    └── *.ts            # Endpoints (internal APIs, can call Supabase)
```

---

## 🚨 Known Mismatches (Require DB Migration to Fix)

### 1. `display_title` vs `title` Field

**The Issue:**
- Web code writes `display_title` to Supabase `amber_sessions` table
- iOS expects column `title`
- Types now define the field as `title` to match iOS/DB schema

**Temporary Workaround:**
- `src/lib/amber_service.ts` handles both defensively (reads `display_title ?? title`, writes both)
- When creating new code, always use `title` (not `display_title`)

**Migration Needed:**
- [ ] Add Supabase migration: rename `display_title` → `title` (or add dual-write during transition)
- [ ] Update `amber_service.ts` to stop writing `display_title`
- [ ] Backfill existing data

---

## ✅ Verification Checklist

Before opening a PR, ensure:

1. **Type Check:** Run `npx svelte-check` — no `any` types in core files
2. **Reactivity Check:** New reactive code uses `$state`, `$derived`, `$props` (not `writable`/`derived`)
3. **Moat Check:** Run `grep -r "createSupabaseClient" src/routes src/lib/components` — only `+layout.svelte` should appear
4. **Build Check:** `npm run build` completes with 0 errors
5. **Imports Check:** All types imported from `$lib/types`, no local ad-hoc interfaces

---

## 🔄 The "Rune Store" Pattern

When you need shared reactive state across multiple components, use a `.svelte.ts` file with runes:

```typescript
// src/lib/state/myFeature.svelte.ts
import type { MyType } from '$lib/types';

class MyStore {
  private _data = $state<MyType[]>([]);

  get data() { return this._data; }
  set data(value: MyType[]) { this._data = value; }

  computed = $derived(this._data.filter(...));

  async load() { /* ... */ }
}

export const myStore = new MyStore();
```

Use in components:
```svelte
<script lang="ts">
  import { myStore } from '$lib/state/myFeature.svelte';

  onMount(() => myStore.load());
</script>

{#each myStore.data as item}
  {item.title}
{/each}
```

---

## 📝 File Templates

### New Page Server Load
```typescript
// src/routes/[feature]/+page.server.ts
import type { PageServerLoad } from './$types';
import type { SavedNote } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const supabase = locals.supabase;
  const user = await supabase.auth.getUser();

  if (!user) {
    throw redirect(303, '/login');
  }

  const { data: notes, error } = await supabase
    .from('amber_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'draft');

  if (error) throw error;

  return { notes: notes as SavedNote[] };
};
```

### New Page Mutations
```typescript
// +page.server.ts (same file as load)
import type { Actions } from './$types';

export const actions: Actions = {
  saveNote: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const formData = await request.formData();

    const { error } = await supabase
      .from('amber_sessions')
      .update({ title: formData.get('title') })
      .eq('id', formData.get('id'));

    if (error) return fail(400, { error: error.message });
    return { success: true };
  }
};
```

### New Component (Pure/Dumb)
```svelte
<!-- src/lib/components/NoteCard.svelte -->
<script lang="ts">
  import type { SavedNote } from '$lib/types';

  let { note, onEdit, onDelete }: {
    note: SavedNote;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  } = $props();
</script>

<div>
  <h3>{note.title}</h3>
  <p>{note.content}</p>
  <button onclick={() => onEdit(note.id)}>Edit</button>
  <button onclick={() => onDelete(note.id)}>Delete</button>
</div>
```

---

## 🚀 Future Improvements

1. **Add openapi-generator** for automatic API client generation
2. **Add tRPC** for end-to-end type safety
3. **Migrate all stores** to runes-based `.svelte.ts` files
4. **Consolidate realtime subscriptions** into a single management layer

---

Generated: 2026-03-26 | Maintained by: Resin Team
