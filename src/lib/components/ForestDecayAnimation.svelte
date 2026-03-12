<script lang="ts">
    import { fade, scale, fly } from 'svelte/transition';

    interface Props {
        decayAmount: number;
        stonesLost: number;
        message?: string;
        visible: boolean;
        onComplete?: () => void;
    }

    let { decayAmount = 15, stonesLost = 0, message = 'Your forest weakens...', visible = false, onComplete }: Props = $props();

    // Generate falling particles for decay effect
    function generateParticles(count: number) {
        return Array.from({ length: count }).map(() => ({
            id: Math.random(),
            delay: Math.random() * 200,
            duration: 1200 + Math.random() * 400,
            x: Math.random() * 80 - 40,
            y: Math.random() * 50 + 20
        }));
    }

    const particles = $derived(visible ? generateParticles(10) : []);

    // Auto-dismiss after animation completes
    $effect(() => {
        if (visible && onComplete) {
            const timer = setTimeout(() => {
                onComplete();
            }, 3200);
            return () => clearTimeout(timer);
        }
    });
</script>

{#if visible}
    <div
        class="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        in:fade={{ duration: 200 }}
        out:fade={{ duration: 300 }}
    >
        <!-- Falling decay particles -->
        {#each particles as particle}
            <div
                class="absolute text-2xl font-bold opacity-70"
                style="--x: {particle.x}px; --y: {particle.y}px; --delay: {particle.delay}ms; --duration: {particle.duration}ms"
                transition:fly={{ x: particle.x, y: particle.y, duration: particle.duration, delay: particle.delay }}
            >
                {#if Math.random() > 0.6}
                    🍂
                {:else if Math.random() > 0.3}
                    🪨
                {:else}
                    💔
                {/if}
            </div>
        {/each}

        <!-- Main decay card -->
        <div
            class="relative max-w-md w-full mx-4 rounded-2xl p-8 text-center decay-card"
            in:scale={{ duration: 300, start: 0.8 }}
            out:scale={{ duration: 200, start: 0.9 }}
        >
            <!-- Glow effect -->
            <div class="absolute inset-0 rounded-2xl -z-10" />

            <!-- Content -->
            <div class="space-y-4">
                <div class="text-4xl font-bold wilting-tree">
                    🪨
                </div>

                <p class="text-lg font-serif font-bold text-resin-earth/80">
                    {message}
                </p>

                <!-- Loss breakdown -->
                <div class="space-y-2 pt-4 border-t border-resin-earth/20">
                    <div class="flex items-center justify-center gap-2 text-red-600">
                        <span class="text-2xl">📉</span>
                        <span class="text-sm font-semibold">Forest health -{decayAmount}%</span>
                    </div>
                    {#if stonesLost > 0}
                        <div class="flex items-center justify-center gap-2 text-red-500">
                            <span class="text-lg">💎</span>
                            <span class="text-sm font-semibold">-{stonesLost} stones lost</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <style>
        .decay-card {
            background: linear-gradient(135deg, rgba(120, 113, 108, 0.15), rgba(139, 69, 19, 0.1));
            border: 2px solid rgba(107, 114, 128, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .wilting-tree {
            animation: wilt 0.8s ease-out;
        }

        @keyframes wilt {
            0% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
            }
            50% {
                transform: scale(0.95) rotate(-2deg);
                opacity: 0.8;
            }
            100% {
                transform: scale(0.85) rotate(0deg);
                opacity: 0.7;
                filter: grayscale(100%) saturate(0.5);
            }
        }
    </style>
{/if}
