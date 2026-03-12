<script lang="ts">
    import { fade, scale, fly } from 'svelte/transition';

    interface Props {
        totalStones: number;
        bonusStones: number;
        forestHealthGain: number;
        celebrationLevel: 'standard' | 'bonus' | 'rare';
        message: string;
        visible: boolean;
    }

    let { totalStones = 3, bonusStones = 0, forestHealthGain = 3, celebrationLevel = 'standard', message = '', visible = false }: Props = $props();

    // Generate particles for celebration effect
    function generateParticles(count: number) {
        return Array.from({ length: count }).map(() => ({
            id: Math.random(),
            delay: Math.random() * 200,
            duration: 1000 + Math.random() * 500,
            x: Math.random() * 100 - 50,
            y: Math.random() * -50 - 20
        }));
    }

    const particles = $derived(visible ? generateParticles(celebrationLevel === 'rare' ? 30 : celebrationLevel === 'bonus' ? 20 : 10) : []);
</script>

{#if visible}
    <div class="fixed inset-0 pointer-events-none z-50 flex items-center justify-center" in:fade={{ duration: 200 }} out:fade={{ duration: 300 }}>
        <!-- Confetti/particle background -->
        {#each particles as particle}
            <div
                class="absolute text-2xl font-bold opacity-80"
                style="--x: {particle.x}px; --y: {particle.y}px; --delay: {particle.delay}ms; --duration: {particle.duration}ms"
                transition:fly={{ x: particle.x, y: particle.y, duration: particle.duration, delay: particle.delay }}
            >
                {#if celebrationLevel === 'rare'}
                    ✨
                {:else if celebrationLevel === 'bonus'}
                    ⭐
                {:else}
                    💎
                {/if}
            </div>
        {/each}

        <!-- Main celebration card -->
        <div
            class="relative max-w-md w-full mx-4 rounded-2xl p-8 text-center"
            class:celebration-standard={celebrationLevel === 'standard'}
            class:celebration-bonus={celebrationLevel === 'bonus'}
            class:celebration-rare={celebrationLevel === 'rare'}
            in:scale={{ duration: 300, start: 0.8 }}
            out:scale={{ duration: 200, start: 0.9 }}
        >
            <!-- Glow effect -->
            <div class="absolute inset-0 rounded-2xl -z-10" />

            <!-- Content -->
            <div class="space-y-4">
                <div class="text-4xl font-bold">
                    {#if celebrationLevel === 'rare'}
                        🎉
                    {:else if celebrationLevel === 'bonus'}
                        ✨
                    {:else}
                        ✓
                    {/if}
                </div>

                <p class="text-xl font-serif font-bold text-resin-charcoal">
                    {message}
                </p>

                <!-- Reward breakdown -->
                <div class="space-y-2 pt-4 border-t border-resin-forest/10">
                    <div class="flex items-center justify-center gap-2">
                        <span class="text-2xl">💎</span>
                        <span class="text-sm font-semibold text-resin-charcoal">{totalStones} stones earned</span>
                    </div>
                    {#if bonusStones > 0}
                        <div class="flex items-center justify-center gap-2 text-resin-amber">
                            <span class="text-lg">⭐</span>
                            <span class="text-sm font-semibold">+{bonusStones} bonus stones!</span>
                        </div>
                    {/if}
                    <div class="flex items-center justify-center gap-2 text-resin-forest">
                        <span class="text-lg">🌳</span>
                        <span class="text-sm font-semibold">Forest grew by {forestHealthGain}%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <style>
        .celebration-standard {
            background: linear-gradient(135deg, rgba(43, 70, 52, 0.1), rgba(217, 119, 6, 0.05));
            border: 2px solid rgba(43, 70, 52, 0.2);
            box-shadow: 0 8px 32px rgba(43, 70, 52, 0.1);
        }

        .celebration-bonus {
            background: linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(34, 197, 94, 0.1));
            border: 2px solid rgba(217, 119, 6, 0.4);
            box-shadow: 0 0 40px rgba(217, 119, 6, 0.3), inset 0 0 20px rgba(217, 119, 6, 0.1);
        }

        .celebration-rare {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(34, 197, 94, 0.15));
            border: 2px solid rgba(168, 85, 247, 0.5);
            box-shadow: 0 0 60px rgba(168, 85, 247, 0.4), inset 0 0 30px rgba(168, 85, 247, 0.15);
            animation: rare-pulse 0.6s ease-out;
        }

        @keyframes rare-pulse {
            0% {
                box-shadow: 0 0 60px rgba(168, 85, 247, 0.4), inset 0 0 30px rgba(168, 85, 247, 0.15);
            }
            50% {
                box-shadow: 0 0 80px rgba(168, 85, 247, 0.6), inset 0 0 40px rgba(168, 85, 247, 0.25);
            }
            100% {
                box-shadow: 0 0 60px rgba(168, 85, 247, 0.4), inset 0 0 30px rgba(168, 85, 247, 0.15);
            }
        }
    </style>
{/if}
