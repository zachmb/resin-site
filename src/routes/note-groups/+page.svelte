<script lang="ts">
    import { createSupabaseClient } from '$lib/supabase';

    let { data } = $props<{ groups: any[] }>();
    let groups = $state(data.groups || []);

    $effect(() => {
        groups = data.groups || [];
    });

    let showCreateGroup = $state(false);
    let newGroupName = $state('');
    let selectedColor = $state('resin-forest');
    let isSubmitting = $state(false);
    let error = $state('');

    const supabase = createSupabaseClient();

    const colors = [
        { value: 'resin-forest', label: 'Forest', hex: '#2d7f54' },
        { value: 'resin-amber', label: 'Amber', hex: '#d9a830' },
        { value: 'resin-earth', label: 'Earth', hex: '#8a6f54' }
    ];

    async function createGroup() {
        if (!newGroupName.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        isSubmitting = true;
        try {
            const { data: newGroup, error: err } = await supabase
                .from('note_groups')
                .insert({
                    user_id: user.id,
                    name: newGroupName,
                    color: selectedColor
                })
                .select()
                .single();

            if (err) throw err;

            groups = [...groups, newGroup];
            newGroupName = '';
            selectedColor = 'resin-forest';
            showCreateGroup = false;
        } catch (e) {
            error = 'Failed to create group. Please try again.';
            console.error(e);
        } finally {
            isSubmitting = false;
        }
    }

    async function deleteGroup(groupId: string) {
        if (!confirm('Delete this group? Notes in the group will not be deleted.')) return;

        try {
            const { error: err } = await supabase
                .from('note_groups')
                .delete()
                .eq('id', groupId);

            if (err) throw err;
            groups = groups.filter((g: any) => g.id !== groupId);
        } catch (e) {
            console.error('Error deleting group:', e);
        }
    }
</script>

<svelte:head>
    <title>Note Groups | Resin</title>
</svelte:head>

<main class="flex-grow pt-32 pb-20 px-6 relative z-10 w-full overflow-hidden bg-resin-bg">
    <div class="max-w-4xl mx-auto">
        <!-- Header Section -->
        <div class="mb-16 space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-forest/5 border border-resin-forest/10 text-resin-forest/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                        📁 Organization
                    </div>
                    <h1 class="text-5xl md:text-6xl font-bold text-resin-charcoal mb-2 font-serif">Note Groups</h1>
                    <p class="text-resin-earth/70 max-w-2xl text-lg font-light">Organize your notes by topic or project</p>
                </div>
                <button
                    class="create-btn"
                    onclick={() => (showCreateGroup = !showCreateGroup)}
                    title="Create a new group"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Group
                </button>
            </div>
        </div>

        {#if showCreateGroup}
            <div class="create-form-container">
                <div class="create-form">
                    <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Create New Group</h2>

                    <div class="form-group">
                        <label for="groupName" class="form-label">Group Name *</label>
                        <input
                            id="groupName"
                            type="text"
                            class="form-input"
                            placeholder="e.g., Project Ideas, Learning"
                            bind:value={newGroupName}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div class="form-group">
                        <label for="color-picker" class="form-label">Color</label>
                        <div class="color-picker" id="color-picker">
                            {#each colors as color (color.value)}
                                <button
                                    type="button"
                                    onclick={() => selectedColor = color.value}
                                    class="color-button"
                                    style="background-color: {color.hex}; border-color: {selectedColor === color.value ? '#000' : 'transparent'}"
                                    title={color.label}
                                ></button>
                            {/each}
                        </div>
                    </div>

                    {#if error}
                        <div class="error-message">{error}</div>
                    {/if}

                    <div class="form-actions">
                        <button
                            class="btn-cancel"
                            onclick={() => {
                                showCreateGroup = false;
                                error = '';
                                newGroupName = '';
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            class="btn-submit"
                            onclick={createGroup}
                            disabled={isSubmitting || !newGroupName.trim()}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        {#if groups.length === 0}
            <div class="empty-state">
                <div class="text-center space-y-4">
                    <svg class="w-16 h-16 mx-auto text-resin-earth/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4" />
                    </svg>
                    <div>
                        <p class="text-lg font-semibold text-resin-charcoal">No groups yet</p>
                        <p class="text-sm text-resin-earth/60 mt-1">Create your first group to organize notes</p>
                    </div>
                </div>
            </div>
        {:else}
            <div class="groups-list">
                {#each groups as group (group.id)}
                    <div class="group-item">
                        <div class="group-indicator" style="background-color: {group.color === 'resin-forest' ? '#2d7f54' : group.color === 'resin-amber' ? '#d9a830' : '#8a6f54'}"></div>
                        <div class="group-info">
                            <p class="group-name">{group.name}</p>
                            {#if group.description}
                                <p class="group-description">{group.description}</p>
                            {/if}
                        </div>
                        <button
                            class="delete-btn"
                            onclick={() => deleteGroup(group.id)}
                            title="Delete group"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</main>

<style>
    .create-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #2b4634;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .create-btn:hover:not(:disabled) {
        background: #1f3226;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(43, 70, 52, 0.2);
    }

    .create-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .create-form-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        backdrop-filter: blur(4px);
    }

    .create-form {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #2b4634;
        margin-bottom: 8px;
    }

    .form-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s ease;
        box-sizing: border-box;
    }

    .form-input:focus {
        outline: none;
        border-color: #2b4634;
        box-shadow: 0 0 0 3px rgba(43, 70, 52, 0.1);
    }

    .form-input:disabled {
        background: rgba(43, 70, 52, 0.05);
        cursor: not-allowed;
    }

    .color-picker {
        display: flex;
        gap: 12px;
    }

    .color-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .color-button:hover {
        transform: scale(1.1);
    }

    .error-message {
        padding: 12px;
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border-radius: 6px;
        font-size: 13px;
        margin-bottom: 16px;
        border-left: 3px solid #dc3545;
    }

    .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
    }

    .btn-cancel,
    .btn-submit {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-cancel {
        background: rgba(43, 70, 52, 0.1);
        color: #2b4634;
    }

    .btn-cancel:hover:not(:disabled) {
        background: rgba(43, 70, 52, 0.15);
    }

    .btn-submit {
        background: #2b4634;
        color: white;
    }

    .btn-submit:hover:not(:disabled) {
        background: #1f3226;
    }

    .btn-cancel:disabled,
    .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 500px;
        width: 100%;
    }

    .groups-list {
        display: grid;
        gap: 12px;
        width: 100%;
    }

    .group-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: white;
        border: 1px solid rgba(43, 70, 52, 0.15);
        border-radius: 16px;
        transition: all 0.2s ease;
    }

    .group-item:hover {
        border-color: rgba(43, 70, 52, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    .group-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .group-info {
        flex: 1;
        min-width: 0;
    }

    .group-name {
        font-size: 15px;
        font-weight: 600;
        color: #2b4634;
        margin: 0;
    }

    .group-description {
        font-size: 13px;
        color: rgba(43, 70, 52, 0.6);
        margin: 4px 0 0 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .delete-btn {
        padding: 8px;
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .delete-btn:hover {
        background: rgba(220, 53, 69, 0.1);
    }

    .delete-btn:active {
        transform: scale(0.95);
    }
</style>
