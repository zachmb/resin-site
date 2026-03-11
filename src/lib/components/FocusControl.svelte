<script lang="ts">
    import { fade, slide } from "svelte/transition";

    let { onSessionStarted } = $props<{
        onSessionStarted?: (session: any) => void;
    }>();

    let title = $state("");
    let duration = $state(25);
    let isSubmitting = $state(false);
    let showOptions = $state(false);
    let successMessage = $state("");
    let syncCheckTimeout: ReturnType<typeof setTimeout> | null = null;

    const startFocus = async () => {
        if (!title.trim() || isSubmitting) return;

        isSubmitting = true;
        try {
            const res = await fetch("/api/focus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    durationMinutes: duration,
                }),
            });

            const data = await res.json();
            if (data.status === "success") {
                successMessage = "Focus session sent to phone!";
                title = "";
                if (onSessionStarted) onSessionStarted(data.session);

                // Poll sync status after 5 seconds
                if (data.session?.id) {
                    if (syncCheckTimeout) clearTimeout(syncCheckTimeout);
                    syncCheckTimeout = setTimeout(async () => {
                        try {
                            const syncRes = await fetch(`/api/focus/sync-status?id=${data.session.id}`);
                            const syncData = await syncRes.json();
                            // Status will update reactively once component refetches
                            if (onSessionStarted) onSessionStarted({ ...data.session, device_scheduled: syncData.device_scheduled });
                        } catch (err) {
                            console.error('Sync check failed:', err);
                        }
                    }, 5000);
                }

                setTimeout(() => {
                    successMessage = "";
                }, 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            isSubmitting = false;
        }
    };

    const durations = [15, 25, 50, 90];
</script>

<div
    class="glass-card rounded-[2.5rem] p-8 border border-white/20 shadow-premium relative overflow-hidden group"
>
    <!-- Animated background element -->
    <div
        class="absolute -right-12 -bottom-12 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-all duration-1000"
    ></div>

    <div class="relative z-10">
        <div class="flex items-center gap-4 mb-6">
            <div
                class="w-12 h-12 rounded-2xl bg-resin-charcoal text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
            >
                <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                </svg>
            </div>
            <div>
                <h3 class="text-xl font-bold text-resin-charcoal">
                    Initiate Focus
                </h3>
                <p
                    class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider"
                >
                    Remote Session Control
                </p>
            </div>
        </div>

        <div class="space-y-4">
            <div class="relative">
                <input
                    type="text"
                    bind:value={title}
                    placeholder="What are we focusing on?"
                    class="w-full bg-white/50 border border-resin-forest/10 rounded-2xl px-5 py-4 text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-amber/30 focus:border-resin-amber/30 transition-all"
                />
                {#if title.length > 0}
                    <button
                        transition:fade
                        onclick={() => (showOptions = !showOptions)}
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-resin-earth/40 hover:text-resin-amber transition-colors"
                        aria-label="Toggle options"
                        title="Toggle options"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                            />
                        </svg>
                    </button>
                {/if}
            </div>

            {#if showOptions || title.length > 0}
                <div transition:slide class="flex flex-wrap gap-2 pt-1">
                    {#each durations as d}
                        <button
                            onclick={() => (duration = d)}
                            class="px-4 py-2 rounded-xl text-xs font-bold transition-all {duration ===
                            d
                                ? 'bg-resin-amber text-white shadow-md'
                                : 'bg-white/40 text-resin-earth hover:bg-white/60'}"
                        >
                            {d}m
                        </button>
                    {/each}
                    <div class="flex-1"></div>
                    <button
                        onclick={startFocus}
                        disabled={!title.trim() || isSubmitting}
                        class="px-6 py-2 bg-resin-charcoal text-white rounded-xl text-xs font-bold hover:bg-resin-forest transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {#if isSubmitting}
                            <span
                                class="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"
                            ></span>
                        {:else}
                            <svg
                                class="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        {/if}
                        Activate Now
                    </button>
                </div>
            {/if}

            {#if successMessage}
                <p
                    transition:fade
                    class="text-xs font-bold text-resin-forest flex items-center gap-1.5 ml-1"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    {successMessage}
                </p>
            {/if}
        </div>
    </div>
</div>
