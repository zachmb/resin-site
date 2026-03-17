<script lang="ts">
    import { enhance } from '$app/forms';

    let { data } = $props();

    let isJoining = $state(false);
</script>

<svelte:head>
    <title>{data.error ? 'Invalid Invite' : `Join ${data.board?.name}`} | Resin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-resin-forest/5 via-white to-resin-earth/5 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
        {#if data.error}
            <!-- Error State -->
            <div class="glass-card rounded-2xl p-8 border border-white/20 shadow-premium text-center">
                <div class="text-5xl mb-4">❌</div>
                <h1 class="text-2xl font-bold text-resin-charcoal mb-2">Invalid Invite</h1>
                <p class="text-resin-earth/70 mb-6">
                    {data.error}
                </p>
                <a
                    href="/boards"
                    class="inline-block px-6 py-2 bg-resin-amber text-white rounded-lg font-medium hover:bg-resin-amber/90 transition-colors"
                >
                    Back to Boards
                </a>
            </div>
        {:else}
            <!-- Success State -->
            <div class="glass-card rounded-2xl p-8 border border-white/20 shadow-premium">
                <div class="text-5xl mb-4 text-center">👋</div>
                <h1 class="text-2xl font-bold text-resin-charcoal mb-2 text-center">
                    Join Workspace
                </h1>
                <p class="text-resin-earth/70 text-center mb-6">
                    You've been invited to join
                    <strong class="text-resin-charcoal">{data.board?.name}</strong>
                </p>

                <form
                    method="POST"
                    action="?/join"
                    use:enhance={() => {
                        isJoining = true;
                        return async ({ result }) => {
                            if (result.type === 'success') {
                                isJoining = false;
                            }
                        };
                    }}
                    class="space-y-4"
                >
                    <input type="hidden" name="token" value={data.token} />
                    <input type="hidden" name="boardId" value={data.boardId} />

                    <button
                        type="submit"
                        disabled={isJoining}
                        class="w-full px-6 py-3 bg-resin-amber text-white rounded-lg font-medium hover:bg-resin-amber/90 transition-colors disabled:opacity-50"
                    >
                        {isJoining ? 'Joining...' : 'Join Board'}
                    </button>
                </form>

                <p class="text-xs text-resin-earth/50 text-center mt-4">
                    By joining this board, you'll be able to collaborate with other team members
                </p>
            </div>
        {/if}
    </div>
</div>
