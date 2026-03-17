<script lang="ts">
    import { enhance } from '$app/forms';
    import { createSupabaseClient } from '$lib/supabase';
    import { onMount } from 'svelte';
    import { ChevronLeft, Copy, Check, Plus, Trash2, Edit3 } from 'lucide-svelte';

    let { data } = $props();

    const supabase = createSupabaseClient();
    const colorMap: Record<string, string> = {
        amber: 'bg-amber-100',
        forest: 'bg-green-100',
        rose: 'bg-rose-100',
        sky: 'bg-blue-100',
        neutral: 'bg-gray-100'
    };

    let notes = $state(data.notes);
    let presenceMap = $state<Record<string, any>>({});
    let editingNoteId = $state<string | null>(null);
    let showEditModal = $state(false);
    let editingNote = $state<any>(null);
    let showShareModal = $state(false);
    let inviteToken = $state('');
    let shareUrl = $state('');
    let copySuccess = $state(false);

    let newNoteTitle = $state('');
    let newNoteContent = $state('');
    let newNoteColor = $state('amber');

    // Get author email for a note
    function getAuthorEmail(note: any): string {
        return note.profiles?.email || 'Unknown';
    }

    // Get author initials
    function getInitials(email: string): string {
        return email.split('@')[0].charAt(0).toUpperCase();
    }

    // Color to text color
    function getTextColorForBg(color: string): string {
        return color === 'neutral' ? 'text-gray-700' : 'text-gray-800';
    }

    // Handle edit modal
    function openEditModal(note: any) {
        editingNote = { ...note };
        editingNoteId = note.id;
        showEditModal = true;
        broadcastPresence(note.id);
    }

    function closeEditModal() {
        showEditModal = false;
        editingNote = null;
        editingNoteId = null;
        broadcastPresence(null);
    }

    // Realtime setup
    onMount(() => {
        const channel = supabase.channel(`board:${data.board.id}`);

        // Listen for note changes
        channel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'board_notes',
                filter: `board_id=eq.${data.board.id}`
            },
            ({ eventType, new: newRow, old: oldRow }: any) => {
                if (eventType === 'INSERT') {
                    // Fetch author profile for the new note
                    supabase
                        .from('board_notes')
                        .select('*, profiles!board_notes_user_id_fkey(email)')
                        .eq('id', newRow.id)
                        .single()
                        .then(({ data: noteWithProfile }) => {
                            if (noteWithProfile) {
                                notes = [noteWithProfile, ...notes];
                            }
                        });
                } else if (eventType === 'UPDATE') {
                    notes = notes.map((n) => (n.id === newRow.id ? newRow : n));
                } else if (eventType === 'DELETE') {
                    notes = notes.filter((n) => n.id !== oldRow.id);
                }
            }
        );

        // Listen for presence updates
        channel.on('broadcast', { event: 'presence' }, ({ payload }: any) => {
            presenceMap = { ...presenceMap, [payload.userId]: payload };
        });

        channel.subscribe();

        // Broadcast own presence on mount
        const broadcastPresence = (noteId: string | null = null) => {
            channel.send({
                type: 'broadcast',
                event: 'presence',
                payload: {
                    userId: data.currentUserId,
                    email: data.session?.user?.email,
                    editingNoteId: noteId
                }
            });
        };

        // Make broadcastPresence available globally for modal
        (window as any).boardBroadcastPresence = broadcastPresence;

        broadcastPresence();

        return () => {
            channel.unsubscribe();
        };
    });

    function broadcastPresence(noteId: string | null) {
        if ((window as any).boardBroadcastPresence) {
            (window as any).boardBroadcastPresence(noteId);
        }
    }

    async function copyInviteLink() {
        await navigator.clipboard.writeText(shareUrl);
        copySuccess = true;
        setTimeout(() => (copySuccess = false), 2000);
    }

    async function handleGenerateInvite(e: any) {
        const formData = new FormData();
        const response = await fetch(`?/generateInviteLink`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            inviteToken = result.token;
            shareUrl = `${window.location.origin}/boards/${data.board.id}/join?token=${inviteToken}`;
        }
    }
</script>

