<script lang="ts">
    let { data } = $props();
    const profile = data.profile;
    const insights = data.insights;
</script>

<main class="min-h-screen bg-gradient-to-br from-resin-petrified via-resin-bg to-resin-bg p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-4xl md:text-5xl font-bold text-resin-charcoal mb-2">Your Execution Insights</h1>
            <p class="text-resin-earth/60 text-lg">
                See how your planning accuracy has evolved over time
            </p>
        </div>

        <!-- Grid of Insights Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <!-- Total Completed -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/10">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Plans Completed</p>
                        <p class="text-5xl font-bold text-resin-charcoal mt-2">{insights.totalCompleted}</p>
                    </div>
                    <div class="text-3xl">✅</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    {#if insights.totalCompleted === 0}
                        Start completing plans to see insights
                    {:else if insights.totalCompleted === 1}
                        Great start! Complete more plans for patterns
                    {:else}
                        Keep it up! You're building momentum
                    {/if}
                </p>
            </div>

            <!-- Estimate Accuracy -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-amber/20">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Estimate Accuracy</p>
                        <p class="text-3xl font-bold text-resin-amber mt-2">{insights.estimateAccuracy}</p>
                    </div>
                    <div class="text-3xl">🎯</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    {#if insights.estimateAccuracy.includes('not enough')}
                        Complete tasks to track accuracy
                    {:else if insights.estimateAccuracy.includes('spot on')}
                        Your estimates are very accurate!
                    {:else}
                        Adjust estimates based on this data
                    {/if}
                </p>
            </div>

            <!-- Completion Streak -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forestGreen/20">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Active Streak</p>
                        <p class="text-5xl font-bold text-resin-forestGreen mt-2">
                            {insights.completionStreak}
                        </p>
                    </div>
                    <div class="text-3xl">🔥</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    {#if insights.completionStreak === 0}
                        Complete a plan today to start your streak
                    {:else}
                        Day{insights.completionStreak !== 1 ? 's' : ''} of consistency
                    {/if}
                </p>
            </div>

            <!-- Peak Productivity Time -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/10">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Most Productive</p>
                        <p class="text-5xl font-bold text-resin-charcoal mt-2">
                            {#if insights.mostActiveHour !== null}
                                {insights.mostActiveHour}:00
                            {:else}
                                —
                            {/if}
                        </p>
                    </div>
                    <div class="text-3xl">⏰</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    {#if insights.mostActiveHour !== null}
                        Schedule important tasks around this time
                    {:else}
                        Complete plans to discover your peak time
                    {/if}
                </p>
            </div>

            <!-- Average Completion Time -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/10">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Avg Time Spent</p>
                        <p class="text-5xl font-bold text-resin-charcoal mt-2">{insights.averageCompletionTime}m</p>
                    </div>
                    <div class="text-3xl">⏳</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    {#if insights.averageCompletionTime === 0}
                        Complete tasks to calculate
                    {:else}
                        Use this for future estimates
                    {/if}
                </p>
            </div>

            <!-- Estimation Trend -->
            <div class="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/10">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-resin-earth/60 text-sm font-semibold uppercase tracking-wider">Trend</p>
                        <p class="text-2xl font-bold text-resin-charcoal mt-2 line-clamp-2">{insights.estimationTrend}</p>
                    </div>
                    <div class="text-3xl">📈</div>
                </div>
                <p class="text-resin-earth/50 text-sm">
                    Your recent patterns are informing future estimates
                </p>
            </div>
        </div>

        <!-- Recommendations Section -->
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-lg border border-resin-forest/10">
            <h2 class="text-2xl font-bold text-resin-charcoal mb-6">Recommendations</h2>
            <div class="space-y-4">
                {#if insights.totalCompleted === 0}
                    <div class="flex items-start gap-4 p-4 bg-resin-amber/5 rounded-lg">
                        <span class="text-2xl">💡</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Complete your first plan</p>
                            <p class="text-resin-earth/60 text-sm">Once you complete 3+ plans, you'll unlock pattern analysis and personalized recommendations.</p>
                        </div>
                    </div>
                {:else if insights.totalCompleted < 3}
                    <div class="flex items-start gap-4 p-4 bg-resin-amber/5 rounded-lg">
                        <span class="text-2xl">💡</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Complete {3 - insights.totalCompleted} more plan{3 - insights.totalCompleted === 1 ? '' : 's'}</p>
                            <p class="text-resin-earth/60 text-sm">Insights get more accurate as you complete more tasks. Keep going!</p>
                        </div>
                    </div>
                {/if}

                {#if insights.mostActiveHour !== null}
                    <div class="flex items-start gap-4 p-4 bg-resin-forestGreen/5 rounded-lg">
                        <span class="text-2xl">🎯</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Prioritize {insights.mostActiveHour}:00 slots</p>
                            <p class="text-resin-earth/60 text-sm">You complete most plans during this hour. Schedule important tasks when you're most productive.</p>
                        </div>
                    </div>
                {/if}

                {#if insights.estimationTrend && !insights.estimationTrend.includes('not enough')}
                    <div class="flex items-start gap-4 p-4 bg-resin-amber/5 rounded-lg">
                        <span class="text-2xl">📊</span>
                        <div>
                            <p class="font-semibold text-resin-charcoal">Adjust your estimates</p>
                            <p class="text-resin-earth/60 text-sm">{insights.estimationTrend}. Update your default estimate to better reflect reality.</p>
                        </div>
                    </div>
                {/if}

                <div class="flex items-start gap-4 p-4 bg-resin-forestGreen/5 rounded-lg">
                    <span class="text-2xl">✨</span>
                    <div>
                        <p class="font-semibold text-resin-charcoal">Build on your streak</p>
                        <p class="text-resin-earth/60 text-sm">Remember, you have 2 flex days per month without losing your streak. Use them wisely.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>

<style>
    :global(body) {
        background: linear-gradient(to bottom right, #e6ddd0, #f5f3f0);
    }
</style>
