<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly, scale } from "svelte/transition";
    import { createSupabaseClient } from "$lib/supabase";
    import { rewardTriggered } from "$lib/rewardStore";
    import UnifiedForestRenderer from "$lib/components/UnifiedForestRenderer.svelte";
    import SimpleTree from "$lib/components/SimpleTree.svelte";
    import BonusBreakdown from "$lib/components/BonusBreakdown.svelte";
    import AchievementBadge from "$lib/components/AchievementBadge.svelte";
    import { ACHIEVEMENT_DEFINITIONS } from "$lib/achievementDefinitions";
    import { TREE_SPECIES, getTreeSpecies, getUnlockedSpecies, getSFSymbolEmoji } from "$lib/treeSpecies";
    import { Gem, Flame, Zap, Trophy, Crown, Diamond, Leaf, Trees, Sparkles, Sun, Star, Sprout } from "lucide-svelte";

    // Map achievement icon names to lucide components
    const iconComponents: Record<string, any> = {
        'gem': Gem,
        'flame': Flame,
        'zap': Zap,
        'trophy': Trophy,
        'crown': Crown,
        'diamond': Diamond,
        'leaf': Leaf,
        'tree': Trees,
        'sparkles': Sparkles,
        'sun': Sun,
        'star': Star,
        'sprout': Sprout,
    };

    let { data } = $props();
    let { sessions, statusCounts, minutesByDay, totalFocusMinutes, longestSession, userAchievements = [], newlyNotifiedAchievements = [] } = $derived(data);

    // Real-time profile updates from subscriptions
    let realtimeProfile = $state(data.profile);
    let profileData = $derived(realtimeProfile || data.profile);

    let recentReward = $state<{ text: string; icon: string; timestamp: number } | null>(null);
    let showForestGlow = $state(false);
    let newAchievementToast = $state<string | null>(null);

    // Trigger forest glow when reward appears
    $effect(() => {
        if (recentReward) {
            showForestGlow = true;
            setTimeout(() => {
                showForestGlow = false;
            }, 4000);
        }
    });

    onMount(() => {
        // Load most recent reward from localStorage
        const stored = localStorage.getItem('recentReward');
        if (stored) {
            try {
                const reward = JSON.parse(stored);
                // Only show if less than 5 minutes old
                if (Date.now() - reward.timestamp < 300000) {
                    recentReward = reward;
                }
            } catch (e) {
                // ignore
            }
        }

        // Show achievement toast for first newly notified achievement
        if (newlyNotifiedAchievements && newlyNotifiedAchievements.length > 0) {
            newAchievementToast = newlyNotifiedAchievements[0];
            setTimeout(() => {
                newAchievementToast = null;
            }, 5000);
        }

        // Subscribe to real-time profile updates (for iOS sync)
        const supabase = createSupabaseClient();
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        // Fallback: periodically refresh profile for stones/streak sync (every 30 seconds)
        const setupPolling = () => {
            pollInterval = setInterval(async () => {
                if (supabase && profileData?.id) {
                    try {
                        const { data } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', profileData.id)
                            .single();

                        if (data) {
                            // Update entire profile for consistency
                            realtimeProfile = data;
                        }
                    } catch (err) {
                        // Silent error, polling is a fallback
                    }
                }
            }, 30000); // Poll every 30 seconds
        };

        if (supabase && profileData?.id) {
            const subscription = supabase
                .channel(`profiles:${profileData.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${profileData.id}`
                    },
                    (payload) => {
                        // Update profile data when iOS syncs
                        if (payload.new) {
                            realtimeProfile = payload.new;
                        }
                    }
                )
                .subscribe();

            // Set up polling as fallback
            setupPolling();

            return () => {
                supabase.removeChannel(subscription);
                if (pollInterval) clearInterval(pollInterval);
            };
        }
    });

    // DB-backed achievements merged with definitions
    const achievementBadges = $derived(
        ACHIEVEMENT_DEFINITIONS.map((def) => ({
            ...def,
            unlockedAt: userAchievements.find((a: any) => a.achievement_id === def.id)?.unlocked_at ?? null
        }))
    );

    // Milestone progress for stones
    const stoneMilestones = [50, 100, 250, 500, 1000, 2500, 5000];
    const nextStoneMilestone = $derived(stoneMilestones.find((m) => m > totalStones) ?? totalStones + 50);
    const prevStoneMilestone = $derived([...stoneMilestones].reverse().find((m) => m <= totalStones) ?? 0);
    const stoneProgress = $derived(
        (totalStones - prevStoneMilestone) / (nextStoneMilestone - prevStoneMilestone)
    );

    // Milestone progress for streak
    const streakMilestones = [5, 10, 15, 20, 25, 30, 50, 75, 100];
    const nextStreakMilestone = $derived(streakMilestones.find((m) => m > currentStreak) ?? currentStreak + 5);
    const prevStreakMilestone = $derived([...streakMilestones].reverse().find((m) => m <= currentStreak) ?? 0);
    const streakProgress = $derived(
        (currentStreak - prevStreakMilestone) / (nextStreakMilestone - prevStreakMilestone)
    );

    const totalStones = $derived(profileData?.total_stones || 0);
    const currentStreak = $derived(profileData?.current_streak || 0);
    const longestStreak = $derived(profileData?.longest_streak || 0);
    const longestStreakAt = $derived(profileData?.longest_streak_at || null);
    const forestHealth = $derived(profileData?.forest_health ?? 100);
    const unlockedSpecies = $derived(getUnlockedSpecies(totalStones));

    // Get forest health status
    function getForestStatus() {
        if (forestHealth >= 80) {
            return { level: 'thriving', message: '🌳 Your forest is thriving!', color: '#22c55e' };
        } else if (forestHealth >= 60) {
            return { level: 'healthy', message: '🌲 Your forest is healthy', color: '#84cc16' };
        } else if (forestHealth >= 30) {
            return { level: 'struggling', message: '⚠️ Your forest is struggling', color: '#f97316' };
        } else {
            return { level: 'dying', message: '🪨 Your forest is turning to stone!', color: '#ef4444' };
        }
    }
    const forestStatus = $derived(getForestStatus());

    // Time period filtering
    let selectedPeriod = $state<"day" | "week" | "month" | "year">("week");

    const filteredSessions = $derived.by(() => {
        const cutoff = { day: 1, week: 7, month: 30, year: 365 }[selectedPeriod];
        const msAgo = Date.now() - cutoff * 86400000;
        return sessions.filter((s: any) => new Date(s.created_at).getTime() >= msAgo);
    });

    const gridSessions = $derived(filteredSessions.slice(0, 16));
    const overflow = $derived(Math.max(0, filteredSessions.length - 16));

    // Helper: get species based on session duration (unified with iOS)
    function getSpeciesForSession(session: any): any {
        if (!session) return null;
        const mins = session.focusMinutes;
        let speciesId: string;
        if (mins >= 120) speciesId = "cherry"; // majestic
        else if (mins >= 60) speciesId = "oak"; // large
        else if (mins >= 20) speciesId = "amber"; // standard
        else speciesId = "sprout"; // shrub

        return getTreeSpecies(speciesId) || TREE_SPECIES[0];
    }

    // Format minutes to hours/mins
    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remaining = mins % 60;
        return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    };

    const formatDateShort = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
