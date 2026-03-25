<script lang="ts">
    import { UserPlus, Users } from "lucide-svelte";
    
    let { data } = $props();
    let groups = $derived(data.groups || []);

    let showCreateForm = $state(false);
    let formData = $state({ name: '', description: '' });
    let isSubmitting = $state(false);
    let error = $state('');

    async function handleCreateGroup() {
        error = '';
        if (!formData.name.trim()) {
            error = 'Group name is required';
            return;
        }

        isSubmitting = true;
        try {
            const response = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                error = result.error || 'Failed to create group';
                return;
            }

            // Reset form and refresh page
            formData = { name: '', description: '' };
            showCreateForm = false;
            window.location.reload();
        } catch (e) {
            error = 'An error occurred. Please try again.';
            console.error(e);
        } finally {
            isSubmitting = false;
        }
    }
</script>

<svelte:head>
    <title>Focus Groups | Resin</title>
</svelte:head>

<main class="flex-grow pt-32 pb-20 px-6 relative z-10 w-full overflow-hidden bg-resin-bg">
    <div class="max-w-6xl mx-auto">
        <!-- Header Section -->
        <div class="mb-16 space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-forest/5 border border-resin-forest/10 text-resin-forest/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                        👥 Community
                    </div>
                    <h1 class="text-5xl md:text-6xl font-bold text-resin-charcoal mb-2 font-serif">Focus Groups</h1>
                    <p class="text-resin-earth/70 max-w-2xl text-lg font-light">Connect with study buddies, form accountability circles, and compete on shared challenges. Work together, focus better.</p>
                </div>
                <button
                    class="create-btn"
                    onclick={() => (showCreateForm = !showCreateForm)}
                    title="Create a new group"
                >
                    <UserPlus class="w-5 h-5" />
                    Create Group
                </button>
            </div>
        </div>

    {#if showCreateForm}
        <div class="create-form-container">
            <div class="create-form">
                <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Create New Group</h2>

                <div class="form-group">
                    <label for="groupName" class="form-label">Group Name *</label>
                    <input
                        id="groupName"
                        type="text"
                        class="form-input"
                        placeholder="e.g., Morning Focus Squad"
                        bind:value={formData.name}
                        disabled={isSubmitting}
                    />
                </div>

                <div class="form-group">
                    <label for="groupDesc" class="form-label">Description</label>
                    <textarea
                        id="groupDesc"
                        class="form-input"
                        placeholder="What's this group about? (optional)"
                        bind:value={formData.description}
                        disabled={isSubmitting}
                        rows="3"
                    ></textarea>
                </div>

                {#if error}
                    <div class="error-message">{error}</div>
                {/if}

                <div class="form-actions">
                    <button
                        class="btn-cancel"
                        onclick={() => {
                            showCreateForm = false;
                            error = '';
                            formData = { name: '', description: '' };
                        }}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn-submit"
                        onclick={handleCreateGroup}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if groups.length === 0}
        <div class="empty-state">
            <div class="text-center space-y-4 flex flex-col items-center">
                <Users class="w-16 h-16 text-resin-earth/30" />
                <div>
                    <p class="text-lg font-semibold text-resin-charcoal">No groups yet</p>
                    <p class="text-sm text-resin-earth/60 mt-1">Create one or ask a friend to invite you</p>
                </div>
            </div>
        </div>
    {:else}
        <div class="groups-grid">
            {#each groups as group (group.id)}
                <a href="/groups/{group.id}" class="group-card">
                    <div class="card-gradient"></div>

                    <div class="card-content">
                        <div class="group-header">
                            <div>
                                <h2 class="text-2xl font-serif font-bold text-resin-charcoal">{group.name}</h2>
                                {#if group.description}
                                    <p class="group-description mt-2">{group.description}</p>
                                {/if}
                            </div>
                            <span class="role-badge">{group.userRole}</span>
                        </div>

                        <div class="divider"></div>

                        <div class="group-stats-row">
                            <div class="stat">
                                <span class="stat-number">{group.members.length}</span>
                                <span class="stat-label">Member{group.members.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label-small">Joined</span>
                                <span class="stat-date">{new Date(group.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>

                        <div class="group-stats-secondary">
                            <p class="text-xs font-semibold text-resin-earth/50 uppercase tracking-wider mb-3">Member Streaks</p>
                            <div class="member-streaks-list">
                                {#each group.members.slice(0, 4) as member (member.userId)}
                                    <div class="member-streak-item">
                                        <p class="member-name-short">{member.email.split('@')[0]}</p>
                                        <span class="streak-badge">{member.current_streak || 0}🔥</span>
                                    </div>
                                {/each}
                                {#if group.members.length > 4}
                                    <div class="member-streak-item placeholder">
                                        <span>+{group.members.length - 4} more</span>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="card-footer">
                            <span class="view-link">View Group →</span>
                        </div>
                    </div>
                </a>
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
        border-radius: 12px;
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
        border-radius: 6px;
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
        border-radius: 6px;
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

    .groups-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: 28px;
        width: 100%;
    }

    .group-card {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        transition: all 0.3s ease;
        background: white;
        border: 1px solid rgba(43, 70, 52, 0.15);
        border-radius: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .group-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(43, 70, 52, 0.12);
        border-color: rgba(43, 70, 52, 0.3);
    }

    .card-gradient {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #d97706, #2b4634);
    }

    .card-content {
        display: flex;
        flex-direction: column;
        padding: 28px;
        flex: 1;
    }

    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
    }

    .group-header h2 {
        flex: 1;
        margin: 0;
        line-height: 1.3;
    }

    .role-badge {
        padding: 6px 12px;
        background: rgba(43, 70, 52, 0.1);
        color: #2b4634;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .group-description {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.7);
        line-height: 1.5;
        margin: 0;
    }

    .divider {
        height: 1px;
        background: linear-gradient(90deg, rgba(43, 70, 52, 0.1), transparent);
        margin: 16px 0;
    }

    .group-stats-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #2b4634;
    }

    .stat-label {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.6);
        font-weight: 500;
    }

    .stat-label-small {
        font-size: 11px;
        color: rgba(43, 70, 52, 0.5);
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    .stat-date {
        font-size: 14px;
        font-weight: 600;
        color: #2b4634;
    }

    .group-stats-secondary {
        flex: 1;
        margin-top: 8px;
    }

    .member-streaks-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .member-streak-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.03), rgba(217, 119, 6, 0.02));
        border-radius: 8px;
        border: 1px solid rgba(43, 70, 52, 0.08);
    }

    .member-streak-item.placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(43, 70, 52, 0.05);
        border: 1px dashed rgba(43, 70, 52, 0.15);
        font-size: 12px;
        font-weight: 600;
        color: rgba(43, 70, 52, 0.5);
        padding: 12px;
    }

    .member-name-short {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.8);
        font-weight: 500;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
    }

    .streak-badge {
        font-size: 13px;
        font-weight: 600;
        color: #d97706;
        white-space: nowrap;
        margin-left: 4px;
    }

    .card-footer {
        padding-top: 12px;
        border-top: 1px solid rgba(43, 70, 52, 0.08);
    }

    .view-link {
        font-size: 12px;
        font-weight: 600;
        color: #2b4634;
        transition: all 0.2s ease;
    }

    .group-card:hover .view-link {
        color: #d97706;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 500px;
        width: 100%;
    }
</style>
