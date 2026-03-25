<script lang="ts">
    import { Flame, Trophy, Zap, Sparkles, Target, Award, CalendarDays, History } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";

    let { data } = $props();
    let profile = $derived(data.profile || {});
    let sessions = $derived(data.sessions || []);
    let totalFocusMinutes = $derived(data.totalFocusMinutes || 0);

    const dayStreak = $derived(profile.current_streak ?? 0);
    const longestStreak = $derived(profile.longest_streak ?? 0);
    const totalStones = $derived(profile.total_stones ?? 0);
    
    // Calculate focus hours
    const focusHours = $derived(Math.floor(totalFocusMinutes / 60));
    const focusMinutes = $derived(totalFocusMinutes % 60);
</script>

<svelte:head>
    <title>Rewards | Resin</title>
</svelte:head>

<div class="min-h-screen bg-[#FDFBF7] relative overflow-hidden font-sans selection:bg-resin-amber/30 selection:text-resin-forest pt-24 pb-20">
    
    <!-- Decorative background elements -->
    <div class="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#E8F0EA] rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse-slow"></div>
        <div class="absolute top-60 -left-20 w-[500px] h-[500px] bg-[#Fdf5e6] rounded-full mix-blend-multiply filter blur-[80px] opacity-60"></div>
    </div>

    <div class="max-w-5xl mx-auto px-6 relative z-10">
        <!-- Header -->
        <header class="mb-14 text-center" in:fly={{ y: -20, duration: 800, delay: 100 }}>
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber mb-4 shadow-sm">
                <Sparkles class="w-4 h-4" />
                <span class="text-xs font-bold tracking-widest uppercase">Your Achievements</span>
            </div>
            <h1 class="text-5xl md:text-6xl font-serif font-bold text-resin-charcoal mb-4 tracking-tight drop-shadow-sm">
                Rewards Workspace
            </h1>
            <p class="text-lg text-resin-earth/70 max-w-2xl mx-auto font-light leading-relaxed">
                Track your consistency, earn stones, and visualize your focus mastery. Every session builds your legacy.
            </p>
        </header>

        <!-- Stats Grid View -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <!-- Day Streak Card -->
            <div 
                in:fly={{ y: 20, duration: 600, delay: 200 }}
                class="relative group overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white/40 transition-all duration-500 hover:-translate-y-1"
            >
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-orange-100 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-6 text-orange-500 border border-orange-100/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Flame class="w-6 h-6" />
                    </div>
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-5xl font-bold text-resin-charcoal tracking-tight leading-none">{dayStreak}</span>
                        <span class="text-lg font-medium text-resin-earth/60">days</span>
                    </div>
                    <p class="text-sm font-medium text-resin-earth/80">Current Streak</p>
                </div>
            </div>

            <!-- Longest Streak Card -->
            <div 
                in:fly={{ y: 20, duration: 600, delay: 300 }}
                class="relative group overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white/40 transition-all duration-500 hover:-translate-y-1"
            >
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-yellow-100 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center mb-6 text-yellow-600 border border-yellow-100/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Trophy class="w-6 h-6" />
                    </div>
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-5xl font-bold text-resin-charcoal tracking-tight leading-none">{longestStreak}</span>
                        <span class="text-lg font-medium text-resin-earth/60">days</span>
                    </div>
                    <p class="text-sm font-medium text-resin-earth/80">Longest Streak</p>
                </div>
            </div>

            <!-- Total Stones -->
            <div 
                in:fly={{ y: 20, duration: 600, delay: 400 }}
                class="relative group overflow-hidden bg-[#2B4634] rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(43,70,52,0.15)] hover:shadow-[0_20px_40px_rgb(43,70,52,0.25)] border border-[#3C5D47] transition-all duration-500 hover:-translate-y-1"
            >
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-[#4A7358] rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div class="absolute -left-10 -bottom-10 w-24 h-24 bg-[#D4AF37]/20 rounded-full blur-2xl opacity-50"></div>
                
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                        <Award class="w-6 h-6 text-resin-amber" />
                    </div>
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-5xl font-bold text-white tracking-tight leading-none">{totalStones}</span>
                    </div>
                    <p class="text-sm font-medium text-white/80">Stones Earned</p>
                </div>
            </div>

            <!-- Total Focus Time -->
            <div 
                in:fly={{ y: 20, duration: 600, delay: 500 }}
                class="relative group overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white/40 transition-all duration-500 hover:-translate-y-1"
            >
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 text-blue-500 border border-blue-100/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Zap class="w-6 h-6 fill-blue-500/20" />
                    </div>
                    <div class="flex items-baseline gap-1 mb-1">
                        <span class="text-5xl font-bold text-resin-charcoal tracking-tight leading-none">{focusHours}</span>
                        <span class="text-lg font-medium text-resin-earth/60 mr-1">h</span>
                        <span class="text-3xl font-bold text-resin-charcoal tracking-tight leading-none">{focusMinutes}</span>
                        <span class="text-lg font-medium text-resin-earth/60">m</span>
                    </div>
                    <p class="text-sm font-medium text-resin-earth/80">Total Focus Time</p>
                </div>
            </div>
        </div>

        <!-- Layout Split -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left Column: Motivation & Tips -->
            <div class="space-y-8 lg:col-span-1">
                
                <!-- Motivation Card -->
                <div 
                    in:fly={{ x: -20, duration: 800, delay: 600 }}
                    class="bg-gradient-to-br from-white to-[#F9F7F2] rounded-[2rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group"
                >
                    <div class="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-resin-amber/20 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                    
                    <div class="w-10 h-10 rounded-full bg-resin-forest/5 flex items-center justify-center mb-6 text-resin-forest group-hover:bg-resin-forest/10 transition-colors">
                        <Target class="w-5 h-5" />
                    </div>
                    
                    <h3 class="text-2xl font-serif font-bold text-resin-charcoal mb-3">Maintain Momentum</h3>
                    
                    {#if dayStreak > 0}
                        <p class="text-resin-earth/80 leading-relaxed font-light mb-6">
                            You are building an unstoppable habit. A <strong class="text-orange-500 font-semibold">{dayStreak} day streak</strong> separates you from the crowd. Keep pushing your limits.
                        </p>
                        <div class="w-full bg-resin-earth/10 rounded-full h-2 mb-2 overflow-hidden">
                            <div class="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {Math.min(100, (dayStreak / (longestStreak || 1)) * 100)}%"></div>
                        </div>
                        <p class="text-xs text-resin-earth/60 font-medium tracking-wide uppercase text-right">
                            {longestStreak - dayStreak > 0 ? `${longestStreak - dayStreak} days to beat record` : 'New Record!'}
                        </p>
                    {:else}
                        <p class="text-resin-earth/80 leading-relaxed font-light">
                            Your journey begins today. Complete a focus session or write a note to earn your first stone and ignite your streak.
                        </p>
                    {/if}
                </div>

                <!-- Tips Selection -->
                <div 
                    in:fly={{ x: -20, duration: 800, delay: 700 }}
                    class="bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
                >
                    <h3 class="text-lg font-bold text-resin-charcoal mb-6 flex items-center gap-2">
                        <Sparkles class="w-5 h-5 text-resin-amber" />
                        Mastering Resin
                    </h3>
                    <ul class="space-y-5">
                        <li class="flex items-start gap-4 group cursor-default">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">📝</div>
                            <div>
                                <h4 class="text-sm font-bold text-resin-charcoal group-hover:text-blue-500 transition-colors">Brain Dumps</h4>
                                <p class="text-xs text-resin-earth/70 mt-1 leading-relaxed">Save chaotic notes to automatically earn reward stones.</p>
                            </div>
                        </li>
                        <li class="flex items-start gap-4 group cursor-default">
                            <div class="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm">⏰</div>
                            <div>
                                <h4 class="text-sm font-bold text-resin-charcoal group-hover:text-green-600 transition-colors">Deep Focus</h4>
                                <p class="text-xs text-resin-earth/70 mt-1 leading-relaxed">Commit to uninterrupted focus sessions to forge discipline.</p>
                            </div>
                        </li>
                        <li class="flex items-start gap-4 group cursor-default">
                            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 shadow-sm">🗺️</div>
                            <div>
                                <h4 class="text-sm font-bold text-resin-charcoal group-hover:text-purple-500 transition-colors">Map Mastery</h4>
                                <p class="text-xs text-resin-earth/70 mt-1 leading-relaxed">Drag and drop notes into the Mind Map to visualize ideas.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Right Column: Recent Sessions History -->
            <div 
                in:fly={{ x: 20, duration: 800, delay: 600 }}
                class="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
                <div class="flex items-center justify-between mb-8 pb-6 border-b border-resin-forest/5">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-resin-forest/5 flex items-center justify-center text-resin-forest border border-resin-forest/10">
                            <History class="w-6 h-6" />
                        </div>
                        <h2 class="text-3xl font-serif font-bold text-resin-charcoal tracking-tight">Session History</h2>
                    </div>
                </div>

                {#if sessions.length > 0}
                    <div class="space-y-4">
                        {#each sessions.slice(0, 8) as session, i}
                            <div 
                                in:fade={{ duration: 400, delay: 700 + (i * 100) }}
                                class="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white border border-resin-forest/5 hover:border-resin-amber/30 hover:shadow-[0_8px_20px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300"
                            >
                                <div class="flex items-start gap-4 mb-4 sm:mb-0">
                                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 {session.status === 'completed' ? 'bg-[#2B4634] text-white shadow-md' : 'bg-gray-50 border border-gray-100 text-gray-400 group-hover:bg-gray-100'}">
                                        {#if session.status === 'completed'}
                                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                                        {:else}
                                            <CalendarDays class="w-6 h-6" />
                                        {/if}
                                    </div>
                                    <div class="flex flex-col justify-center h-14">
                                        <h4 class="font-bold text-resin-charcoal text-lg leading-tight mb-1.5 group-hover:text-resin-forest transition-colors">
                                            {session.display_title || 'Untitled Session'}
                                        </h4>
                                        <div class="flex items-center gap-3 text-sm font-medium text-resin-earth/60">
                                            <span class="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-md">
                                                🗓️ {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span class="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-md">
                                                ⏱️ {Math.max(1, Math.round(
                                                    (new Date(session.amber_tasks?.[0]?.end_time || session.created_at).getTime() -
                                                        new Date(session.amber_tasks?.[0]?.start_time || session.created_at).getTime()) /
                                                        60000
                                                ))} min
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="pl-18 sm:pl-0 flex items-center justify-end">
                                    <span class="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm {session.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}">
                                        {session.status}
                                    </span>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="flex flex-col items-center justify-center py-24 px-6 text-center bg-white/50 rounded-3xl border-2 border-dashed border-resin-earth/10">
                        <div class="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
                            <History class="w-10 h-10 text-resin-earth/30 flex-shrink-0" />
                        </div>
                        <h3 class="text-2xl font-bold text-resin-charcoal mb-3">No History Yet</h3>
                        <p class="text-resin-earth/60 max-w-sm font-light leading-relaxed text-lg">
                            Your past sessions will appear here. Start your first focus session to begin building your streak!
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    @keyframes pulse-slow {
        0%, 100% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.05); }
    }
    .animate-pulse-slow {
        animation: pulse-slow 8s ease-in-out infinite;
    }
</style>
