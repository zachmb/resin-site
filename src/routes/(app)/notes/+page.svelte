<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { marked } from 'marked';
  import { createClient } from '$lib/supabase/client';
  import { noteTitle, notePreview, type BrainDump } from '$lib/types';
  import type { PageData } from './$types';
  import { formatDistanceToNow } from 'date-fns';

  export let data: PageData;

  const supabase = createClient();

  // ── State ────────────────────────────────────────────────────────────────
  let notes: BrainDump[] = data.notes ?? [];
  let selectedId: string | null = null;
  let editorText = '';
  let searchQuery = '';
  let showPreview = false;
  let saving = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  // ── Derived ──────────────────────────────────────────────────────────────
  $: filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.raw_text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  $: selectedNote = notes.find((n) => n.id === selectedId) ?? null;
  $: previewHtml = marked(editorText, { breaks: true, gfm: true }) as string;

  // ── Select note ──────────────────────────────────────────────────────────
  function selectNote(note: BrainDump) {
    // Save pending changes for current note before switching
    if (saveTimer) clearTimeout(saveTimer);
    if (selectedNote && editorText !== selectedNote.raw_text) {
      persistNote(selectedNote.id, editorText);
    }
    selectedId = note.id;
    editorText = note.raw_text;
    showPreview = false;
  }

  // ── Create note ──────────────────────────────────────────────────────────
  async function createNote() {
    const { data: inserted, error } = await supabase
      .from('brain_dumps')
      .insert({ user_id: data.userId, raw_text: '' })
      .select()
      .single();

    if (error) {
      console.error('Failed to create note:', error.message);
      return;
    }
    notes = [inserted, ...notes];
    selectNote(inserted);
  }

  // ── Auto-save ────────────────────────────────────────────────────────────
  function onEditorInput() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (selectedId) persistNote(selectedId, editorText);
    }, 800);
  }

  async function persistNote(id: string, text: string) {
    saving = true;
    await supabase
      .from('brain_dumps')
      .update({ raw_text: text })
      .eq('id', id);
    // Update local state
    notes = notes.map((n) => (n.id === id ? { ...n, raw_text: text } : n));
    saving = false;
  }

  // ── Delete note ──────────────────────────────────────────────────────────
  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    await supabase.from('brain_dumps').delete().eq('id', id);
    notes = notes.filter((n) => n.id !== id);
    if (selectedId === id) {
      selectedId = notes[0]?.id ?? null;
      editorText = notes[0]?.raw_text ?? '';
    }
  }

  // ── Realtime ─────────────────────────────────────────────────────────────
  onMount(() => {
    if (!data.userId) return;

    channel = supabase
      .channel('brain_dumps_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brain_dumps', filter: `user_id=eq.${data.userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNote = payload.new as BrainDump;
            // Only add if not already present (avoid duplicate from our own insert)
            if (!notes.find((n) => n.id === newNote.id)) {
              notes = [newNote, ...notes];
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as BrainDump;
            notes = notes.map((n) => (n.id === updated.id ? updated : n));
            // If this note is selected and an external update came in (e.g. from iOS),
            // only update editor if the user isn't actively editing
            if (selectedId === updated.id && !saving) {
              editorText = updated.raw_text;
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            notes = notes.filter((n) => n.id !== deletedId);
            if (selectedId === deletedId) {
              selectedId = notes[0]?.id ?? null;
              editorText = notes[0]?.raw_text ?? '';
            }
          }
        }
      )
      .subscribe();

    // Select the first note by default
    if (notes.length > 0 && !selectedId) {
      selectedId = notes[0].id;
      editorText = notes[0].raw_text;
    }
  });

  onDestroy(() => {
    if (channel) supabase.removeChannel(channel);
    if (saveTimer) clearTimeout(saveTimer);
  });
</script>

<svelte:head>
  <title>Notes — Resin</title>
</svelte:head>

<!-- Three-column layout -->
<div class="flex flex-1 overflow-hidden">

  <!-- Note list panel (260px) -->
  <aside class="w-64 flex flex-col border-r border-resin-bg-3 bg-resin-bg-2 flex-shrink-0 overflow-hidden">
    <!-- Header -->
    <div class="px-3 pt-3 pb-2 border-b border-resin-bg-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-resin-brown uppercase tracking-wider">Notes</span>
        <button
          on:click={createNote}
          title="New note"
          class="w-6 h-6 rounded-lg bg-resin-amber text-white flex items-center justify-center
                 hover:bg-resin-amber-d transition-colors text-lg leading-none"
        >+</button>
      </div>
      <input
        type="text"
        placeholder="Search notes…"
        bind:value={searchQuery}
        class="input-resin text-xs py-1.5"
      />
    </div>

    <!-- Note list -->
    <ul class="flex-1 overflow-y-auto py-1 px-1">
      {#if filteredNotes.length === 0}
        <li class="px-3 py-4 text-center text-xs text-resin-gray">
          {searchQuery ? 'No notes match your search' : 'No notes yet — create one!'}
        </li>
      {:else}
        {#each filteredNotes as note (note.id)}
          <li>
            <button
              class="note-row w-full text-left {selectedId === note.id ? 'active' : ''}"
              on:click={() => selectNote(note)}
            >
              <span class="text-sm font-semibold text-resin-charcoal truncate block leading-snug">
                {noteTitle(note.raw_text) || 'Untitled'}
              </span>
              <span class="text-xs text-resin-brown truncate block leading-snug">
                {notePreview(note.raw_text)}
              </span>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-resin-gray">
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                </span>
                <button
                  class="opacity-0 group-hover:opacity-100 text-resin-gray hover:text-red-400
                         transition-opacity p-0.5 rounded"
                  on:click|stopPropagation={() => deleteNote(note.id)}
                  title="Delete"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  </aside>

  <!-- Editor pane -->
  <main class="flex flex-col flex-1 overflow-hidden">
    {#if selectedNote}
      <!-- Toolbar -->
      <div class="flex items-center justify-between px-5 py-2.5 border-b border-resin-bg-3 bg-resin-bg flex-shrink-0">
        <div class="flex items-center gap-2 text-xs text-resin-gray">
          {#if saving}
            <span class="text-resin-amber">Saving…</span>
          {:else}
            <span>Auto-saved</span>
          {/if}
          <span>·</span>
          <span>{editorText.length} chars</span>
        </div>
        <button
          on:click={() => (showPreview = !showPreview)}
          class="text-xs font-medium px-3 py-1 rounded-lg border border-resin-bg-3
                 text-resin-brown hover:bg-resin-bg-2 transition-colors"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-hidden">
        {#if showPreview}
          <!-- Rendered markdown preview -->
          <div class="prose-resin h-full overflow-y-auto px-8 py-6">
            {@html previewHtml}
          </div>
        {:else}
          <!-- Raw textarea editor -->
          <textarea
            class="w-full h-full resize-none bg-resin-bg text-resin-charcoal
                   px-8 py-6 text-sm leading-7 font-mono
                   focus:outline-none placeholder-resin-gray"
            placeholder="Start writing…&#10;&#10;Tip: Use # for headings, **bold**, _italic_"
            bind:value={editorText}
            on:input={onEditorInput}
            spellcheck="true"
          ></textarea>
        {/if}
      </div>
    {:else}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
        <div class="w-14 h-14 rounded-2xl bg-resin-bg-2 flex items-center justify-center">
          <svg class="w-7 h-7 text-resin-gray" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-resin-charcoal">Select a note</p>
          <p class="text-sm text-resin-brown mt-1">Choose from the list, or create a new one</p>
        </div>
        <button on:click={createNote} class="btn-amber text-sm">
          New Note
        </button>
      </div>
    {/if}
  </main>

</div>
