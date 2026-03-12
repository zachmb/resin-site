<script lang="ts">
    import { fade, scale, fly } from 'svelte/transition';

    interface Props {
        visible: boolean;
        planTitle: string;
        durationMinutes: number;
        onIgnite: () => void;
    }

    let { visible = false, planTitle = '', durationMinutes = 30, onIgnite }: Props = $props();
    let hasIgnited = $state(false);

    function handleIgnite() {
        hasIgnited = true;
        // Small delay for visual effect
        setTimeout(() => {
            onIgnite();
        }, 600);
    }

    // Auto-dismiss after animation completes
    $effect(() => {
        if (hasIgnited) {
            const timer = setTimeout(() => {
                hasIgnited = false;
            }, 1000);
            return () => clearTimeout(timer);
        }
    });
</script>

{#if visible}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 400 }}
    >
        <!-- Dark overlay -->
        <div class="absolute inset-0 bg-black/40 pointer-events-auto" onclick={handleIgnite} />

        <!-- Main ritual card -->
        <div
            class="relative max-w-sm mx-4 pointer-events-auto"
            in:scale={{ duration: 400, start: 0.9 }}
            out:scale={{ duration: 300, start: 0.95 }}
        >
            <div class="glass-card rounded-2xl p-12 text-center border border-resin-amber/40 bg-gradient-to-b from-resin-amber/15 via-resin-forest/5 to-resin-amber/10 shadow-2xl">
                <!-- Animated amber orb -->
                <div class="mb-8 flex justify-center relative h-32">
                    <!-- Outer glow rings -->
                    <div
                        class="absolute inset-0 rounded-full bg-gradient-to-br from-resin-amber/30 to-transparent blur-3xl animate-pulse"
                        style="animation: pulse-glow 2s ease-in-out infinite;"
                    />
                    <div
                        class="absolute inset-4 rounded-full bg-gradient-to-br from-resin-amber/20 to-transparent blur-2xl"
                        style="animation: pulse-glow 2s ease-in-out infinite 0.3s;"
                    />

                    <!-- Core orb -->
                    <div
                        class="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 via-resin-amber to-orange-600 shadow-2xl"
                        style="box-shadow: 0 0 40px rgba(217, 119, 6, 0.8), inset -2px -2px 8px rgba(0, 0, 0, 0.2), inset 2px 2px 8px rgba(255, 255, 255, 0.3);"
                    >
                        <!-- Inner light reflection -->
                        <div
                            class="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-200/60 to-transparent"
                            style="animation: shimmer 3s ease-in-out infinite;"
                        />
                    </div>

                    {#if hasIgnited}
                        <!-- Ignition burst particles -->
                        {#each Array.from({ length: 12 }) as _, i}
                            <div
                                class="absolute w-2 h-2 rounded-full bg-resin-amber"
                                style="--delay: {i * 30}ms; animation: burst-particle 0.8s ease-out forwards;"
                                style:--x="{Math.cos((i / 12) * Math.PI * 2) * 80}px"
                                style:--y="{Math.sin((i / 12) * Math.PI * 2) * 80}px"
                            />
                        {/each}
                    {/if}
                </div>

                <!-- Text content -->
                <div class="space-y-4">
                    <h2 class="text-2xl font-serif font-bold text-resin-charcoal">
                        {#if hasIgnited}
                            🔥 Amber Ignited
                        {:else}
                            Ready to Focus?
                        {/if}
                    </h2>

                    {#if !hasIgnited}
                        <p class="text-sm text-resin-charcoal/70 max-w-xs mx-auto leading-relaxed">
                            <span class="italic">{planTitle}</span>
                            <br />
                            <span class="text-xs text-resin-earth/60 block mt-2">{durationMinutes} minute session</span>
                        </p>

                        <p class="text-xs text-resin-earth/50 italic px-4">
                            "The forest awaits — shall we begin?"
                        </p>

                        <div class="pt-2 space-y-2">
                            <button
                                onclick={handleIgnite}
                                class="w-full px-6 py-3 bg-gradient-to-r from-resin-amber to-orange-600 text-white font-bold rounded-lg hover:shadow-lg transition-all duration-200 text-sm flex items-center justify-center gap-2"
                            >
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        d="M10.5 1.5H9.5V4H10.5V1.5zm0 13H9.5V17H10.5V14.5zm4.35-9.15L14.12 3.88L13.41 4.59L14.12 5.3L14.85 4.35zm-8.7 8.7L5.41 12.7L4.7 13.41L5.41 14.12L6.15 13.17zm8.7-8.7L13.41 4.59L12.7 3.88L11.99 4.59L12.7 5.3zm-8.7 8.7L5.41 14.12L6.12 14.83L6.83 14.12L6.15 13.17zM10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"
                                    />
                                </svg>
                                Ignite Amber
                            </button>
                            <button
                                onclick={() => (visible = false)}
                                class="w-full px-6 py-2 bg-resin-earth/10 text-resin-earth font-semibold rounded-lg hover:bg-resin-earth/20 transition-colors text-sm"
                            >
                                Not now
                            </button>
                        </div>
                    {:else}
                        <p class="text-sm text-resin-forest font-semibold">
                            Focus mode activated ✓
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .glass-card {
        backdrop-filter: blur(16px);
        background-color: rgba(255, 255, 255, 0.8);
    }

    @keyframes pulse-glow {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(0.95);
        }
        50% {
            opacity: 1;
            transform: scale(1.05);
        }
    }

    @keyframes shimmer {
        0% {
            opacity: 0.4;
        }
        50% {
            opacity: 0.8;
        }
        100% {
            opacity: 0.4;
        }
    }

    @keyframes burst-particle {
        0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(var(--x), var(--y)) scale(0);
        }
    }
</style>
