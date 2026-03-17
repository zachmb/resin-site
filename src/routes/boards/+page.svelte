<script lang="ts">
    import { enhance } from '$app/forms';
    import { Users, Plus } from 'lucide-svelte';

    let { data } = $props();

    let showCreateForm = $state(false);
    let createFormData = $state({ name: '', description: '' });
    let isCreating = $state(false);
</script>

<svelte:head>
    <title>Boards | Resin</title>
</svelte:head>

<main class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
        <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-3"
        >
            Collaboration
        </div>
        <h1 class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight mb-2">
            Boards
        </h1>
        <p class="text-resin-earth/60 font-medium">
            Create shared boards to collaborate with your team
        </p>
    </div>

    <!-- Create Board Card -->
    {#if !showCreateForm}
        <button
            onclick={() => (showCreateForm = true)}
            class="mb-8 inline-flex items-center gap-2 px-5 py-2.5 bg-resin-forest text-white rounded-xl font-semibold hover:bg-resin-charcoal transition-all shadow-sm"
        >
            <Plus size={18} />
            New Board
        </button>
    {:else}
        <div class="mb-8 glass-card rounded-[2.5rem] p-8 border border-white/20 shadow-premium bg-gradient-to-br from-white/40 to-transparent max-w-2xl">
            <h2 class="text-lg font-bold text-resin-charcoal mb-6">Create New Board</h2>
            <form
                method="POST"
                action="?/createBoard"
                use:enhance={() => {
                    isCreating = true;
                    return async ({ result }) => {
                        isCreating = false;
                        if (result.type === 'success') {
                            showCreateForm = false;
                            createFormData = { name: '', description: '' };
                        }
                    };
                }}
            >
                <div class="space-y-4">
                    <div>
                        <label for="name" class="block text-sm font-medium text-resin-charcoal mb-2">
                            Board Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={createFormData.name}
                            onchange={(e) => (createFormData.name = e.currentTarget.value)}
                            placeholder="e.g., Product Ideas, Q1 Planning"
                            required
                            class="w-full px-4 py-2.5 border border-resin-forest/20 rounded-lg bg-white/80 text-resin-charcoal placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/50 focus:bg-white transition-colors"
                        />
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-resin-charcoal mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={createFormData.description}
                            onchange={(e) => (createFormData.description = e.currentTarget.value)}
                            placeholder="What's this board for?"
                            rows={3}
                            class="w-full px-4 py-2.5 border border-resin-forest/20 rounded-lg bg-white/80 text-resin-charcoal placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/50 focus:bg-white transition-colors"
                        ></textarea>
                    </div>
                    <div class="flex gap-3">
                        <button
                            type="submit"
                            disabled={isCreating}
                            class="px-5 py-2.5 bg-resin-forest text-white rounded-lg font-semibold hover:bg-resin-charcoal transition-all disabled:opacity-50 shadow-sm"
                        >
                            {isCreating ? 'Creating...' : 'Create Board'}
                        </button>
                        <button
                            type="button"
                            onclick={() => (showCreateForm = false)}
                            class="px-5 py-2.5 border border-resin-forest/20 text-resin-charcoal rounded-lg font-semibold hover:bg-resin-forest/5 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    {/if}

    <!-- Boards List -->
    {#if data.boards.length === 0}
        <div class="flex flex-col items-center justify-center py-16">
            <div class="text-resin-earth/30 text-5xl mb-4">📋</div>
            <h3 class="text-lg font-bold text-resin-charcoal mb-2">No boards yet</h3>
            <p class="text-resin-earth/60 text-center max-w-sm">
                Create your first board to start collaborating with your team
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each data.boards as board (board.id)}
                <a
                    href="/boards/{board.id}"
                    class="block p-4 bg-white/50 backdrop-blur-sm border border-resin-forest/10 rounded-xl hover:bg-white/80 hover:border-resin-forest/30 hover:shadow-md transition-all group cursor-pointer"
                >
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h3 class="text-base font-semibold text-resin-charcoal group-hover:text-resin-forest transition-colors">
                                {board.name}
                            </h3>
                        </div>
                        <div class="flex items-center gap-1.5 text-resin-earth/60 ml-4 flex-shrink-0">
                            <Users size={16} />
                            <span class="text-sm">{board.memberCount || 1}</span>
                        </div>
                    </div>

                    {#if board.description}
                        <p class="text-sm text-resin-earth/70 line-clamp-2 mb-3">
                            {board.description}
                        </p>
                    {/if}

                    <div class="flex items-center justify-between">
                        <div class="text-xs text-resin-earth/50">
                            {new Date(board.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                        <div class="text-sm text-resin-forest font-medium group-hover:translate-x-1 transition-transform">
                            Open →
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/if}
</main>
