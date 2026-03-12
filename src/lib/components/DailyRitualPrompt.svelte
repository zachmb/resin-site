<script lang="ts">
    import { fly, fade } from 'svelte/transition';

    interface Props {
        visible: boolean;
        daysWithoutSession: number;
        currentStreak: number;
        onDismiss: () => void;
    }

    let { visible = false, daysWithoutSession = 1, currentStreak = 0, onDismiss }: Props = $props();

    function getMessage() {
        if (currentStreak > 5) {
            return `🔥 Your ${currentStreak}-day streak is waiting! Complete today's Amber session to keep it alive.`;
        } else if (daysWithoutSession === 1) {
            return '🌱 Ready to grow your forest? Let\'s start today\'s Amber session.';
        } else {
            return `🪨 Your forest has been waiting ${daysWithoutSession} days. It\'s time to focus and help it recover.`;
        }
    }

    function getButtonText() {
        if (currentStreak > 5) {
            return 'Protect my streak';
        } else if (daysWithoutSession > 3) {
            return 'Save my forest';
        } else {
            return 'Start Amber session';
        }
    }
</script>

{#if visible}
    <div
        class="fixed bottom-20 left-6 right-6 z-40 max-w-md"
        in:fly={{ y: 100, duration: 300 }}
        out:fly={{ y: 100, duration: 200 }}
    >
        <div class="glass-card rounded-xl p-4 border border-resin-amber/30 bg-gradient-to-r from-resin-amber/10 via-resin-forest/5 to-resin-amber/5 shadow-lg">
            <div class="flex items-start gap-3">
                <div class="text-2xl mt-1 flex-shrink-0">
                    {#if currentStreak > 5}
                        🔥
                    {:else if daysWithoutSession > 3}
                        🪨
                    {:else}
                        🌱
                    {/if}
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-resin-charcoal mb-2">
                        {getMessage()}
                    </p>
                    <div class="flex gap-2">
                        <a
                            href="/amber"
                            class="px-3 py-1.5 bg-resin-forest text-white text-xs font-bold rounded-lg hover:bg-resin-charcoal transition-colors inline-block"
                        >
                            {getButtonText()}
                        </a>
                        <button
                            onclick={onDismiss}
                            class="px-3 py-1.5 bg-resin-earth/10 text-resin-earth text-xs font-bold rounded-lg hover:bg-resin-earth/20 transition-colors"
                        >
                            Later
                        </button>
                    </div>
                </div>

                <button
                    onclick={onDismiss}
                    class="flex-shrink-0 text-resin-earth/40 hover:text-resin-earth/70 transition-colors mt-1"
                    aria-label="Dismiss"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .glass-card {
        backdrop-filter: blur(12px);
        background-color: rgba(255, 255, 255, 0.7);
    }
</style>
