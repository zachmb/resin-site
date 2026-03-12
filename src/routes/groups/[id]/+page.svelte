<script lang="ts">
    import { enhance } from '$app/forms';
    import ForestRenderer from '$lib/components/ForestRenderer.svelte';

    let { data } = $props();

    let inviteEmail = $state('');
    let inviteError = $state<string | null>(null);
    let inviteSuccess = $state<string | null>(null);
    let inviting = $state(false);

    let challengeTitle = $state('');
    let challengeMetric = $state('sessions_completed');
    let challengeTarget = $state('5');
    let challengeEndDate = $state('');
    let challengeError = $state<string | null>(null);
    let challengeSuccess = $state<string | null>(null);
    let creatingChallenge = $state(false);

    async function handleInvite() {
        inviteError = null;
        inviteSuccess = null;

        if (!inviteEmail.trim()) {
            inviteError = 'Please enter an email address';
            return;
        }

        inviting = true;
        const formData = new FormData();
        formData.append('email', inviteEmail);

        const response = await fetch(`?/invite`, {
            method: 'POST',
            body: formData
        });

        inviting = false;

        if (response.ok) {
            inviteSuccess = `Successfully invited ${inviteEmail}`;
            inviteEmail = '';
        } else {
            const error = await response.json();
            inviteError = error.data?.error || 'Failed to invite member';
        }
    }

    async function handleCreateChallenge() {
        challengeError = null;
        challengeSuccess = null;

        if (!challengeTitle.trim()) {
            challengeError = 'Challenge title is required';
            return;
        }

        creatingChallenge = true;
        const formData = new FormData();
        formData.append('title', challengeTitle);
        formData.append('metric', challengeMetric);
        formData.append('target_value', challengeTarget);
        if (challengeEndDate) formData.append('end_at', new Date(challengeEndDate).toISOString());

        const response = await fetch(`?/createChallenge`, {
            method: 'POST',
            body: formData
        });

        creatingChallenge = false;

        if (response.ok) {
            challengeSuccess = 'Challenge created successfully!';
            challengeTitle = '';
            challengeTarget = '5';
            challengeEndDate = '';
        } else {
            const error = await response.json();
            challengeError = error.data?.error || 'Failed to create challenge';
        }
    }

    function getMetricLabel(metric: string): string {
        const labels: Record<string, string> = {
            'sessions_completed': 'Sessions Completed',
            'stones': 'Total Stones',
            'streak': 'Current Streak'
        };
        return labels[metric] || metric;
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
</script>

<div class="group-detail-container">
    <!-- Header -->
    <div class="group-detail-header">
        <a href="/groups" class="back-button">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Groups
        </a>
        <div class="header-content">
            <div class="header-top">
                <div class="header-badge">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                    {data.members.length} member{data.members.length !== 1 ? 's' : ''}
                </div>
                {#if data.userRole === 'admin'}
                    <div class="admin-badge-header">👑 Admin</div>
                {/if}
            </div>
            <h1 class="text-5xl font-serif font-bold text-resin-charcoal mb-3">{data.group.name}</h1>
            {#if data.group.description}
                <p class="text-resin-earth/60 text-lg max-w-2xl leading-relaxed">{data.group.description}</p>
            {/if}
        </div>
    </div>

    <div class="group-detail-content">
        <!-- Members Section -->
        <section class="members-section">
            <div class="section-header">
                <div>
                    <h2 class="text-2xl font-serif font-bold text-resin-charcoal">Group Members</h2>
                    <p class="text-sm text-resin-earth/60 mt-1">{data.members.length} {data.members.length === 1 ? 'member' : 'members'} focused together</p>
                </div>
            </div>

            <div class="members-grid">
                {#each data.members as member (member.userId)}
                    <div class="member-card">
                        <div class="member-card-header">
                            <div>
                                <p class="member-email">{member.email}</p>
                                {#if member.role === 'admin'}
                                    <span class="role-badge">Admin</span>
                                {/if}
                            </div>
                            <div class="member-status">
                                <div class="status-dot"></div>
                            </div>
                        </div>

                        <div class="member-forest">
                            <ForestRenderer
                                stones={member.total_stones || 0}
                                streak={member.current_streak || 0}
                                size="md"
                            />
                        </div>

                        <div class="member-meta">
                            <p class="member-joined">
                                Joined {new Date(member.joinedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Leaderboard Section -->
        <section class="leaderboard-section">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Leaderboard</h2>
            <div class="leaderboard-list">
                {#each data.sortedMembers as member, index}
                    <div class="leaderboard-row">
                        <div class="rank-badge">#{index + 1}</div>
                        <div class="member-info">
                            <p class="member-name">{member.email.split('@')[0]}</p>
                            <p class="member-email-small">{member.email}</p>
                        </div>
                        <div class="member-stats">
                            <div class="stat">
                                <span class="stat-value">{member.total_stones || 0}</span>
                                <span class="stat-label">💎</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">{member.current_streak || 0}</span>
                                <span class="stat-label">🔥</span>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Challenges Section (Admin Only) -->
        {#if data.userRole === 'admin'}
            <section class="challenges-section">
                <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Challenges</h2>

                {#if challengeError}
                    <div class="error-message">
                        {challengeError}
                    </div>
                {/if}

                {#if challengeSuccess}
                    <div class="success-message">
                        ✓ {challengeSuccess}
                    </div>
                {/if}

                <form onsubmit={handleCreateChallenge} class="challenge-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="title" class="form-label">Challenge Title</label>
                            <input
                                id="title"
                                type="text"
                                bind:value={challengeTitle}
                                placeholder="e.g., Weekly Focus Sprint"
                                class="form-input"
                                disabled={creatingChallenge}
                            />
                        </div>
                        <div class="form-group">
                            <label for="metric" class="form-label">Metric</label>
                            <select bind:value={challengeMetric} class="form-input" disabled={creatingChallenge}>
                                <option value="sessions_completed">Sessions Completed</option>
                                <option value="stones">Total Stones</option>
                                <option value="streak">Current Streak</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="target" class="form-label">Target Value</label>
                            <input
                                id="target"
                                type="number"
                                bind:value={challengeTarget}
                                min="1"
                                class="form-input"
                                disabled={creatingChallenge}
                            />
                        </div>
                        <div class="form-group">
                            <label for="endDate" class="form-label">End Date (Optional)</label>
                            <input
                                id="endDate"
                                type="date"
                                bind:value={challengeEndDate}
                                class="form-input"
                                disabled={creatingChallenge}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        class="submit-button"
                        disabled={creatingChallenge || !challengeTitle.trim()}
                    >
                        {creatingChallenge ? 'Creating...' : 'Create Challenge'}
                    </button>
                </form>

                {#if data.challenges && data.challenges.length > 0}
                    <div class="active-challenges">
                        <h3 class="text-lg font-semibold text-resin-charcoal mt-8 mb-4">Active Challenges</h3>
                        {#each data.challenges as challenge}
                            <div class="challenge-card">
                                <div class="challenge-header">
                                    <h4 class="challenge-title">{challenge.title}</h4>
                                    <span class="metric-badge">{getMetricLabel(challenge.metric)}</span>
                                </div>
                                {#if challenge.description}
                                    <p class="challenge-description">{challenge.description}</p>
                                {/if}
                                <div class="challenge-progress">
                                    {#each data.sortedMembers as member}
                                        <div class="progress-row">
                                            <span class="progress-member">{member.email.split('@')[0]}</span>
                                            <div class="progress-bar">
                                                <div
                                                    class="progress-fill"
                                                    style="width: {Math.min(100, ((data.challengeProgress[challenge.id]?.[member.userId] || 0) / challenge.target_value) * 100)}%"
                                                />
                                            </div>
                                            <span class="progress-value">
                                                {data.challengeProgress[challenge.id]?.[member.userId] || 0} / {challenge.target_value}
                                            </span>
                                        </div>
                                    {/each}
                                </div>
                                {#if challenge.end_at}
                                    <p class="challenge-end">Ends {formatDate(challenge.end_at)}</p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>
        {/if}

        <!-- Invite Section (Admin Only) -->
        {#if data.userRole === 'admin'}
            <section class="invite-section">
                <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Invite Members</h2>

                {#if inviteError}
                    <div class="error-message">
                        {inviteError}
                    </div>
                {/if}

                {#if inviteSuccess}
                    <div class="success-message">
                        ✓ {inviteSuccess}
                    </div>
                {/if}

                <form onsubmit={handleInvite} class="invite-form">
                    <div class="form-group">
                        <label for="email" class="form-label">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            bind:value={inviteEmail}
                            placeholder="user@example.com"
                            class="form-input"
                            disabled={inviting}
                        />
                    </div>

                    <button
                        type="submit"
                        class="submit-button"
                        disabled={inviting || !inviteEmail.trim()}
                    >
                        {inviting ? 'Inviting...' : 'Send Invite'}
                    </button>
                </form>
            </section>
        {/if}
    </div>
</div>

<style>
    .group-detail-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    .back-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        color: #2b4634;
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.2s ease;
        font-size: 14px;
    }

    .back-button:hover {
        background: rgba(43, 70, 52, 0.1);
    }

    .group-detail-header {
        margin-bottom: 48px;
    }

    .header-top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .header-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: rgba(43, 70, 52, 0.1);
        color: #2b4634;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .admin-badge-header {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: rgba(217, 119, 6, 0.1);
        color: #d97706;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .header-content {
        margin-top: 16px;
    }

    .group-detail-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 48px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 28px;
    }

    .section-header h2 {
        margin: 0;
    }

    .members-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 24px;
    }

    .member-card {
        padding: 24px;
        background: linear-gradient(135deg, #ffffff 0%, rgba(43, 70, 52, 0.02) 100%);
        border: 1px solid rgba(43, 70, 52, 0.12);
        border-radius: 14px;
        text-align: center;
        transition: all 0.3s ease;
    }

    .member-card:hover {
        border-color: rgba(43, 70, 52, 0.25);
        box-shadow: 0 8px 16px rgba(43, 70, 52, 0.08);
    }

    .member-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
    }

    .member-status {
        flex-shrink: 0;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
    }

    .member-email {
        font-size: 14px;
        font-weight: 600;
        color: #2b4634;
        margin: 0;
    }

    .role-badge {
        padding: 4px 10px;
        background: rgba(217, 119, 6, 0.15);
        color: #d97706;
        border-radius: 16px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        margin-top: 4px;
        display: inline-block;
    }

    .member-forest {
        margin: 20px 0;
        padding: 16px;
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.05), rgba(217, 119, 6, 0.03));
        border-radius: 10px;
        border: 1px solid rgba(43, 70, 52, 0.08);
    }

    .member-meta {
        padding-top: 16px;
        border-top: 1px solid rgba(43, 70, 52, 0.08);
    }

    .member-joined {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.6);
        margin: 0;
    }

    .invite-section {
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.03), rgba(217, 119, 6, 0.03));
        padding: 32px;
        border-radius: 16px;
        border: 1px solid rgba(43, 70, 52, 0.1);
    }

    .error-message {
        padding: 12px 16px;
        background: #fee2e2;
        color: #991b1b;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
        border-left: 4px solid #dc2626;
    }

    .success-message {
        padding: 12px 16px;
        background: #dcfce7;
        color: #166534;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
        border-left: 4px solid #22c55e;
    }

    .invite-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-label {
        font-weight: 600;
        color: #2b4634;
        font-size: 14px;
    }

    .form-input {
        padding: 10px 14px;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s ease;
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

    .submit-button {
        padding: 12px 24px;
        background: #2b4634;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .submit-button:hover:not(:disabled) {
        background: #1f3025;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(43, 70, 52, 0.2);
    }

    .submit-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .leaderboard-section {
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.03), rgba(217, 119, 6, 0.03));
        padding: 32px;
        border-radius: 16px;
        border: 1px solid rgba(43, 70, 52, 0.1);
    }

    .leaderboard-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .leaderboard-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: white;
        border: 1px solid rgba(43, 70, 52, 0.1);
        border-radius: 8px;
        transition: all 0.2s ease;
    }

    .leaderboard-row:hover {
        background: rgba(43, 70, 52, 0.02);
        border-color: rgba(43, 70, 52, 0.2);
    }

    .rank-badge {
        min-width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #2b4634, #1f3025);
        color: white;
        border-radius: 50%;
        font-weight: bold;
        font-size: 14px;
    }

    .member-info {
        flex: 1;
    }

    .member-name {
        font-weight: 600;
        color: #2b4634;
        margin: 0;
        font-size: 14px;
    }

    .member-email-small {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.6);
        margin: 2px 0 0 0;
    }

    .member-stats {
        display: flex;
        gap: 20px;
    }

    .stat {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .stat-value {
        font-weight: 700;
        color: #2b4634;
        font-size: 16px;
    }

    .stat-label {
        font-size: 18px;
    }

    .challenges-section {
        background: linear-gradient(135deg, rgba(217, 119, 6, 0.05), rgba(43, 70, 52, 0.02));
        padding: 32px;
        border-radius: 16px;
        border: 1px solid rgba(217, 119, 6, 0.2);
    }

    .challenge-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .challenge-card {
        background: white;
        border: 1px solid rgba(43, 70, 52, 0.1);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
    }

    .challenge-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .challenge-title {
        font-size: 16px;
        font-weight: 600;
        color: #2b4634;
        margin: 0;
    }

    .metric-badge {
        padding: 4px 12px;
        background: rgba(217, 119, 6, 0.15);
        color: #d97706;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .challenge-description {
        font-size: 14px;
        color: rgba(43, 70, 52, 0.7);
        margin: 0 0 16px 0;
    }

    .challenge-progress {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .progress-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .progress-member {
        min-width: 80px;
        font-size: 12px;
        font-weight: 600;
        color: #2b4634;
    }

    .progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(43, 70, 52, 0.1);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2b4634, #d97706);
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .progress-value {
        min-width: 60px;
        text-align: right;
        font-size: 12px;
        font-weight: 600;
        color: #2b4634;
    }

    .challenge-end {
        font-size: 12px;
        color: rgba(43, 70, 52, 0.6);
        margin: 12px 0 0 0;
    }

    .active-challenges {
        margin-top: 24px;
    }

    @media (max-width: 768px) {
        .section-header {
            flex-direction: column;
            align-items: flex-start;
        }

        .members-grid {
            grid-template-columns: 1fr;
        }

        .invite-form {
            flex-direction: column;
        }

        .challenge-form {
            flex-direction: column;
        }

        .form-row {
            grid-template-columns: 1fr;
        }

        .leaderboard-row {
            flex-direction: column;
            text-align: center;
        }

        .member-stats {
            width: 100%;
            justify-content: center;
        }

        .challenge-header {
            flex-direction: column;
            align-items: flex-start;
        }
    }
</style>
