<script lang="ts">
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // Profile is reactive through data prop; layout handles realtime sync
    let profile = $derived(data.profile);
    let insights = $derived(data.insights);

    const getStreakEmoji = (streak: number) => {
        if (streak === 0) return '🌱';
        if (streak < 7) return '🔥';
        if (streak < 30) return '🔥🔥';
        return '🔥🔥🔥';
    };
</script>

<main class="min-h-screen pt-24 pb-32 px-4 md:px-8">
    <div class="max-w-6xl mx-auto">
        <!-- Header with Gradient -->
        <div class="mb-12">
            <div class="flex items-end justify-between gap-4 mb-2">
                <div>
                    <h1 class="text-5xl md:text-6xl font-serif font-bold text-resin-charcoal">Your Execution Insights</h1>
                    <p class="text-resin-earth/60 text-lg mt-2">
                        Real-time analytics on how you spend your focus time
                    </p>
                </div>
                {#if profile?.current_streak > 0}
                    <div class="text-right">
                        <div class="text-4xl mb-1">{getStreakEmoji(profile.current_streak)}</div>
                        <p class="text-sm font-semibold text-resin-earth/60">{profile.current_streak} day streak</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Key Metrics - 3 Column Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Total Completed -->
            <div class="bg-gradient-to-br from-resin-forest/10 to-resin-forest/5 rounded-2xl p-8 shadow-lg border border-resin-forest/20 hover:shadow-xl hover:border-resin-forest/30 transition-all">
                <div class="flex items-start justify-between mb-6">
                    <div class="flex-1">
                        <p class="text-resin-earth/70 text-sm font-semibold uppercase tracking-wider">Total Plans</p>
                        <p class="text-6xl font-bold text-resin-charcoal mt-3">{insights.totalCompleted}</p>
                    </div>
                    <div class="text-5xl">✅</div>
                </div>
                <p class="text-resin-earth/60 text-sm">
                    {#if insights.totalCompleted === 0}
                        Complete your first plan to start tracking
                    {:else if insights.totalCompleted === 1}
                        Great start! 2 more for pattern recognition
                    {:else}
                        You're building solid execution habits
                    {/if}
                </p>
            </div>

            <!-- Estimate Accuracy -->
            <div class="bg-gradient-to-br from-resin-amber/10 to-resin-amber/5 rounded-2xl p-8 shadow-lg border border-resin-amber/20 hover:shadow-xl hover:border-resin-amber/30 transition-all">
                <div class="flex items-start justify-between mb-6">
                    <div class="flex-1">
                        <p class="text-resin-earth/70 text-sm font-semibold uppercase tracking-wider">Estimate Accuracy</p>
                        <p class="text-4xl font-bold mt-3" class:text-green-600={insights.estimateAccuracy.includes('spot on')} class:text-blue-600={insights.estimateAccuracy.includes('faster')} class:text-orange-600={!insights.estimateAccuracy.includes('spot on') && !insights.estimateAccuracy.includes('faster')}>
                            {#if insights.estimateAccuracy.includes('not enough')}
                                —
                            {:else if insights.estimateAccuracy.includes('spot on')}
                                ✓ Spot on
                            {:else}
                                {insights.estimateAccuracy}
                            {/if}
                        </p>
                    </div>
                    <div class="text-5xl">🎯</div>
                </div>
                <p class="text-resin-earth/60 text-sm">
                    {#if insights.estimateAccuracy.includes('not enough')}
                        Complete tasks to calculate accuracy
                    {:else if insights.estimateAccuracy.includes('spot on')}
                        Your estimates match reality perfectly!
                    {:else}
                        You're getting more accurate each time
                    {/if}
                </p>
            </div>

            <!-- Peak Productivity -->
            <div class="bg-gradient-to-br from-blue-100/20 to-blue-50/10 rounded-2xl p-8 shadow-lg border border-blue-200/30 hover:shadow-xl hover:border-blue-200/50 transition-all">
                <div class="flex items-start justify-between mb-6">
                    <div class="flex-1">
                        <p class="text-resin-earth/70 text-sm font-semibold uppercase tracking-wider">Peak Hour</p>
                        <p class="text-6xl font-bold text-resin-charcoal mt-3">
                            {#if insights.mostActiveHour !== null}
                                {insights.mostActiveHour}
                            {:else}
                                —
                            {/if}
                        </p>
                    </div>
                    <div class="text-5xl">⏰</div>
                </div>
                <p class="text-resin-earth/60 text-sm">
                    {#if insights.mostActiveHour !== null}
                        Schedule important tasks around {insights.mostActiveHour}:00
                    {:else}
                        Complete plans to discover your peak time
                    {/if}
                </p>
            </div>
        </div>

        <!-- Secondary Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- Average Time Spent -->
            <div class="bg-white/50 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/5 hover:shadow-xl transition-all">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Avg Time Per Task</p>
                        <p class="text-5xl font-bold text-resin-charcoal mt-3">{insights.averageCompletionTime}m</p>
                    </div>
                    <div class="text-4xl">⏳</div>
                </div>
            </div>

            <!-- Estimation Trend -->
            <div class="bg-white/50 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/5 hover:shadow-xl transition-all">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Recent Trend</p>
                        <p class="text-lg font-semibold text-resin-charcoal mt-3">{insights.estimationTrend}</p>
                    </div>
                    <div class="text-4xl">📈</div>
                </div>
            </div>
        </div>

        <!-- Smart Recommendations -->
        <div class="bg-gradient-to-br from-resin-petrified/30 to-resin-bg/20 rounded-2xl p-8 shadow-lg border border-resin-forest/10">
            <h2 class="text-3xl font-bold text-resin-charcoal mb-8 flex items-center gap-3">
                <span>💡</span>
                Your Next Steps
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#if insights.totalCompleted === 0}
                    <div class="flex items-start gap-4 p-4 bg-white/70 rounded-lg border border-resin-amber/20">
                        <span class="text-2xl flex-shrink-0">🚀</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Get started</p>
                            <p class="text-sm text-resin-earth/60">Complete your first plan to unlock insights</p>
                        </div>
                    </div>
                {:else if insights.totalCompleted < 3}
                    <div class="flex items-start gap-4 p-4 bg-white/70 rounded-lg border border-resin-amber/20">
                        <span class="text-2xl flex-shrink-0">⚡</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Complete {3 - insights.totalCompleted} more task{3 - insights.totalCompleted === 1 ? '' : 's'}</p>
                            <p class="text-sm text-resin-earth/60">Build statistical patterns for better insights</p>
                        </div>
                    </div>
                {/if}

                {#if insights.mostActiveHour !== null}
                    <div class="flex items-start gap-4 p-4 bg-white/70 rounded-lg border border-blue-200/30">
                        <span class="text-2xl flex-shrink-0">🎯</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Optimize your schedule</p>
                            <p class="text-sm text-resin-earth/60">You're most productive at {insights.mostActiveHour}:00</p>
                        </div>
                    </div>
                {/if}

                {#if !insights.estimateAccuracy.includes('spot on') && !insights.estimateAccuracy.includes('not enough')}
                    <div class="flex items-start gap-4 p-4 bg-white/70 rounded-lg border border-resin-amber/20">
                        <span class="text-2xl flex-shrink-0">📊</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Adjust estimates</p>
                            <p class="text-sm text-resin-earth/60">{insights.estimationTrend.toLowerCase()}</p>
                        </div>
                    </div>
                {/if}

                <div class="flex items-start gap-4 p-4 bg-white/70 rounded-lg border border-resin-forest/20">
                    <span class="text-2xl flex-shrink-0">🔥</span>
                    <div>
                        <p class="font-semibold text-resin-charcoal">Maintain momentum</p>
                        <p class="text-sm text-resin-earth/60">2 flex days per month protect your streak</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- CTA to Amber -->
        <div class="mt-12 text-center">
            <button
                onclick={() => goto('/amber')}
                class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-resin-forest to-resin-charcoal text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
                <span>View Your Plans</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    </div>
</main>

<style>
    :global(body) {
        background: linear-gradient(to bottom right, #e6ddd0, #f5f3f0);
    }
</style>
