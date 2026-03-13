<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly, scale } from "svelte/transition";
    import { createSupabaseClient } from "$lib/supabase";
    import { triggerReward } from "$lib/rewardStore";
    import ForestRenderer from "$lib/components/ForestRenderer.svelte";

    let { data } = $props();
    let { sessions, statusCounts, minutesByDay, totalFocusMinutes, longestSession } = $derived(data);
    let profileData = $state(data.profile);
    $effect(() => {
        profileData = data.profile;
    });

    let recentReward = $state<{ text: string; icon: string; timestamp: number } | null>(null);
    let showForestGlow = $state(false);

    // Trigger reward and forest glow when reward appears
    $effect(() => {
        if (recentReward) {
            triggerReward();
            showForestGlow = true;
            setTimeout(() => {
                showForestGlow = false;
            }, 4000); // Stop glowing before reward store clears (which is 5 seconds)
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
                            profileData = data;
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
                            profileData = payload.new;
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
    import TreeSVG from '$lib/components/TreeSVG.svelte';
    import {
        TreePine, TreeDeciduous, TreePalm, Leaf, LeafyGreen, Sprout, Flower, Flower2,
        Sun, Star, Flame, Gem, Diamond, Crown, Zap, Wind, Sparkles, Trophy
    } from 'lucide-svelte';

    // Lucide Icon Mapping for achievements and rarity
    const iconComponents: Record<string, any> = {
        sprout: Sprout,
        leaf: Leaf,
        tree: TreePine,
        star: Star,
        crown: Crown,
        flame: Flame,
        gem: Gem,
        zap: Zap,
        wind: Wind,
        sun: Sun,
        sparkles: Sparkles,
        trophy: Trophy,
        flower: Flower,
        flower2: Flower2,
        diamond: Diamond,
        infinity: Diamond // Placeholder for infinity, use diamond for now
    };

    // Tree Species Logic (Synced with iOS App)
    const treeSpecies = [
        // Common (0-20)
        { id: "amber", name: "Amber Seedling", icon: "sprout", unlockCost: 0, rarity: "common", description: "Your first step" },
        { id: "sprout", name: "Forest Sprout", icon: "leaf", unlockCost: 0, rarity: "common", description: "The beginning of growth" },
        { id: "pine", name: "Pine Tree", icon: "tree", unlockCost: 5, rarity: "common", description: "Steady and strong" },
        { id: "oak", name: "Oak", icon: "tree", unlockCost: 10, rarity: "common", description: "Ancient wisdom" },

        // Uncommon (20-50)
        { id: "cherry", name: "Cherry Blossom", icon: "flower", unlockCost: 20, rarity: "uncommon", description: "Delicate beauty" },
        { id: "maple", name: "Maple Tree", icon: "leaf", unlockCost: 25, rarity: "uncommon", description: "Seasonal splendor" },
        { id: "birch", name: "Silver Birch", icon: "tree", unlockCost: 30, rarity: "uncommon", description: "Elegant whiteness" },
        { id: "willow", name: "Weeping Willow", icon: "wind", unlockCost: 35, rarity: "uncommon", description: "Graceful branches" },
        { id: "jasmine", name: "Jasmine Vine", icon: "flower2", unlockCost: 40, rarity: "uncommon", description: "Sweet fragrance" },
        { id: "lavender", name: "Lavender Field", icon: "sparkles", unlockCost: 45, rarity: "uncommon", description: "Calming presence" },

        // Rare (50-100)
        { id: "redwood", name: "Redwood Giant", icon: "tree", unlockCost: 50, rarity: "rare", description: "Touch the sky" },
        { id: "bamboo", name: "Bamboo Petrified Forest", icon: "leaf", unlockCost: 60, rarity: "rare", description: "Resilient growth" },
        { id: "palm", name: "Palm Tree", icon: "sun", unlockCost: 70, rarity: "rare", description: "Paradise found" },
        { id: "baobab", name: "Baobab", icon: "tree", unlockCost: 80, rarity: "rare", description: "Ancestral strength" },
        { id: "sunflower", name: "Sunflower Field", icon: "flower", unlockCost: 90, rarity: "rare", description: "Face the sun" },
        { id: "iris", name: "Iris Garden", icon: "leaf", unlockCost: 100, rarity: "rare", description: "Royal elegance" },

        // Epic (100-200)
        { id: "sakura", name: "Sakura Grove", icon: "flower", unlockCost: 110, rarity: "epic", description: "Transient perfection" },
        { id: "cypress", name: "Cypress Forest", icon: "tree", unlockCost: 130, rarity: "epic", description: "Mediterranean soul" },
        { id: "moonlight", name: "Moonlit Glade", icon: "sparkles", unlockCost: 150, rarity: "epic", description: "Night's poetry" },
        { id: "starry", name: "Starry Night", icon: "star", unlockCost: 170, rarity: "epic", description: "Cosmic wonder" },
        { id: "aurora", name: "Aurora Borealis", icon: "sparkles", unlockCost: 180, rarity: "epic", description: "Sky dances" },

        // Legendary (200+)
        { id: "ancient", name: "Ancient Grove", icon: "crown", unlockCost: 200, rarity: "legendary", description: "Timeless magic" },
        { id: "crystalline", name: "Crystalline Forest", icon: "gem", unlockCost: 250, rarity: "legendary", description: "Eternal brilliance" },
        { id: "phoenix", name: "Phoenix Tree", icon: "flame", unlockCost: 300, rarity: "legendary", description: "Rising reborn" },
        { id: "eternal", name: "Eternal Garden", icon: "infinity", unlockCost: 350, rarity: "legendary", description: "Infinity flourishing" },
    ];

    // Achievement definitions
    const achievements = [
        { id: "first_session", name: "First Steps", icon: "sprout", condition: (s: number) => s >= 1, description: "Complete your first session" },
        { id: "week_streak", name: "Weekly Ritual", icon: "flame", condition: (s: number) => s >= 7, description: "7-day streak" },
        { id: "month_streak", name: "Monthly Dedication", icon: "trophy", condition: (s: number) => s >= 30, description: "30-day streak" },
        { id: "century", name: "Century", icon: "crown", condition: (s: number) => s >= 100, description: "100 total sessions" },
        { id: "focused_hour", name: "Hour of Power", icon: "zap", condition: () => longestSession >= 60, description: "60+ minute session" },
        { id: "collector", name: "Stone Collector", icon: "gem", condition: (s: number, st: number) => st >= 50, description: "50+ stones earned" },
        { id: "gardener", name: "Gardener", icon: "leaf", condition: (s: number) => s >= 20, description: "20 different trees" },
        { id: "forest_keeper", name: "Forest Keeper", icon: "tree", condition: () => forestHealth >= 80, description: "Maintain 80% forest health" },
        { id: "night_owl", name: "Night Owl", icon: "wind", condition: () => true, description: "Late night sessions" },
        { id: "early_bird", name: "Early Bird", icon: "sun", condition: () => true, description: "Morning sessions" },
    ];

    const unlockedAchievements = $derived(
        achievements.filter(a => {
            if (a.id === 'gardener') return unlockedSpecies.length >= 20;
            if (a.id === 'forest_keeper') return forestHealth >= 80;
            if (a.id === 'focused_hour') return longestSession >= 60;
            if (a.id === 'collector') return totalStones >= 50;
            return a.condition(currentStreak, totalStones);
        })
    );

    const totalStones = $derived(profileData?.total_stones || 0);
    const currentStreak = $derived(profileData?.current_streak || 0);
    const longestStreak = $derived(profileData?.longest_streak || 0);
    const longestStreakAt = $derived(profileData?.longest_streak_at || null);
    const forestHealth = $derived(profileData?.forest_health ?? 100);
    const unlockedSpecies = $derived(
        treeSpecies.filter((s: any) => s.unlockCost <= totalStones),
    );

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

    // Helper: get icon key based on session duration
    function getSpeciesIcon(session: any): string {
        if (!session) return "";
        const mins = session.focusMinutes;
        if (mins >= 120) return "starry"; // starry (majestic)
        if (mins >= 60) return "oak"; // oak (large)
        if (mins >= 20) return "amber"; // amber (standard)
        return "sprout"; // shrub
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
    class="flex-grow pt-32 pb-20 px-6 relative z-10 w-full overflow-hidden bg-resin-bg"
>
    <div class="max-w-6xl mx-auto flex flex-col items-center">
        <!-- Header Section -->
        <div
            class="text-center mb-16 space-y-4"
            in:fly={{ y: -20, duration: 800 }}
        >
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-forest/5 border border-resin-forest/10 text-resin-forest/60 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
                Rewards & Progress
            </div>
            <h1
                class="text-4xl md:text-6xl font-bold text-resin-charcoal font-serif tracking-tight"
            >
                The Petrified <span class="italic text-resin-forest"
                    >Forest</span
                >
            </h1>
            <p class="text-resin-earth/70 text-lg font-light max-w-xl mx-auto">
                Every plan you complete adds to your permanent digital
                sanctuary.
            </p>
        </div>


        <!-- Recent Reward Display -->
        {#if recentReward}
            <div
                class="mb-12 max-w-2xl mx-auto"
                in:fly={{ y: -10, duration: 300 }}
                out:fly={{ y: -10, duration: 200 }}
            >
                <div class="glass-card rounded-2xl p-6 bg-gradient-to-r from-resin-amber/10 via-transparent to-resin-amber/5 border border-resin-amber/30 flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
                    <div class="flex items-center gap-4">
                        <div class="text-5xl animate-bounce">{recentReward.icon}</div>
                        <div>
                            <p class="text-sm font-bold text-resin-charcoal">{recentReward.text}</p>
                            <p class="text-xs text-resin-earth/50 mt-1">Just now · Check the forest to see your rewards!</p>
                        </div>
                    </div>
                    <button
                        onclick={() => (recentReward = null)}
                        class="text-resin-earth/40 hover:text-resin-earth/60 transition-colors flex-shrink-0"
                        title="Dismiss reward notification"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        {/if}

        <!-- Stats Cards -->
        <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mb-24"
        >
            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-amber/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber mb-2 mx-auto"
                    >
                        <Gem size={24} />
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >{totalStones}</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Stones Earned</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Earn stones by completing focus sessions, sharing plans with friends, and using the browser extension
                    </p>
                </div>
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-forest/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-2 mx-auto font-serif font-bold italic text-lg"
                    >
                        {currentStreak}
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >Day Streak</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Keep it going!</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Focus every day to maintain your streak. Missing a day resets it.
                    </p>
                </div>
            </div>

            <div
                class="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-resin-forest/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-2 mx-auto"
                    >
                        <Zap size={24} />
                    </div>
                    <span class="text-4xl font-bold text-resin-charcoal"
                        >{formatDuration(totalFocusMinutes)}</span
                    >
                    <span
                        class="text-xs uppercase tracking-widest text-resin-earth/50 font-bold mt-2 block"
                        >Total Focus</span
                    >
                    <p class="text-[10px] text-resin-earth/40 mt-3 leading-relaxed max-w-xs mx-auto">
                        Your longest focus session was {formatDuration(longestSession)}
                    </p>
                </div>
            </div>
        </div>

        <!-- Daily Engagement & Challenges -->
        <div class="w-full max-w-6xl mb-24">
            <div class="space-y-8">
                <div class="text-center space-y-2">
                    <h2 class="text-4xl font-serif font-bold text-resin-charcoal">Daily Challenges</h2>
                    <p class="text-resin-earth/60">Stay engaged with daily milestones and streak bonuses</p>
                </div>

                <!-- Daily Streaks & Milestones -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Current Streak Progress -->
                    <div class="glass-card rounded-2xl p-6 border border-resin-amber/20 bg-gradient-to-br from-resin-amber/5 to-transparent">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-resin-charcoal flex items-center gap-2">
                                <Flame size={24} class="text-resin-amber" /> Current Streak
                            </h3>
                            <span class="text-3xl font-bold text-resin-amber">{currentStreak}</span>
                        </div>
                        <div class="space-y-2">
                            <div class="w-full h-2 bg-resin-earth/10 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-resin-amber to-orange-400 rounded-full" style="width: {Math.min(currentStreak / 7, 1) * 100}%;"></div>
                            </div>
                            <p class="text-xs text-resin-earth/60">
                                {#if currentStreak === 0}
                                    Start today to begin your streak!
                                {:else if currentStreak < 7}
                                    {7 - currentStreak} days until weekly milestone!
                                {:else if currentStreak < 30}
                                    {30 - currentStreak} days until monthly milestone!
                                {:else}
                                    You're a champion! Keep it going! 🏆
                                {/if}
                            </p>
                        </div>
                    </div>

                    <!-- Next Milestone -->
                    <div class="glass-card rounded-2xl p-6 border border-resin-forest/20">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-resin-charcoal flex items-center gap-2">
                                <Trophy size={24} class="text-resin-amber" /> Next Milestone
                            </h3>
                        </div>
                        <div class="space-y-3">
                            {#if currentStreak < 7}
                                <div>
                                    <p class="text-sm font-semibold text-resin-charcoal">7-Day Streak</p>
                                    <p class="text-2xl font-bold text-resin-amber mt-1">{7 - currentStreak}</p>
                                    <p class="text-xs text-resin-earth/60 mt-1">Days remaining</p>
                                </div>
                            {:else if currentStreak < 30}
                                <div>
                                    <p class="text-sm font-semibold text-resin-charcoal">30-Day Streak</p>
                                    <p class="text-2xl font-bold text-resin-amber mt-1">{30 - currentStreak}</p>
                                    <p class="text-xs text-resin-earth/60 mt-1">Days remaining</p>
                                </div>
                            {:else}
                                <div>
                                    <p class="text-sm font-semibold text-resin-charcoal">100-Day Legend</p>
                                    <p class="text-2xl font-bold text-resin-amber mt-1">{100 - Math.min(currentStreak, 99)}</p>
                                    <p class="text-xs text-resin-earth/60 mt-1">Days to legendary status</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Daily Bonus -->
                    <div class="glass-card rounded-2xl p-6 border border-resin-forest/20 bg-gradient-to-br from-resin-forest/5 to-transparent">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-resin-charcoal flex items-center gap-2">
                                <Sparkles size={24} class="text-resin-amber" /> Today's Bonus
                            </h3>
                        </div>
                        <div class="space-y-3 text-sm">
                            <div>
                                <p class="text-resin-earth/70">First session of the day:</p>
                                <p class="text-lg font-bold text-resin-amber">+1 Stone +2 Health</p>
                            </div>
                            <div class="pt-3 border-t border-resin-forest/10">
                                <p class="text-resin-earth/70">Consistency bonus every 3 sessions:</p>
                                <p class="text-lg font-bold text-resin-forest">+1 Stone +3 Health</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Engagement Stats -->
                <div class="glass-card rounded-2xl p-8 border border-resin-forest/10">
                    <h3 class="text-xl font-bold text-resin-charcoal mb-6">Your Engagement Stats</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div class="text-center">
                            <p class="text-sm text-resin-earth/60 uppercase tracking-wider mb-2">Total Sessions</p>
                            <p class="text-3xl font-bold text-resin-charcoal">{sessions.length}</p>
                            <p class="text-xs text-resin-earth/50 mt-2">{statusCounts.completed} completed</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-resin-earth/60 uppercase tracking-wider mb-2">Success Rate</p>
                            <p class="text-3xl font-bold text-resin-amber">
                                {sessions.length > 0 ? Math.round((statusCounts.completed / sessions.length) * 100) : 0}%
                            </p>
                            <p class="text-xs text-resin-earth/50 mt-2">Last 30 days</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-resin-earth/60 uppercase tracking-wider mb-2">Best Streak</p>
                            <p class="text-3xl font-bold text-resin-forest">{longestStreak}</p>
                            {#if longestStreakAt}
                                <p class="text-[10px] text-resin-earth/40 mt-1">Achieved on {formatDateShort(longestStreakAt)}</p>
                            {:else}
                                <p class="text-xs text-resin-earth/50 mt-2">All time</p>
                            {/if}
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-resin-earth/60 uppercase tracking-wider mb-2">Trees Planted</p>
                            <h1 class="text-3xl font-bold text-resin-charcoal">Your Petrified Forest</h1>
                            <p class="text-resin-earth/60">Every saved focus note becomes a stone. Your collection of resilience.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

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
                    <TreePine size={24} class="text-xl text-resin-forest" />
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

        <!-- 4x4 Forest Grid -->
        <div class="w-full max-w-4xl">
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

            <!-- 4x4 Grid -->
            <div
                class="grid grid-cols-4 gap-[1px] bg-resin-earth/8 rounded-2xl overflow-hidden mb-4"
            >
                {#each Array(16) as _, i}
                    {@const session = gridSessions[i]}
                    {@const isEven = (Math.floor(i / 4) + (i % 4)) % 2 === 0}
                    <div
                        class="flex items-center justify-center h-24 relative group cursor-pointer transition-opacity {isEven
                            ? "bg-[#C8DCA8]/22"
                            : "bg-[#B8CC98]/16"}"
                        class:opacity-40={!session &&
                            i === 0 &&
                            filteredSessions.length === 0}
                    >
                        {#if session}
                            <div class="flex flex-col items-center gap-1 text-center">
                                <TreeSVG species={getSpeciesIcon(session)} size={48} health={forestHealth} />
                                <span
                                    class="text-[8px] font-medium text-resin-earth/40 px-1 hidden group-hover:block"
                                    >{session.focusMinutes}m</span
                                >
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

        <!-- Collection Showcase -->
        <div class="w-full max-w-4xl space-y-10">
            <h2 class="text-2xl font-serif font-bold text-resin-charcoal">
                Unlocked Collection
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                {#each treeSpecies as species}
                    {@const unlocked = totalStones >= species.unlockCost}
                    {@const Icon = iconComponents[species.icon] || Sparkles}
                    <div
                        class="glass-card rounded-2xl p-6 flex flex-col items-center text-center space-y-3 {unlocked
                            ? 'opacity-100'
                            : 'opacity-40 grayscale'} transition-all duration-500"
                    >
                        <div class="mb-2">
                            {#if unlocked}
                                <TreeSVG species={species.id} size={40} health={100} />
                            {:else}
                                <div class="w-10 h-10 rounded-full bg-resin-earth/10 flex items-center justify-center text-resin-earth/40">
                                    <Icon size={20} />
                                </div>
                            {/if}
                        </div>
                        <div
                            class="text-[10px] uppercase tracking-widest font-bold text-resin-earth/40"
                        >
                            {species.name}
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
                    <p class="text-resin-earth/60">Milestones earned through dedication</p>
                    <div class="mt-4 flex items-center justify-center gap-2">
                        <span class="text-lg font-bold text-resin-amber">{unlockedAchievements.length}</span>
                        <span class="text-resin-earth/60">of</span>
                        <span class="text-lg font-bold text-resin-earth/60">{achievements.length}</span>
                    </div>
                </div>

                <!-- Achievements Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {#each achievements as achievement (achievement.id)}
                        {@const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id)}
                        <div
                            class="glass-card rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 {isUnlocked ? 'border-resin-amber/40 bg-resin-amber/5 scale-105' : 'border-resin-forest/10 opacity-60'} hover:scale-110"
                            title={achievement.description}
                        >
                            <div class="text-4xl mb-2">{achievement.icon}</div>
                            <p class="font-bold text-sm text-resin-charcoal">{achievement.name}</p>
                            <p class="text-xs text-resin-earth/50 mt-2">{achievement.description}</p>
                            {#if isUnlocked}
                                <div class="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-resin-amber/20 text-resin-amber text-[10px] font-bold">
                                    ✓ Unlocked
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>

                <!-- Tree Collection -->
                <div class="space-y-4 mt-12">
                    <div class="text-center">
                        <h3 class="text-2xl font-serif font-bold text-resin-charcoal mb-2">Tree Species Unlocked</h3>
                        <p class="text-resin-earth/60">{unlockedSpecies.length} / {treeSpecies.length} collected</p>
                    </div>

                    <!-- Rarity Breakdown -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {#each ['common', 'uncommon', 'rare', 'epic', 'legendary'] as rarity}
                            {@const count = unlockedSpecies.filter((s: any) => s.rarity === rarity).length}
                            {@const total = treeSpecies.filter((s: any) => s.rarity === rarity).length}
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
                                        <div class="text-4xl mb-2 group-hover:scale-125 transition-transform">{species.icon}</div>
                                        <p class="text-xs font-semibold text-resin-charcoal line-clamp-2">{species.name}</p>
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
                                    <TreeSVG species={getSpeciesIcon(session)} size={32} health={forestHealth} />
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

        <!-- Info Footer -->
        <div class="mt-40 text-center space-y-6 opacity-40 max-w-lg mx-auto">
            <p class="text-sm font-light italic">
                "Growth is silent, but its presence is felt in the stillness of
                the forest."
            </p>
            <div class="h-px bg-resin-forest/10 w-24 mx-auto"></div>
        </div>
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
