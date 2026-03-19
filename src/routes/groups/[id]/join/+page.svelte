<script lang="ts">
    import { enhance } from '$app/forms';

    let { data } = $props();
    let isJoining = $state(false);
</script>

<svelte:head>
    <title>Join {data.groupName} | Resin</title>
</svelte:head>

<main class="join-container">
    <div class="join-card">
        <div class="join-icon">👥</div>
        <h1 class="join-title">Join {data.groupName}</h1>
        <p class="join-message">You've been invited to join this focus group</p>

        <form method="POST" action="?/joinGroup" use:enhance={() => {
            isJoining = true;
            return async ({ result }) => {
                isJoining = false;
            };
        }} class="join-form">
            <button type="submit" class="btn-join" disabled={isJoining}>
                {isJoining ? 'Joining...' : 'Accept & Join'}
            </button>
        </form>

        <a href="/groups" class="btn-decline">Skip for now</a>
    </div>
</main>

<style>
    .join-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, rgba(43, 70, 52, 0.05), rgba(217, 119, 6, 0.03));
        padding: 20px;
    }

    .join-card {
        background: white;
        border-radius: 16px;
        padding: 48px 40px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(43, 70, 52, 0.1);
    }

    .join-icon {
        font-size: 48px;
        margin-bottom: 24px;
    }

    .join-title {
        font-size: 24px;
        font-weight: 700;
        color: #2b4634;
        margin: 0 0 12px 0;
    }

    .join-message {
        font-size: 16px;
        color: rgba(43, 70, 52, 0.7);
        margin: 0 0 32px 0;
    }

    .join-form {
        margin-bottom: 16px;
    }

    .btn-join {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #2b4634, #1f3226);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-join:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(43, 70, 52, 0.3);
    }

    .btn-join:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-decline {
        display: inline-block;
        padding: 12px 20px;
        background: rgba(43, 70, 52, 0.1);
        color: #2b4634;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
    }

    .btn-decline:hover {
        background: rgba(43, 70, 52, 0.2);
    }
</style>