<svelte:head>
    <title>{data.board.name} | Resin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-resin-forest/5 via-white to-resin-earth/5">
    <!-- Top Bar -->
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-resin-earth/10">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <a href="/boards" class="p-2 hover:bg-resin-earth/5 rounded-lg transition-colors">
                    <ChevronLeft size={20} class="text-resin-charcoal" />
                </a>
                <div>
                    <h1 class="text-2xl font-bold text-resin-charcoal">{data.board.name}</h1>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <!-- Member presence pills -->
                <div class="flex items-center gap-2 px-3 py-2 bg-resin-forest/5 rounded-lg">
                    {#each data.members as member (member.user_id)}
                        <div
                            class="w-8 h-8 rounded-full bg-resin-forest text-white flex items-center justify-center text-xs font-bold"
                            title={member.profiles?.email}
                        >
                            {getInitials(member.profiles?.email || 'U')}
                        </div>
                    {/each}
                </div>

                <!-- Share button -->
                {#if data.currentUserRole === 'owner'}
                    <button
                        onclick={() => {
                            showShareModal = !showShareModal;
                            if (showShareModal && !inviteToken) {
                                handleGenerateInvite(null);
                            }
                        }}
                        class="px-4 py-2 border border-resin-forest/30 text-resin-forest rounded-lg font-medium hover:bg-resin-forest/5 transition-colors"
                    >
                        Share
                    </button>
                {/if}

                <!-- Add Note button -->
                <button
                    onclick={() => (newNoteTitle = '', newNoteContent = '', newNoteColor = 'amber')}
                    class="px-4 py-2 bg-resin-amber text-white rounded-lg font-medium hover:bg-resin-amber/90 transition-colors flex items-center gap-2"
                >
                    <Plus size={18} />
                    Add Note
                </button>
            </div>
        </div>

        <!-- Share Modal -->
        {#if showShareModal}
            <div class="border-t border-resin-earth/10 px-4 py-4">
                <div class="max-w-7xl mx-auto">
                    {#if !inviteToken}
                        <div class="text-center py-4">
                            <p class="text-resin-earth/70 mb-4">Share this board with others</p>
                            <form onsubmit={(e) => { e.preventDefault(); handleGenerateInvite(null); }}>
                                <button
                                    type="submit"
                                    class="px-6 py-2 bg-resin-forest text-white rounded-lg font-medium hover:bg-resin-forest/90"
                                >
                                    Generate Invite Link
                                </button>
                            </form>
                        </div>
                    {:else}
                        <div class="flex gap-2 items-center">
                            <input
                                type="text"
                                value={shareUrl}
                                readonly
                                class="flex-1 px-4 py-2 border border-resin-earth/20 rounded-lg bg-gray-50 text-sm text-resin-charcoal"
                            />
                            <button
                                onclick={copyInviteLink}
                                class="p-2 border border-resin-earth/20 rounded-lg hover:bg-resin-earth/5 transition-colors"
                                title="Copy to clipboard"
                            >
                                {#if copySuccess}
                                    <Check size={18} class="text-green-600" />
                                {:else}
                                    <Copy size={18} class="text-resin-charcoal" />
                                {/if}
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 py-8">
        {#if notes.length === 0}
            <div class="text-center py-16">
                <div class="text-5xl mb-4">📝</div>
                <h3 class="text-xl font-bold text-resin-charcoal mb-2">No notes yet</h3>
                <p class="text-resin-earth/60">Add your first note to get started collaborating</p>
            </div>
        {:else}
            <!-- Notes Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {#each notes as note (note.id)}
                    <div
                        class={`${colorMap[note.color] || colorMap['amber']} rounded-2xl p-4 border border-black/5 group relative min-h-[180px] flex flex-col`}
                    >
                        <!-- Editing indicator -->
                        {#if presenceMap[data.currentUserId]?.editingNoteId === note.id}
                            <div class="absolute top-0 left-0 right-0 h-1 bg-resin-amber rounded-t-2xl" />
                        {/if}

                        {#each Object.values(presenceMap) as presence}
                            {#if presence.editingNoteId === note.id && presence.userId !== data.currentUserId}
                                <div class="absolute top-0 left-0 right-0 rounded-t-2xl px-3 py-1 bg-resin-amber text-white text-xs font-medium flex items-center gap-1">
                                    <span class="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                                    {presence.email?.split('@')[0]} is editing…
                                </div>
                            {/if}
                        {/each}

                        <!-- Header -->
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <div class="w-6 h-6 rounded-full bg-resin-forest text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {getInitials(getAuthorEmail(note))}
                            </div>

                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onclick={() => openEditModal(note)}
                                    class="p-1 hover:bg-black/10 rounded transition-colors"
                                    title="Edit note"
                                >
                                    <Edit3 size={16} class={getTextColorForBg(note.color)} />
                                </button>
                                {#if note.user_id === data.currentUserId || data.currentUserRole === 'owner'}
                                    <form method="POST" action="?/deleteNote" use:enhance>
                                        <input type="hidden" name="noteId" value={note.id} />
                                        <button
                                            type="submit"
                                            class="p-1 hover:bg-red-300/30 rounded transition-colors"
                                            title="Delete note"
                                            onclick={(e) => {
                                                if (!confirm('Delete this note?')) e.preventDefault();
                                            }}
                                        >
                                            <Trash2 size={16} class="text-red-600" />
                                        </button>
                                    </form>
                                {/if}
                            </div>
                        </div>

                        <!-- Title -->
                        {#if note.title}
                            <h3 class={`${getTextColorForBg(note.color)} font-serif font-semibold text-sm mb-2 line-clamp-2`}>
                                {note.title}
                            </h3>
                        {/if}

                        <!-- Content -->
                        <p class={`${getTextColorForBg(note.color)} text-xs line-clamp-4 flex-1`}>
                            {note.content || 'No content'}
                        </p>

                        <!-- Timestamp -->
                        <div class={`${getTextColorForBg(note.color)} opacity-40 text-[10px] mt-3 pt-2 border-t border-black/5`}>
                            {new Date(note.created_at).toLocaleDateString()}
                        </div>
                    </div>
                {/each}

                <!-- Add Note Card -->
                <button
                    onclick={() => {
                        newNoteTitle = '';
                        newNoteContent = '';
                        newNoteColor = 'amber';
                        showEditModal = true;
                        editingNote = null;
                        editingNoteId = null;
                    }}
                    class="bg-resin-forest/5 border border-resin-forest/20 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[180px] hover:bg-resin-forest/10 transition-colors group"
                >
                    <Plus size={40} class="text-resin-forest/40 group-hover:text-resin-forest/60 mb-2" />
                    <p class="text-resin-forest/60 text-sm font-medium">Add a note</p>
                </button>
            </div>
        {/if}
    </div>

    <!-- Edit Modal -->
    {#if showEditModal}
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onclick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}>
            <form
                method="POST"
                action={editingNote ? '?/updateNote' : '?/addNote'}
                use:enhance={() => {
                    return async ({ result }) => {
                        if (result.type === 'success') {
                            closeEditModal();
                        }
                    };
                }}
                class="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 space-y-4 shadow-2xl"
            >
                {#if editingNote}
                    <input type="hidden" name="noteId" value={editingNote.id} />
                {/if}

                <div>
                    <label for="title" class="block text-sm font-medium text-resin-charcoal mb-2">
                        Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={editingNote?.title || newNoteTitle}
                        onchange={(e) => {
                            if (editingNote) {
                                editingNote.title = e.currentTarget.value;
                            } else {
                                newNoteTitle = e.currentTarget.value;
                            }
                        }}
                        placeholder="Note title"
                        class="w-full px-4 py-2 border border-resin-earth/20 rounded-lg bg-white text-resin-charcoal focus:outline-none focus:border-resin-forest/50"
                    />
                </div>

                <div>
                    <label for="content" class="block text-sm font-medium text-resin-charcoal mb-2">
                        Content
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        value={editingNote?.content || newNoteContent}
                        onchange={(e) => {
                            if (editingNote) {
                                editingNote.content = e.currentTarget.value;
                            } else {
                                newNoteContent = e.currentTarget.value;
                            }
                        }}
                        placeholder="Write your ideas..."
                        rows={4}
                        class="w-full px-4 py-2 border border-resin-earth/20 rounded-lg bg-white text-resin-charcoal focus:outline-none focus:border-resin-forest/50 resize-none"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium text-resin-charcoal mb-2">
                        Color
                    </label>
                    <div class="flex gap-2">
                        {#each ['amber', 'forest', 'rose', 'sky', 'neutral'] as color}
                            <button
                                type="button"
                                onclick={() => {
                                    if (editingNote) {
                                        editingNote.color = color;
                                    } else {
                                        newNoteColor = color;
                                    }
                                }}
                                class={`w-8 h-8 rounded-full border-2 transition-all ${colorMap[color]} ${(editingNote?.color || newNoteColor) === color ? 'border-resin-charcoal ring-2 ring-resin-charcoal/20' : 'border-transparent'}`}
                            />
                        {/each}
                    </div>
                </div>

                <div class="flex gap-3 pt-4">
                    <button
                        type="submit"
                        class="flex-1 px-4 py-2 bg-resin-amber text-white rounded-lg font-medium hover:bg-resin-amber/90 transition-colors"
                    >
                        {editingNote ? 'Update' : 'Add'}
                    </button>
                    <button
                        type="button"
                        onclick={closeEditModal}
                        class="flex-1 px-4 py-2 border border-resin-earth/20 text-resin-charcoal rounded-lg font-medium hover:bg-resin-earth/5 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    {/if}
</div>
