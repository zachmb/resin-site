<script lang="ts">
    import { Flame, Trophy, Zap } from "lucide-svelte";

    let { data } = $props();
    let profile = $derived(data.profile || {});
    let sessions = $derived(data.sessions || []);
    let totalFocusMinutes = $derived(data.totalFocusMinutes || 0);

    const dayStreak = profile.current_streak ?? 0;
    const longestStreak = profile.longest_streak ?? 0;
    const totalStones = profile.total_stones ?? 0;
</script>

<div class="min-h-screen bg-resin-cream p-6">
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-12">
            <h1 class="text-4xl font-bold text-resin-charcoal mb-2">Your Progress</h1>
            <p class="text-resin-earth/60">Track your daily streak and focus achievements</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <!-- Day Streak -->
            <div class="bg-white rounded-lg p-6 shadow-sm border border-resin-earth/10">
                <div class="flex items-center justify-between mb-2">
                    <Flame class="w-5 h-5 text-resin-warm" />
                    <span class="text-2xl font-bold text-resin-charcoal">{dayStreak}</span>
                </div>
                <p class="text-sm text-resin-earth/60">Day Streak</p>
            </div>

            <!-- Longest Streak -->
            <div class="bg-white rounded-lg p-6 shadow-sm border border-resin-earth/10">
                <div class="flex items-center justify-between mb-2">
                    <Trophy class="w-5 h-5 text-amber-500" />
                    <span class="text-2xl font-bold text-resin-charcoal">{longestStreak}</span>
                </div>
                <p class="text-sm text-resin-earth/60">Longest Streak</p>
            </div>

            <!-- Total Stones -->
            <div class="bg-white rounded-lg p-6 shadow-sm border border-resin-earth/10">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-2xl">💎</span>
                    <span class="text-2xl font-bold text-resin-charcoal">{totalStones}</span>
                </div>
                <p class="text-sm text-resin-earth/60">Stones Earned</p>
            </div>

            <!-- Total Focus Time -->
            <div class="bg-white rounded-lg p-6 shadow-sm border border-resin-earth/10">
                <div class="flex items-center justify-between mb-2">
                    <Zap class="w-5 h-5 text-resin-forest" />
                    <span class="text-2xl font-bold text-resin-charcoal">{Math.floor(totalFocusMinutes / 60)}h</span>
                </div>
                <p class="text-sm text-resin-earth/60">Total Focus</p>
            </div>
        </div>

        <!-- Motivational Message -->
        <div class="bg-gradient-to-r from-resin-warm/10 to-resin-forest/10 rounded-lg p-8 border border-resin-earth/20 text-center">
            <h2 class="text-2xl font-bold text-resin-charcoal mb-2">Keep Building Your Streak</h2>
            {#if dayStreak > 0}
                <p class="text-resin-earth/70">You're on a {dayStreak} day streak! Keep up the momentum. 🔥</p>
            {:else}
                <p class="text-resin-earth/70">Start your first streak today by completing a focus session.</p>
            {/if}
        </div>

        <!-- Recent Sessions -->
        {#if sessions.length > 0}
            <div class="mt-12">
                <h2 class="text-xl font-bold text-resin-charcoal mb-6">Recent Sessions</h2>
                <div class="space-y-3">
                    {#each sessions.slice(0, 10) as session}
                        <div class="bg-white rounded-lg p-4 border border-resin-earth/10">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-medium text-resin-charcoal">{session.display_title || 'Untitled Session'}</p>
                                    <p class="text-sm text-resin-earth/60">
                                        {new Date(session.created_at).toLocaleDateString()}
                                        · {Math.round(
                                            (new Date(session.amber_tasks?.[0]?.end_time || session.created_at).getTime() -
                                                new Date(session.amber_tasks?.[0]?.start_time || session.created_at).getTime()) /
                                                60000
                                        )} min
                                    </p>
                                </div>
                                <span class="text-sm font-medium">
                                    {session.status === 'completed' ? '✓' : '○'}
                                </span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Tips Section -->
        <div class="mt-12 bg-resin-forest/5 rounded-lg p-8">
            <h3 class="text-lg font-bold text-resin-charcoal mb-4">Building Your Streak</h3>
            <ul class="space-y-3 text-resin-earth/70">
                <li class="flex gap-3">
                    <span>📝</span>
                    <span>Save notes and brain dumps to earn stones</span>
                </li>
                <li class="flex gap-3">
                    <span>⏰</span>
                    <span>Complete focus sessions consistently to build your streak</span>
                </li>
                <li class="flex gap-3">
                    <span>🎯</span>
                    <span>Each completed session counts toward your daily streak</span>
                </li>
                <li class="flex gap-3">
                    <span>🏆</span>
                    <span>Achieve your longest streak by staying consistent</span>
                </li>
            </ul>
        </div>
    </div>
</div>

<style>
    :global(body) {
        background-color: #f9f8f6;
    }
</style>