</script>

<svelte:head>
    <title>Petrified Forest | Resin</title>
</svelte:head>

<main
    class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-6xl mx-auto"
>
    <!-- Header Section -->
    <div class="mb-12">
        <h1
            class="text-3xl font-serif font-bold text-resin-charcoal"
        >
            The Petrified Forest
        </h1>
        <p class="text-resin-earth/60 font-medium mt-2">
            Every plan you complete adds to your permanent digital sanctuary.
        </p>
    </div>

    <!-- Recent Reward Display -->
    {#if recentReward}
        <div
            class="mb-12 w-full max-w-2xl"
                in:scale={{ duration: 300 }}
                out:fly={{ y: -20, duration: 200 }}
            >
                <div class="relative overflow-hidden">
                    <!-- Shimmer effect background -->
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>

                    <div class="glass-card rounded-2xl p-6 bg-gradient-to-r from-resin-amber/15 via-white/40 to-resin-amber/10 border border-resin-amber/40 flex items-center justify-between group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-resin-amber/20">
                        <div class="flex items-center gap-6 relative z-10">
                            <div class="text-6xl animate-bounce drop-shadow-lg">{recentReward.icon}</div>
                            <div>
                                <p class="text-base font-bold text-resin-charcoal flex items-center gap-2">
                                    🎉 {recentReward.text}
                                </p>
                                <p class="text-xs text-resin-forest font-semibold mt-1">
                                    ✨ Just earned! Watch your forest grow →
                                </p>
                            </div>
                        </div>
                        <button
                            onclick={() => (recentReward = null)}
                            class="text-resin-earth/40 hover:text-resin-earth/60 transition-colors flex-shrink-0 relative z-10"
                            title="Dismiss reward notification"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
    {/if}

    <!-- Bonus Breakdown Card (from new reward store) -->
    {#if $rewardTriggered?.bonusBreakdown && $rewardTriggered.bonusBreakdown.length > 0}
        <BonusBreakdown
            baseStones={$rewardTriggered.baseStones}
            bonusBreakdown={$rewardTriggered.bonusBreakdown}
            forestHealthGain={$rewardTriggered.forestHealthGain}
            newAchievements={$rewardTriggered.newAchievements}
            visible={true}
        />
    {/if}

    <!-- Your Forest Section (MOVED UP) -->
    <div class="w-full mb-24">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
                <span
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40"
                    >Your Forest</span
                >
                <span
                    class="text-xs font-medium text-resin-forest/60"
                    >{Math.min(filteredSessions.length, 16)} / 16 plots</span
                >
            </div>

            <!-- Forest Health Status -->
            <div class="glass-card rounded-xl p-6 border border-resin-forest/10 mb-4">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-semibold text-resin-charcoal">{forestStatus.message}</span>
                    <span class="text-xs font-bold text-resin-earth/60">{forestHealth}%</span>
                </div>
                <div class="w-full h-2 bg-resin-earth/10 rounded-full overflow-hidden">
                        <div
                            class="h-full transition-all duration-500 rounded-full"
                            style="width: {forestHealth}%; background-color: {forestStatus.color};"
                        ></div>
                </div>
                <p class="text-xs text-resin-earth/60 mt-2">
                    {#if forestHealth >= 80}
                        Keep completing sessions to maintain your thriving forest.
                    {:else if forestHealth >= 60}
                        Complete more sessions to restore your forest's health.
                    {:else if forestHealth >= 30}
                        Your forest needs attention! Focus sessions will help it recover.
                    {:else}
                        Complete a focus session now to save your forest from petrification!
                    {/if}
                </p>
            </div>

            <!-- 4x4 Grid with Unified Trees -->
            <div
                class="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden mb-4 bg-white/40 p-3"
            >
                {#each Array(16) as _, i}
                    {@const session = gridSessions[i]}
                    {@const species = session ? getSpeciesForSession(session) : null}
                    <div
                        class="flex items-center justify-center aspect-square relative group cursor-pointer transition-all hover:scale-110 rounded-lg bg-white/20 p-1"
                        class:opacity-40={!session &&
                            i === 0 &&
                            filteredSessions.length === 0}
                    >
                        {#if session && species}
                            <div class="flex flex-col items-center gap-1 text-center w-full h-full flex-center">
                                <SimpleTree species={species} size="md" health={forestHealth} />
                            </div>
                            <!-- Tooltip -->
                            <div
                                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-resin-charcoal text-white text-[10px] rounded-lg py-1.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl"
                            >
                                {session.display_title || session.title || "Session"}
                                •
                                {session.focusMinutes}m
                            </div>
                        {:else}
                            <span class="text-resin-earth/10 text-2xl">○</span>
                        {/if}
                    </div>
                {/each}
            </div>

            {#if overflow > 0}
                <p class="text-center text-xs text-resin-earth/40 font-medium">
                    +{overflow} more this period
                </p>
            {/if}
        </div>

        <!-- Stats + Daily Challenges (Side by Side) -->
        <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-8 mb-24">
            <!-- Left: Compact Stats -->
            <div class="lg:col-span-2 space-y-4">
                <div class="glass-card rounded-2xl p-4 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-resin-amber/10 flex items-center justify-center text-resin-amber flex-shrink-0">
                        <Gem size={20} />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-resin-charcoal">{totalStones}</p>
                        <p class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold">Stones</p>
                    </div>
                </div>

                <div class="glass-card rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-resin-forest/8 via-white/60 to-transparent">
                    <div class="w-10 h-10 rounded-xl bg-resin-forest/20 flex items-center justify-center text-resin-forest flex-shrink-0 font-bold text-lg">
                        🔥
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-resin-forest">{currentStreak}</p>
                        <p class="text-xs uppercase tracking-widest text-resin-forest font-bold">Streak</p>
                    </div>
                </div>

                <div class="glass-card rounded-2xl p-4 flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-resin-forest/10 flex items-center justify-center text-resin-forest flex-shrink-0">
                        <Zap size={20} />
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-resin-charcoal">{formatDuration(totalFocusMinutes)}</p>
                        <p class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold">Total Focus</p>
                    </div>
                </div>
            </div>

            <!-- Right: Daily Challenges -->
            <div class="lg:col-span-3">
                <div class="space-y-6">
                    <div>
                        <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-2">Daily Challenges</h2>
                        <p class="text-sm text-resin-earth/60">Daily milestones and streak bonuses</p>
                    </div>

                    <!-- Daily Streaks & Milestones -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Current Streak Progress -->
                        <div class="glass-card rounded-2xl p-4 border border-resin-amber/20 bg-gradient-to-br from-resin-amber/5 to-transparent">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-sm text-resin-charcoal flex items-center gap-2">
                                    <Flame size={16} class="text-resin-amber" /> Streak
                                </h3>
                                <span class="text-xl font-bold text-resin-amber">{currentStreak}</span>
                            </div>
                            <div class="space-y-2">
                                <div class="w-full h-1.5 bg-resin-earth/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-resin-amber to-orange-400 rounded-full" style="width: {Math.min(currentStreak / 7, 1) * 100}%;"></div>
                                </div>
                                <p class="text-xs text-resin-earth/60">
                                    {#if currentStreak === 0}
                                        Start today!
                                    {:else if currentStreak < 7}
                                        {7 - currentStreak}d to weekly
                                    {:else if currentStreak < 30}
                                        {30 - currentStreak}d to monthly
                                    {:else}
                                        Champion! 🏆
                                    {/if}
                                </p>
                            </div>
                        </div>

                        <!-- Next Milestone -->
                        <div class="glass-card rounded-2xl p-4 border border-resin-forest/20">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-bold text-sm text-resin-charcoal flex items-center gap-2">
                                    <Trophy size={16} class="text-resin-amber" /> Next
                                </h3>
                            </div>
                            <div class="space-y-2">
                                {#if currentStreak < 7}
                                    <p class="text-xs font-semibold text-resin-charcoal">7-Day Streak</p>
                                    <p class="text-xl font-bold text-resin-amber">{7 - currentStreak}d</p>
                                {:else if currentStreak < 30}
                                    <p class="text-xs font-semibold text-resin-charcoal">30-Day Streak</p>
                                    <p class="text-xl font-bold text-resin-amber">{30 - currentStreak}d</p>
                                {:else}
                                    <p class="text-xs font-semibold text-resin-charcoal">100-Day Legend</p>
                                    <p class="text-xl font-bold text-resin-amber">{100 - Math.min(currentStreak, 99)}d</p>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- Today's Bonus -->
                    <div class="glass-card rounded-2xl p-4 border border-resin-forest/20 bg-gradient-to-br from-resin-forest/5 to-transparent">
                        <h3 class="font-bold text-sm text-resin-charcoal flex items-center gap-2 mb-3">
                            <Sparkles size={16} class="text-resin-amber" /> Today's Bonus
                        </h3>
                        <div class="space-y-2 text-xs">
                            <p class="text-resin-earth/70">First session: <span class="font-bold text-resin-amber">+1 Stone +2 Health</span></p>
                            <p class="text-resin-earth/70">Every 3 sessions: <span class="font-bold text-resin-forest">+1 Stone +3 Health</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Collection Showcase -->

        <!-- How Stones Work -->
        <div class="w-full max-w-4xl mb-24">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal mb-8">
                How Stones Are Earned
            </h2>
            <div class="glass-card rounded-2xl p-6 space-y-4 border border-white/10">
                <div class="flex items-start gap-3">
                    <span class="text-xl">✓</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Complete an Activated plan</p>
                        <p class="text-xs text-resin-amber font-bold">+5 stones</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <span class="text-xl">📸</span>
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Pass a photo verification</p>
                        <p class="text-xs text-resin-amber font-bold">+3 stones</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <Flame size={24} class="text-xl text-resin-amber" />
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Maintain a daily streak</p>
                        <p class="text-xs text-resin-amber font-bold">+1 stone/day</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <Trees size={24} class="text-xl text-resin-forest" />
                    <div>
                        <p class="text-sm font-bold text-resin-charcoal">Each session plants a tree in your grove</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Time Period Selector -->
        <div class="flex gap-1 p-1 bg-white/40 rounded-xl w-fit mx-auto mb-8">
            {#each ["day", "week", "month", "year"] as period}
                <button
                    class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all {selectedPeriod === period
                        ? "bg-resin-forest text-white"
                        : "text-resin-earth/60 hover:text-resin-earth"}"
                    onclick={() => (selectedPeriod = period as any)}
                >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
            {/each}
        </div>

        <!-- Analytics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
            <!-- Focus Trends -->
            <div class="glass-card rounded-2xl p-6">
                <h3
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40 mb-4"
                >
                    Focus by Day of Week
                </h3>
                <div class="flex items-end gap-1 h-20">
                    {#each ["M", "T", "W", "T", "F", "S", "S"] as day, i}
                        {@const maxMin = Math.max(...minutesByDay, 1)}
                        {@const h = (minutesByDay[i] / maxMin) * 100}
                        <div class="flex-1 flex flex-col items-center gap-1">
                            <div
                                class="w-full rounded-sm bg-resin-forest/20 transition-all duration-700"
                                style="height: {h}%; min-height: 4px; background-color: {h >
                                60
                                    ? "#2B4634"
                                    : "#2B463460"};"
                            ></div>
                            <span class="text-[8px] text-resin-earth/40 font-bold"
                                >{day}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Session Breakdown -->
            <div class="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <h3
                    class="text-xs font-bold uppercase tracking-widest text-resin-earth/40 mb-4"
                >
                    Session Breakdown
                </h3>
                <div class="space-y-2">
                    {#each [
                        { key: "completed", label: "Completed", color: "bg-resin-forest" },
                        { key: "scheduled", label: "Active", color: "bg-resin-amber" },
                        { key: "draft", label: "Draft", color: "bg-resin-earth/30" },
                        { key: "canceled", label: "Canceled", color: "bg-red-300/60" },
                    ] as stat}
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full {stat.color}"></div>
                            <span class="text-xs text-resin-earth/60 flex-1"
                                >{stat.label}</span
                            >
                            <span class="text-xs font-bold text-resin-charcoal"
                                >{statusCounts[stat.key as keyof typeof statusCounts] || 0}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Collection Showcase -->
        <div class="w-full max-w-4xl space-y-10">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal">
                Unlocked Collection
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                {#each TREE_SPECIES as species}
                    {@const unlocked = totalStones >= species.unlockCost}
                    <div
                        class="glass-card rounded-2xl p-6 flex flex-col items-center text-center space-y-3 {unlocked
                            ? 'opacity-100'
                            : 'opacity-40 grayscale'} transition-all duration-500"
                    >
                        <div class="mb-2 w-12 h-12 flex items-center justify-center">
                            {#if unlocked}
                                <SimpleTree species={species} size="md" health={100} />
                            {:else}
                                <div class="text-3xl opacity-50">
                                    {species.icon.includes('tree') ? '🌳' : species.icon.includes('leaf') ? '🍃' : '⭐'}
                                </div>
                            {/if}
                        </div>
                        <div
                            class="text-[10px] uppercase tracking-widest font-bold text-resin-earth/40"
                        >
                            {species.label}
                        </div>
                        {#if !unlocked}
                            <div class="text-[10px] font-bold text-resin-amber">
                                {species.unlockCost} Stones
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Execution Insights Section -->
        <div class="mt-16 pb-8">
            <!-- Section Header -->
            <div class="mb-8 flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-serif font-bold text-resin-charcoal flex items-center gap-3">
                        <span>📊</span>
                        Your Execution Insights
                    </h2>
                    <p class="text-sm text-resin-earth/60 mt-1">Real-time analytics on how you spend your focus time</p>
                </div>
            </div>

            <!-- Primary Metrics Grid (3 columns) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <!-- Total Plans -->
                <div class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 hover:border-resin-forest/10 transition-colors">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest">Total Plans</p>
                            <p class="text-4xl font-bold text-resin-charcoal mt-3">{data.insights.totalCompleted}</p>
                            <p class="text-xs text-resin-earth/50 mt-2">Completed sessions</p>
                        </div>
                        <div class="text-3xl">✅</div>
                    </div>
                </div>

                <!-- Estimate Accuracy -->
                <div class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 hover:border-resin-forest/10 transition-colors">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest">Estimate Accuracy</p>
                            <p class="text-2xl font-bold text-resin-amber mt-3">
                                {#if data.insights.estimateAccuracy && data.insights.estimateAccuracy.includes('spot on')}
                                    ✓ Spot On
                                {:else if data.insights.estimateAccuracy && data.insights.estimateAccuracy.includes('longer')}
                                    +10-20%
                                {:else if data.insights.estimateAccuracy && data.insights.estimateAccuracy.includes('faster')}
                                    -10-20%
                                {:else}
                                    —
                                {/if}
                            </p>
                            <p class="text-xs text-resin-earth/50 mt-2">vs actual time</p>
                        </div>
                        <div class="text-3xl">🎯</div>
                    </div>
                </div>

                <!-- Peak Hour -->
                <div class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 hover:border-resin-forest/10 transition-colors">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest">Peak Hour</p>
                            <p class="text-4xl font-bold text-resin-charcoal mt-3">
                                {#if data.insights.mostActiveHour !== null}
                                    {String(data.insights.mostActiveHour).padStart(2, '0')}:00
                                {:else}
                                    —
                                {/if}
                            </p>
                            <p class="text-xs text-resin-earth/50 mt-2">Most productive</p>
                        </div>
                        <div class="text-3xl">⏰</div>
                    </div>
                </div>
            </div>

            <!-- Secondary Metrics Grid (2 columns) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Average Completion Time -->
                <div class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 hover:border-resin-forest/10 transition-colors">
                    <p class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest">Avg Time Per Task</p>
                    <p class="text-3xl font-bold text-resin-charcoal mt-3">
                        {#if data.insights.averageCompletionTime > 0}
                            {data.insights.averageCompletionTime}m
                        {:else}
                            —
                        {/if}
                    </p>
                    <p class="text-xs text-resin-earth/50 mt-2">Across all sessions</p>
                </div>

                <!-- Recent Trend -->
                <div class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 hover:border-resin-forest/10 transition-colors">
                    <p class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest">Recent Trend</p>
                    <p class="text-sm font-semibold text-resin-charcoal mt-3 leading-relaxed">
                        {#if data.insights.estimationTrend && !data.insights.estimationTrend.includes('Not enough')}
                            {data.insights.estimationTrend}
                        {:else}
                            <span class="text-resin-earth/50">Not enough completed sessions yet</span>
                        {/if}
                    </p>
                    <p class="text-xs text-resin-earth/50 mt-2">Last 5 sessions</p>
                </div>
            </div>
        </div>

        <!-- Achievements & Milestones Section -->
        <div class="w-full max-w-6xl mt-24 mb-24">
            <div class="space-y-8">
                <div class="text-center space-y-2">
                    <h2 class="text-4xl font-serif font-bold text-resin-charcoal">Achievements</h2>
                    <p class="text-resin-earth/60">
                        {achievementBadges.filter((a) => a.unlockedAt).length} / {achievementBadges.length} unlocked
                    </p>
                </div>

                <!-- Achievements Grid -->
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {#each achievementBadges as badge (badge.id)}
                        <AchievementBadge
                            achievementId={badge.id}
                            name={badge.name}
                            description={badge.description}
                            icon={badge.icon}
                            unlockedAt={badge.unlockedAt}
                            isNew={newlyNotifiedAchievements?.includes(badge.id) ?? false}
                        />
                    {/each}
                </div>

                <!-- Tree Collection -->
                <div class="space-y-4 mt-12">
                    <div class="text-center">
                        <h3 class="text-2xl font-serif font-bold text-resin-charcoal mb-2">Tree Species Unlocked</h3>
                        <p class="text-resin-earth/60">{unlockedSpecies.length} / {TREE_SPECIES.length} collected</p>
                    </div>

                    <!-- Rarity Breakdown -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {#each ['common', 'uncommon', 'rare', 'epic', 'legendary'] as rarity}
                            {@const count = unlockedSpecies.filter((s: any) => s.rarity === rarity).length}
                            {@const total = TREE_SPECIES.filter((s: any) => s.rarity === rarity).length}
                            {@const rarityColors = {
                                common: '#6B7280',
                                uncommon: '#10B981',
                                rare: '#3B82F6',
                                epic: '#8B5CF6',
                                legendary: '#F59E0B'
                            }}
                            <div class="glass-card rounded-xl p-4 text-center border" style="border-color: {rarityColors[rarity as keyof typeof rarityColors]}40;">
                                <div class="text-2xl mb-2" style="filter: saturate({count > 0 ? 1 : 0.3});">
                                    {rarity === 'common' ? '🌱' : rarity === 'uncommon' ? '🌿' : rarity === 'rare' ? '🌳' : rarity === 'epic' ? '✨' : '👑'}
                                </div>
                                <p class="font-bold text-sm capitalize text-resin-charcoal">{rarity}</p>
                                <p class="text-lg font-bold" style="color: {rarityColors[rarity as keyof typeof rarityColors]};">{count}/{total}</p>
                            </div>
                        {/each}
                    </div>

                    <!-- Unlocked Trees Grid -->
                    {#if unlockedSpecies.length > 0}
                        <div class="mt-8">
                            <h4 class="font-bold text-resin-charcoal mb-4">Your Collection</h4>
                            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {#each unlockedSpecies as species (species.id)}
                                    <div class="text-center group cursor-pointer">
                                        <div class="text-4xl mb-2 group-hover:scale-125 transition-transform">{getSFSymbolEmoji(species.icon)}</div>
                                        <p class="text-xs font-semibold text-resin-charcoal line-clamp-2">{species.label}</p>
                                        <p class="text-[10px] text-resin-earth/50 mt-1">{species.unlockCost} stones</p>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Taste Profile / Emotional Landscape Section -->
        {#if Object.keys(data.insights.feelingCounts).length > 0}
            <div class="space-y-8 mt-16 pb-8">
                <div class="text-center space-y-2">
                    <h2 class="text-4xl font-serif font-bold text-resin-charcoal">Your Emotional Landscape</h2>
                    <p class="text-resin-earth/60">Feelings and reflections from your completed plans</p>
                </div>

                <!-- Feelings Grid -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {#each Object.entries(data.insights.feelingCounts) as [feeling, count] (feeling)}
                        <div class="bg-gradient-to-br from-resin-petrified/30 to-resin-bg/20 rounded-xl p-6 shadow-lg border border-resin-forest/10">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="text-sm font-semibold text-resin-charcoal capitalize">{feeling}</p>
                                    <p class="text-3xl font-bold text-resin-amber mt-1">{count}</p>
                                </div>
                                <span class="text-2xl opacity-60">💭</span>
                            </div>
                        </div>
                    {/each}
                </div>

                <!-- Enjoyed Things -->
                {#if data.insights.enjoyedThings.length > 0}
                    <div class="bg-white/50 backdrop-blur rounded-2xl p-6 shadow-lg border border-resin-forest/5">
                        <h3 class="font-bold text-resin-charcoal mb-4">Things You Enjoyed</h3>
                        <div class="space-y-2">
                            {#each data.insights.enjoyedThings as item (item.text)}
                                <div class="flex items-start gap-3 p-3 bg-resin-forest/5 rounded-lg">
                                    <span class="text-resin-forest text-lg flex-shrink-0">✨</span>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm text-resin-charcoal">{item.text}</p>
                                        <p class="text-xs text-resin-earth/50 mt-1">{item.date}</p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="space-y-8 mt-16 pb-8">
                <div class="text-center space-y-4">
                    <h2 class="text-3xl font-serif font-bold text-resin-charcoal">Your Emotional Landscape</h2>
                    <p class="text-resin-earth/60">Feelings and reflections from your completed plans</p>
                    <div class="bg-white/50 rounded-xl p-8 border border-dashed border-resin-forest/10 text-center">
                        <p class="text-lg text-resin-charcoal font-medium">No feelings logged yet</p>
                        <p class="text-sm text-resin-earth/60 mt-2">Reflect on a plan to see your landscape grow.</p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Session History -->
        <div class="w-full max-w-4xl space-y-6 mt-20">
            <h2 class="text-lg font-serif font-bold text-resin-charcoal tracking-tight">
                Session History
            </h2>
            <div class="grid gap-4">
                {#each filteredSessions as session, i}
                    <div
                        class="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/20 hover:border-resin-amber/30 transition-all"
                    >
                        <div class="flex items-center gap-4">
                            <div
                                class="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-resin-forest/5 overflow-hidden"
                            >
                                {#if session.status === "scheduled" || session.status === "completed"}
                                    <SimpleTree species={getSpeciesForSession(session)} size="sm" health={forestHealth} />
                                {:else}
                                    <div class="text-2xl">🪨</div>
                                {/if}
                            </div>
                            <div>
                                <h3
                                    class="font-bold text-resin-charcoal text-lg"
                                >
                                    {session.title ||
                                        session.display_title ||
                                        "Focus Session"}
                                </h3>
                                <p
                                    class="text-xs font-bold text-resin-earth/50 uppercase tracking-wider mt-1"
                                >
                                    {new Date(
                                        session.created_at,
                                    ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    {#if session.focusMinutes > 0}
                                        <span class="mx-2 text-resin-forest/30"
                                            >•</span
                                        >
                                        <span class="text-resin-forest"
                                            >{session.focusMinutes}m focused</span
                                        >
                                    {/if}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            {#if session.status === "scheduled"}
                                <span
                                    class="px-3 py-1 bg-resin-amber/10 text-resin-amber text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Active Plan</span
                                >
                            {:else if session.status === "completed"}
                                <span
                                    class="px-3 py-1 bg-resin-forest/10 text-resin-forest text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Completed</span
                                >
                            {:else if session.status === "canceled"}
                                <span
                                    class="px-3 py-1 bg-resin-earth/10 text-resin-earth/60 text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Canceled</span
                                >
                            {:else}
                                <span
                                    class="px-3 py-1 bg-resin-forest/5 text-resin-earth/50 text-[10px] font-bold uppercase tracking-widest rounded-full"
                                    >Draft</span
                                >
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Achievement Toast Notification -->
        {#if newAchievementToast}
            {@const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === newAchievementToast)}
            {#if def}
                <div
                    class="fixed bottom-28 right-4 z-50 glass-card rounded-2xl p-4 flex items-center gap-3 border border-resin-amber/40 shadow-lg shadow-resin-amber/20 max-w-xs"
                    in:fly={{ x: 80, duration: 400 }}
                    out:fly={{ x: 80, duration: 300 }}
                >
                    <div class="w-10 h-10 rounded-xl bg-resin-amber/20 flex items-center justify-center flex-shrink-0">
                        <svelte:component this={iconComponents[def.icon] || Trophy} size={20} class="text-resin-amber" />
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-bold text-resin-amber uppercase tracking-wider">Achievement Unlocked!</p>
                        <p class="text-sm font-semibold text-resin-charcoal">{def.name}</p>
                    </div>
                    <button
                        onclick={() => (newAchievementToast = null)}
                        class="text-resin-earth/40 hover:text-resin-earth/60 transition-colors flex-shrink-0 text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>
            {/if}
        {/if}

        <!-- Info Footer -->
        <div class="mt-40 text-center space-y-6 opacity-40 max-w-lg mx-auto">
            <p class="text-sm font-light italic">
                "Growth is silent, but its presence is felt in the stillness of
                the forest."
            </p>
            <div class="h-px bg-resin-forest/10 w-24 mx-auto"></div>
        </div>
</main>

<style>
    :global(.bg-radial-gradient) {
        background: radial-gradient(
            circle at center,
            var(--color-resin-amber),
            transparent 70%
        );
    }
</style>
