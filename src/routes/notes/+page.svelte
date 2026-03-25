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

    // Initialize state from server data (SSR-provided) 
    let notes = $state<any[]>(data.notes || []);
    let profile = $state<any>(data.profile || null);
    let connections = $state<any>(data.connections || {});
    let sharedWithMe = $state<any[]>(data.sharedWithMe || []);
    let friends = $state<any[]>(data.friends || []);

    let toastMessage = $state("");
    const showToast = (msg: string) => {
        toastMessage = msg;
        setTimeout(() => (toastMessage = ""), 3000);
    };

    let selectedNoteId = $state<string | null>(null);
    let localDrafts = $state<Record<string, string>>({});

    // Initialize data manager and load cached data on mount
    onMount(() => {
        // Clear drafts
        localDrafts = {};

        // Restore selected note from localStorage
        const savedNoteId = localStorage.getItem('selectedNoteId');
        if (savedNoteId) {
            selectedNoteId = savedNoteId;
        }

        // Create data manager with callbacks - used for background sync only
        dataManager = createNotesDataManager(
            // onDataUpdate callback - called when fresh data arrives from API
            (freshData) => {
                console.log('[notes:page] Received fresh data from DataManager');
                if (freshData.notes?.length > 0) {
                    notes = freshData.notes;
                }
                if (freshData.profile) profile = freshData.profile;
                if (freshData.connections) connections = freshData.connections;
                if (freshData.sharedWithMe) sharedWithMe = freshData.sharedWithMe;
                if (freshData.friends) friends = freshData.friends;
            },
            // onError callback - silent, we already have server data
            (error) => {
                console.warn('[notes:page] DataManager sync error (non-critical):', error);
            }
        );

        // Only run background sync - server already gave us initial data
        console.log('[notes:page] Server provided', notes.length, 'notes. Starting background sync...');
        dataManager.syncInBackground();
    });

    // Open specific note by ID from URL, or restore from localStorage
    $effect(() => {
        if ($page.url.pathname === "/notes") {
            const idParam = $page.url.searchParams.get("id");
            if (idParam) {
                selectedNoteId = idParam;
                localStorage.setItem('selectedNoteId', idParam);
            } else if ($page.url.searchParams.has("reset")) {
                selectedNoteId = notes[0]?.id || "mock";
                localStorage.removeItem('selectedNoteId');
                localDrafts = {};
            }
        }
    });

    // Save selected note ID to localStorage whenever it changes
    $effect(() => {
        if (selectedNoteId && selectedNoteId !== "mock") {
            localStorage.setItem('selectedNoteId', selectedNoteId);
        }
    });

    let activeNote = $derived.by(() => {
        const id = selectedNoteId || (notes.length > 0 ? notes[0].id : "mock");
        const baseNote = notes.find((n: any) => n.id === id) || {
            id: "mock",
            title: "New Note",
            content: "# New Note\n\nStart typing to create a note...",
            created_at: new Date().toISOString(),
        };

        return {
            ...baseNote,
            content: localDrafts[id] ?? baseNote.content,
        };
    });

    const updateActiveNoteContent = (content: string) => {
        const id = activeNote.id;
        localDrafts[id] = content;
    };

    const handleSaveSuccess = async ({
        note,
        isNew,
    }: {
        note: any;
        isNew: boolean;
    }) => {
        // Clear draft for the saved note
        delete localDrafts[note.id];
        selectedNoteId = note.id;
        showToast("Note saved!");

        // Update the notes array with the fresh data from server
        const noteIndex = notes.findIndex((n: any) => n.id === note.id);
        if (noteIndex !== -1) {
            notes[noteIndex] = {
                id: note.id,
                title: note.title || notes[noteIndex].title || 'Untitled',
                content: note.content || notes[noteIndex].content || '',
                status: note.status || notes[noteIndex].status || 'draft',
                created_at: notes[noteIndex].created_at,
                updated_at: note.updated_at || new Date().toISOString()
            };
        }
        if (isNew) {
            // New note - merge from mock draft if exists
            const mockDraft = localDrafts["mock"];
            const mergedContent = mockDraft || note.content || '';
            
            notes = [
                {
                    id: note.id,
                    title: note.title || 'Untitled',
                    content: mergedContent,
                    created_at: note.created_at || new Date().toISOString(),
                    status: note.status || 'draft'
                },
                ...notes
            ];
            
            if (mockDraft) {
                delete localDrafts["mock"];
            }
        }

        // Create new array reference to trigger reactivity
        notes = [...notes];

        // Clear caches and update localStorage immediately
        clearCache();
        invalidateCache('notes');
        
        if (dataManager) {
            dataManager.updateCache({
                notes,
                profile,
                connections,
                sharedWithMe,
                friends
            });
        }
    };

    const handleSelectNote = (note: any) => {
        selectedNoteId = note.id;
    };

    const handleDeleteNote = async (noteId: string) => {
        // Remove the note from the list immediately
        notes = notes.filter((n: any) => n.id !== noteId);
        // Cache the updated list
        setCache('notes-list', notes, 5 * 60 * 1000);
    };
</script>

<NotesEditor
    {activeNote}
    {notes}
    {profile}
    {connections}
    friends={data.friends || []}
    {showToast}
    {updateActiveNoteContent}
    onBack={() => (selectedNoteId = null)}
    onSaveSuccess={handleSaveSuccess}
    onSelectNote={handleSelectNote}
    onDeleteNote={handleDeleteNote}
/>

{#if toastMessage}
    <div
        transition:fade={{ duration: 200 }}
        class="fixed bottom-[100px] left-1/2 -translate-x-1/2 px-5 py-3 bg-white text-[#2B4634] rounded-[22px] shadow-premium z-[100] font-semibold text-[14px] flex items-center gap-2"
    >
        <svg
            class="w-4 h-4 text-[#2B4634]"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
            ></path>
        </svg>
        {toastMessage}
    </div>
{/if}
