<script lang="ts">
    import { enhance } from '$app/forms';
    import SimpleTree from '$lib/components/SimpleTree.svelte';

    let { data } = $props();

    // Tab state
    let activeTab = $state('notes');

    // Notes form state
    let newNoteTitle = $state('');
    let newNoteContent = $state('');
    let newNoteColor = $state('amber');
    let addingNote = $state(false);

    // Focus session state
    let focusTitle = $state('');
    let focusDate = $state('');
    let focusTime = $state('');
    let focusDuration = $state('25');
    let schedulingSession = $state(false);

    // Generated invite link
    let inviteLinkOpen = $state(false);
    let inviteLoading = $state(false);
    let inviteLink = $state('');

    // Member color palette (deterministic from index)
    const memberColors = [
        '#f59e0b', // amber
        '#10b981', // emerald
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316'  // orange
    ];

    function getMemberColor(index: number): string {
        return memberColors[index % memberColors.length];
    }

    async function handleAddNote() {
        if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

        addingNote = true;
        const formData = new FormData();
        formData.append('title', newNoteTitle);
        formData.append('content', newNoteContent);
        formData.append('color', newNoteColor);

        const response = await fetch('?/addNote', {
            method: 'POST',
            body: formData
        });

        addingNote = false;

        if (response.ok) {
            newNoteTitle = '';
            newNoteContent = '';
            newNoteColor = 'amber';
        }
    }

    async function handleScheduleSession() {
        if (!focusTitle.trim() || !focusDate || !focusTime) return;

        schedulingSession = true;
        const startDateTime = new Date(`${focusDate}T${focusTime}`).toISOString();

        const formData = new FormData();
        formData.append('title', focusTitle);
        formData.append('start_time', startDateTime);
        formData.append('duration_minutes', focusDuration);

        const response = await fetch('?/scheduleSession', {
            method: 'POST',
            body: formData
        });

        schedulingSession = false;

        if (response.ok) {
            focusTitle = '';
            focusDate = '';
            focusTime = '';
            focusDuration = '25';
        }
    }

    async function handleStartNow() {
        const formData = new FormData();
        formData.append('title', 'Group Focus Session');
        formData.append('duration_minutes', '25');

        await fetch('?/startNowSession', {
            method: 'POST',
            body: formData
        });
    }

    async function handleGenerateInvite() {
        inviteLoading = true;
        const formData = new FormData();

        const response = await fetch('?/generateGroupInvite', {
            method: 'POST',
            body: formData
        });

        inviteLoading = false;

        if (response.ok) {
            const result = await response.json();
            inviteLink = `${window.location.origin}${result.data.inviteUrl}`;
        }
    }

    function formatDateTime(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
</script>

<div class="group-detail-container">
    <!-- Header -->
    <div class="group-header">
        <div class="header-top">
            <a href="/groups" class="back-button">← Back</a>
            {#if data.userRole === 'admin'}
                <button class="admin-badge" onclick={() => inviteLinkOpen = !inviteLinkOpen}>
                    🔗 Share Group
                </button>
            {/if}
        </div>
        <h1 class="group-title">{data.group.name}</h1>
        {#if data.group.description}
            <p class="group-description">{data.group.description}</p>
        {/if}
        <div class="members-count">{data.members.length} member{data.members.length !== 1 ? 's' : ''}</div>
    </div>

    {#if inviteLinkOpen && data.userRole === 'admin'}
        <div class="invite-modal">
            <div class="invite-content">
                <h3>Share Invite Link</h3>
                <button
                    class="btn-generate"
                    onclick={handleGenerateInvite}
                    disabled={inviteLoading}
                >
                    {inviteLoading ? 'Generating...' : 'Generate Link'}
                </button>
                {#if inviteLink}
                    <div class="invite-link-box">
                        <input type="text" readonly value={inviteLink} class="invite-link-input" />
                        <button
                            onclick={() => {
                                navigator.clipboard.writeText(inviteLink);
                            }}
                            class="btn-copy"
                        >
                            Copy
                        </button>
                    </div>
                {/if}
                <button
                    class="btn-close"
                    onclick={() => {
                        inviteLinkOpen = false;
                        inviteLink = '';
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    {/if}

    <!-- Tabs -->
    <div class="tabs">
        <button
            class="tab-button {activeTab === 'notes' ? 'active' : ''}"
            onclick={() => (activeTab = 'notes')}
        >
            📝 Notes
        </button>
        <button
            class="tab-button {activeTab === 'forest' ? 'active' : ''}"
            onclick={() => (activeTab = 'forest')}
        >
            🌲 Forest
        </button>
        <button
            class="tab-button {activeTab === 'focus' ? 'active' : ''}"
            onclick={() => (activeTab = 'focus')}
        >
            ⏱ Focus
        </button>
    </div>

    <!-- TAB: NOTES -->
    {#if activeTab === 'notes'}
        <div class="tab-content">
            <section class="notes-section">
                <div class="section-title">Collaborative Notes</div>
                <form class="add-note-form" onsubmit={(e) => { e.preventDefault(); handleAddNote(); }}>
                    <input
                        type="text"
                        placeholder="Note title..."
                        bind:value={newNoteTitle}
                        class="note-input"
                        disabled={addingNote}
                    />
                    <textarea
                        placeholder="What's on your mind?"
                        bind:value={newNoteContent}
                        class="note-textarea"
                        disabled={addingNote}
                        rows="3"
                    ></textarea>
                    <div class="note-form-footer">
                        <select bind:value={newNoteColor} class="note-color-select" disabled={addingNote}>
                            <option value="amber">Amber</option>
                            <option value="green">Green</option>
                            <option value="blue">Blue</option>
                            <option value="purple">Purple</option>
                        </select>
                        <button type="submit" class="btn-add-note" disabled={addingNote || !newNoteTitle.trim() || !newNoteContent.trim()}>
                            {addingNote ? 'Adding...' : 'Add Note'}
                        </button>
                    </div>
                </form>

                <div class="notes-grid">
                    {#each data.notes as note (note.id)}
                        <div class="note-card note-{note.color}">
                            <h3 class="note-title">{note.title}</h3>
                            <p class="note-content">{note.content}</p>
                            <div class="note-meta">
                                <span class="note-author">{note.profiles?.email?.split('@')[0]}</span>
                                <span class="note-date">{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    {/if}

    <!-- TAB: FOREST -->
    {#if activeTab === 'forest'}
        <div class="tab-content">
            <section class="forest-section">
                <div class="section-title">Shared Forest</div>

                {#if data.members.length > 0}
                    <div class="member-legend">
                        <p class="legend-label">Member Colors</p>
                        <div class="legend-items">
                            {#each data.members as member, idx (member.userId)}
                                <div class="legend-item">
                                    <div class="legend-dot" style="background-color: {getMemberColor(idx)}"></div>
                                    <span>{member.email.split('@')[0]}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div class="trees-grid">
                    {#each data.members as member, memberIdx (member.userId)}
                        <div class="member-section">
                            <h3 class="member-name">{member.email}</h3>
                            <div class="trees-container">
                                {#if data.memberSessionsMap[member.userId]?.length > 0}
                                    {#each data.memberSessionsMap[member.userId] as tree, idx (idx)}
                                        <div class="tree-wrapper" style="border-color: {getMemberColor(memberIdx)}">
                                            <SimpleTree species={tree} />
                                        </div>
                                    {/each}
                                {:else}
                                    <div class="no-trees">No sessions yet</div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    {/if}

    <!-- TAB: FOCUS -->
    {#if activeTab === 'focus'}
        <div class="tab-content">
            <section class="focus-section">
                <div class="section-title">Group Focus Sessions</div>

                {#if data.userRole === 'admin'}
                    <div class="focus-admin-panel">
                        <button class="btn-start-now" onclick={handleStartNow}>⏱ Start Session Now</button>

                        <form class="schedule-form" onsubmit={(e) => { e.preventDefault(); handleScheduleSession(); }}>
                            <h3>Schedule a Session</h3>
                            <input
                                type="text"
                                placeholder="Session title..."
                                bind:value={focusTitle}
                                class="form-input"
                                disabled={schedulingSession}
                            />
                            <input
                                type="date"
                                bind:value={focusDate}
                                class="form-input"
                                disabled={schedulingSession}
                            />
                            <input
                                type="time"
                                bind:value={focusTime}
                                class="form-input"
                                disabled={schedulingSession}
                            />
                            <select bind:value={focusDuration} class="form-input" disabled={schedulingSession}>
                                <option value="15">15 minutes</option>
                                <option value="25">25 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                            </select>
                            <button type="submit" class="btn-schedule" disabled={schedulingSession || !focusTitle.trim() || !focusDate || !focusTime}>
                                {schedulingSession ? 'Scheduling...' : 'Schedule'}
                            </button>
                        </form>
                    </div>
                {/if}

                {#if data.activeFocusSessions.length > 0}
                    <div class="sessions-list">
                        <h3 class="sessions-heading">🔴 Active Sessions</h3>
                        {#each data.activeFocusSessions as session (session.id)}
                            <div class="session-card active">
                                <div class="session-header">
                                    <h4>{session.title}</h4>
                                    <span class="badge-live">LIVE</span>
                                </div>
                                <p class="session-time">{formatDateTime(session.start_time)}</p>
                                <p class="session-duration">{session.duration_minutes}m focus</p>
                                <div class="session-participants">
                                    {session.group_session_participants?.length || 0} joined
                                </div>
                                <form onsubmit={(e) => { e.preventDefault(); }} class="session-action">
                                    <button
                                        formaction="?/joinSession"
                                        name="session_id"
                                        value={session.id}
                                        class="btn-join"
                                    >
                                        Join Now
                                    </button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if data.scheduledFocusSessions.length > 0}
                    <div class="sessions-list">
                        <h3 class="sessions-heading">📅 Scheduled Sessions</h3>
                        {#each data.scheduledFocusSessions as session (session.id)}
                            <div class="session-card scheduled">
                                <div class="session-header">
                                    <h4>{session.title}</h4>
                                </div>
                                <p class="session-time">{formatDateTime(session.start_time)}</p>
                                <p class="session-duration">{session.duration_minutes}m focus</p>
                                <form onsubmit={(e) => { e.preventDefault(); }} class="session-action">
                                    <button
                                        formaction="?/joinSession"
                                        name="session_id"
                                        value={session.id}
                                        class="btn-prejoin"
                                    >
                                        Pre-join
                                    </button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if data.focusSessions.length === 0}
                    <div class="empty-state">No sessions yet</div>
                {/if}
            </section>
        </div>
    {/if}

    <!-- OLD CONTENT TO REMOVE -->
    <div style="display: none;">
        <section class="members-section">
            <div class="section-header">
                <div>
                    <h2 class="text-2xl font-serif font-bold text-resin-charcoal">Group Members</h2>
                    <p class="text-sm text-resin-earth/60 mt-1">{data.members.length} {data.members.length === 1 ? 'member' : 'members'} focused together</p>
                </div>
            </div>

            <!-- Placeholder - old content removed -->
        </section>
    </div>
</div>

<style>
    .group-detail-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    .group-header {
        margin-bottom: 40px;
    }

    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .back-button {
        padding: 8px 12px;
        color: #2b4634;
        text-decoration: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
    }

    .back-button:hover {
        background: rgba(43, 70, 52, 0.1);
    }

    .admin-badge {
        padding: 8px 16px;
        background: rgba(217, 119, 6, 0.15);
        color: #d97706;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .admin-badge:hover {
        background: rgba(217, 119, 6, 0.25);
    }

    .group-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #2b4634;
        margin: 0 0 12px 0;
        font-family: system-ui, -apple-system;
    }

    .group-description {
        font-size: 16px;
        color: rgba(43, 70, 52, 0.7);
        margin: 0 0 16px 0;
    }

    .members-count {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.6);
    }

    .invite-modal {
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
    }

    .invite-content {
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .invite-content h3 {
        margin: 0 0 16px 0;
        color: #2b4634;
        font-size: 18px;
        font-weight: 600;
    }

    .btn-generate {
        width: 100%;
        padding: 10px;
        background: #2b4634;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 16px;
    }

    .btn-generate:hover:not(:disabled) {
        background: #1f3226;
    }

    .btn-generate:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .invite-link-box {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
    }

    .invite-link-input {
        flex: 1;
        padding: 10px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
    }

    .btn-copy {
        padding: 10px 16px;
        background: rgba(43, 70, 52, 0.1);
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-copy:hover {
        background: rgba(43, 70, 52, 0.2);
    }

    .btn-close {
        width: 100%;
        padding: 10px;
        background: rgba(43, 70, 52, 0.1);
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-close:hover {
        background: rgba(43, 70, 52, 0.2);
    }

    .tabs {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid rgba(43, 70, 52, 0.1);
        margin-bottom: 40px;
    }

    .tab-button {
        padding: 12px 20px;
        background: none;
        border: none;
        font-size: 16px;
        font-weight: 600;
        color: rgba(43, 70, 52, 0.5);
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
    }

    .tab-button:hover {
        color: #2b4634;
    }

    .tab-button.active {
        color: #2b4634;
        border-bottom-color: #d97706;
    }

    .tab-content {
        animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .section-title {
        font-size: 20px;
        font-weight: 700;
        color: #2b4634;
        margin-bottom: 24px;
    }

    /* NOTES TAB */
    .notes-section {
    }

    .add-note-form {
        background: rgba(43, 70, 52, 0.03);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(43, 70, 52, 0.1);
        margin-bottom: 32px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .note-input {
        padding: 10px 14px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
    }

    .note-input:focus {
        outline: none;
        border-color: #2b4634;
        box-shadow: 0 0 0 3px rgba(43, 70, 52, 0.1);
    }

    .note-textarea {
        padding: 10px 14px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        resize: none;
    }

    .note-textarea:focus {
        outline: none;
        border-color: #2b4634;
        box-shadow: 0 0 0 3px rgba(43, 70, 52, 0.1);
    }

    .note-form-footer {
        display: flex;
        gap: 12px;
        align-items: center;
    }

    .note-color-select {
        padding: 8px 12px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 6px;
        font-size: 14px;
    }

    .btn-add-note {
        padding: 10px 20px;
        background: #2b4634;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-add-note:hover:not(:disabled) {
        background: #1f3226;
        transform: translateY(-2px);
    }

    .btn-add-note:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .notes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
    }

    .note-card {
        padding: 20px;
        border-radius: 12px;
        border: 2px solid transparent;
        background: white;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .note-amber {
        border-color: #f59e0b;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), white);
    }

    .note-green {
        border-color: #10b981;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), white);
    }

    .note-blue {
        border-color: #3b82f6;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), white);
    }

    .note-purple {
        border-color: #8b5cf6;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), white);
    }

    .note-title {
        font-size: 16px;
        font-weight: 700;
        color: #2b4634;
        margin: 0;
    }

    .note-content {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.8);
        margin: 0;
        line-height: 1.5;
        flex: 1;
    }

    .note-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(43, 70, 52, 0.5);
        padding-top: 8px;
        border-top: 1px solid rgba(43, 70, 52, 0.1);
    }

    /* FOREST TAB */
    .forest-section {
    }

    .member-legend {
        background: rgba(43, 70, 52, 0.03);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(43, 70, 52, 0.1);
        margin-bottom: 32px;
    }

    .legend-label {
        font-size: 14px;
        font-weight: 600;
        color: #2b4634;
        margin: 0 0 12px 0;
        text-transform: uppercase;
    }

    .legend-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #2b4634;
    }

    .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .trees-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 24px;
    }

    .member-section {
        background: white;
        border: 1px solid rgba(43, 70, 52, 0.12);
        border-radius: 12px;
        padding: 20px;
    }

    .member-name {
        font-size: 16px;
        font-weight: 600;
        color: #2b4634;
        margin: 0 0 16px 0;
    }

    .trees-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .tree-wrapper {
        border: 3px solid transparent;
        border-radius: 8px;
        padding: 12px;
        background: rgba(43, 70, 52, 0.02);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .no-trees {
        grid-column: 1 / -1;
        text-align: center;
        padding: 20px;
        color: rgba(43, 70, 52, 0.5);
        font-size: 14px;
    }

    /* FOCUS TAB */
    .focus-section {
    }

    .focus-admin-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 32px;
    }

    .btn-start-now {
        padding: 16px;
        background: linear-gradient(135deg, #d97706, #f59e0b);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-start-now:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(217, 119, 6, 0.3);
    }

    .schedule-form {
        background: rgba(43, 70, 52, 0.03);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(43, 70, 52, 0.1);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .schedule-form h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #2b4634;
    }

    .form-input {
        padding: 10px 14px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
    }

    .form-input:focus {
        outline: none;
        border-color: #2b4634;
        box-shadow: 0 0 0 3px rgba(43, 70, 52, 0.1);
    }

    .btn-schedule {
        padding: 10px;
        background: #2b4634;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-schedule:hover:not(:disabled) {
        background: #1f3226;
    }

    .btn-schedule:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .sessions-list {
        margin-bottom: 32px;
    }

    .sessions-heading {
        font-size: 16px;
        font-weight: 600;
        color: #2b4634;
        margin: 0 0 16px 0;
    }

    .session-card {
        padding: 20px;
        border-radius: 12px;
        border-left: 4px solid;
        background: white;
        margin-bottom: 12px;
        transition: all 0.2s;
    }

    .session-card.active {
        border-left-color: #ef4444;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), white);
    }

    .session-card.scheduled {
        border-left-color: #3b82f6;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), white);
    }

    .session-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .session-header h4 {
        margin: 0;
        font-size: 16px;
        color: #2b4634;
    }

    .badge-live {
        padding: 4px 10px;
        background: #ef4444;
        color: white;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }

    .session-time {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.7);
        margin: 0 0 4px 0;
    }

    .session-duration {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.7);
        margin: 0 0 8px 0;
    }

    .session-participants {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.5);
        margin-bottom: 12px;
    }

    .session-action {
        display: flex;
        gap: 8px;
    }

    .btn-join,
    .btn-prejoin {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-join {
        background: #ef4444;
        color: white;
    }

    .btn-join:hover {
        background: #dc2626;
    }

    .btn-prejoin {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
    }

    .btn-prejoin:hover {
        background: rgba(59, 130, 246, 0.3);
    }

    .empty-state {
        text-align: center;
        padding: 40px;
        color: rgba(43, 70, 52, 0.5);
        font-size: 16px;
    }

    @media (max-width: 768px) {
        .tabs {
            overflow-x: auto;
        }

        .focus-admin-panel {
            grid-template-columns: 1fr;
        }

        .notes-grid {
            grid-template-columns: 1fr;
        }

        .trees-grid {
            grid-template-columns: 1fr;
        }

        .legend-items {
            grid-template-columns: 1fr;
        }
    }
</style>
