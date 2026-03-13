<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { enhance } from "$app/forms";
    import { goto, invalidateAll } from "$app/navigation";
    import { createSupabaseClient } from "$lib/supabase";
    import FocusControl from "./FocusControl.svelte";
    import ResinShieldCard from "./ResinShieldCard.svelte";

    let {
        session = null,
        profile,
        recentNotes = [],
        todayTasks = [],
        weeklyStats = null,
        automations = [],
        isNewUser = false,
        groups = [],
        burnoutRisk = false,
    } = $props<{
        session?: any;
        profile: any;
        recentNotes: any[];
        todayTasks: any[];
        weeklyStats: any;
        automations: any[];
        isNewUser?: boolean;
        groups?: any[];
        burnoutRisk?: boolean;
    }>();

    const firstName =
        session?.user?.user_metadata?.full_name?.split(" ")[0] ||
        session?.user?.user_metadata?.name?.split(" ")[0] ||
        profile?.email?.split("@")[0] ||
        "explorer";

    let composeText = $state("");
    let showAddAutomation = $state(false);
    let autoTitle = $state("");
    let autoTime = $state("");
    let autoDuration = $state("25");
    let savingNote = $state(false);
    let savingAmber = $state(false);
    let successNote = $state(false);
    let successAmber = $state(false);
    let autoDays = $state<Record<string, boolean>>({
        Mon: false,
        Tue: false,
        Wed: false,
        Thu: false,
        Fri: false,
        Sat: false,
        Sun: false,
    });

    // Profile sync state
    let syncedProfile = $state<any>(null);

    // Onboarding banner
    let showShieldModal = $state(false);
    // `localStorage` isn't reactive, so a `$derived(...)` won't update when the user dismisses.
    // Use state and flip it immediately on X.
    let showBanner = $state(false);

    onMount(() => {
        // Initialize with current profile
        syncedProfile = profile;
        showBanner = isNewUser && !localStorage.getItem('resin_onboarded');

        // Subscribe to real-time profile updates (for iOS sync)
        const supabase = createSupabaseClient();
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        // Fallback: periodically refresh profile for stones/streak sync (every 30 seconds)
        const setupPolling = () => {
            pollInterval = setInterval(async () => {
                if (supabase && profile?.id) {
                    try {
                        const { data } = await supabase
                            .from('profiles')
                            .select('id, total_stones, current_streak, longest_streak')
                            .eq('id', profile.id)
                            .single();

                        if (data) {
                            // Only update if values changed
                            if (data.total_stones !== syncedProfile?.total_stones ||
                                data.current_streak !== syncedProfile?.current_streak) {
                                syncedProfile = { ...syncedProfile, ...data };
                            }
                        }
                    } catch (err) {
                        // Silent error, polling is a fallback
                    }
                }
            }, 30000); // Poll every 30 seconds
        };

        if (supabase && profile?.id) {
            // Set up real-time subscription
            const subscription = supabase
                .channel(`profiles:${profile.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${profile.id}`
                    },
                    (payload) => {
                        // Update profile data when iOS syncs (stones, streak, etc)
                        if (payload.new) {
                            syncedProfile = payload.new;
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Dashboard] Real-time sync connected');
                    }
                });

            // Set up polling as fallback
            setupPolling();

            return () => {
                supabase.removeChannel(subscription);
                if (pollInterval) clearInterval(pollInterval);
            };
        }
    });

    const dismissBanner = async () => {
        localStorage.setItem('resin_onboarded', '1');
        showBanner = false;
        // Mark as onboarded in database
        try {
            await fetch('?/markWebOnboarded', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        } catch (err) {
            console.error('Failed to mark web onboarded:', err);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    const feelingIcons: Record<string, string> = {
        "Flow State": "⚡",
        Proud: "⭐",
        Relieved: "🍃",
        Energized: "🔥",
        Drained: "🪫",
        Frustrated: "🌧️",
    };

    let today = new Date();

    function heatLevel(minutes: number): number {
        if (minutes === 0) return 0;
        if (minutes < 30) return 1;
        if (minutes < 60) return 2;
        if (minutes < 120) return 3;
        return 4;
    }

    const heatColors = [
        "bg-resin-forest/5",
        "bg-resin-forest/15",
        "bg-resin-forest/30",
        "bg-resin-forest/50",
        "bg-resin-forest/70",
    ];

    const formatDaysOfWeek = (days: string): string => {
        if (!days) return "";
        const dayMap: Record<string, string> = {
            Mon: "Mon",
            Tue: "Tue",
            Wed: "Wed",
            Thu: "Thu",
            Fri: "Fri",
            Sat: "Sat",
            Sun: "Sun",
        };
        return days
            .split(",")
            .map((d) => dayMap[d.trim()] || d.trim())
            .join(", ");
    };

    const getDaysForSubmit = (): string => {
        return Object.entries(autoDays)
            .filter(([_, checked]) => checked)
            .map(([day]) => day)
            .join(",");
    };
</script>

<main
    class="w-full h-full min-h-screen pt-28 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-6xl mx-auto"
>
    <!-- Header -->
    <div
        class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
    >
        <div>
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-3"
            >
                Command Center
            </div>
            <h1
                class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight"
            >
                Welcome back, <span class="text-resin-forest italic serif"
                    >{firstName}</span
                >
            </h1>
            <p class="text-resin-earth/60 font-medium mt-2">
                {formatDate(today)}
            </p>
        </div>

        <div class="flex items-center gap-8">
            <a href="/forest" class="text-center group">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1 group-hover:text-resin-amber transition-colors"
                >
                    Stones
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {syncedProfile?.total_stones || syncedProfile?.stones || 0}
                </p>
            </a>
            <div class="w-px h-8 bg-resin-forest/10"></div>
            <a href="/forest" class="text-center group">
                <p
                    class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1 group-hover:text-resin-amber transition-colors"
                >
                    Streak
                </p>
                <p class="text-2xl font-bold text-resin-charcoal">
                    {syncedProfile?.current_streak || 0}d
                </p>
            </a>
            {#if weeklyStats?.avgRating > 0}
                <div class="w-px h-8 bg-resin-forest/10"></div>
                <div class="text-center">
                    <p
                        class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest mb-1"
                    >
                        Avg Rating
                    </p>
                    <p class="text-2xl font-bold text-resin-amber">
                        {weeklyStats.avgRating}/5
                    </p>
                </div>
            {/if}
            <a
                href="/friends"
                class="text-sm font-bold text-resin-forest hover:text-resin-amber transition-colors mt-6 inline-block"
            >
                + Invite a Friend →
            </a>
        </div>
    </div>

    <!-- Quick Compose Card -->
    <section class="mb-8">
        <div
            class="glass-card rounded-[2.5rem] p-8 border border-white/20 shadow-premium bg-gradient-to-br from-white/40 to-transparent"
        >
            <textarea
                bind:value={composeText}
                placeholder="What's on your mind? Start a note, a plan, anything..."
                class="w-full bg-white/50 border border-white/30 rounded-2xl p-6 text-resin-charcoal placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/50 focus:ring-2 focus:ring-resin-forest/20 resize-none"
                rows="3"
            />
            <div class="flex items-center justify-end gap-3 mt-6">
                {#if composeText.trim()}
                    <form
                        method="POST"
                        action="?/quickNote"
                        use:enhance={() => {
                            savingNote = true;
                            return async ({ result }) => {
                                if (result.type === "success") {
                                    successNote = true;
                                    await invalidateAll();
                                    setTimeout(() => {
                                        savingNote = false;
                                        successNote = false;
                                        composeText = "";
                                        goto(result.data?.redirectTo || "/notes");
                                    }, 800);
                                } else {
                                    savingNote = false;
                                }
                            };
                        }}
                    >
                        <input
                            type="hidden"
                            name="content"
                            value={composeText}
                        />
                        <button
                            type="submit"
                            disabled={savingNote}
                            class="px-6 py-2 rounded-full text-sm font-bold text-resin-charcoal bg-white/60 border border-white/40 hover:bg-white hover:border-resin-forest/30 transition-all disabled:opacity-90 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2 min-w-[120px] justify-center"
                        >
                            {#if savingNote}
                                <svg
                                    class="w-4 h-4 animate-spin"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                    />
                                    <path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            {:else if successNote}
                                <svg
                                    class="w-4 h-4 animate-bounce"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            {/if}
                            {successNote ? "Saving..." : "Save Note"}
                        </button>
                    </form>
                    <form
                        method="POST"
                        action="?/quickSchedule"
                        use:enhance={() => {
                            savingAmber = true;
                            return async ({ result }) => {
                                if (result.type === "success") {
                                    successAmber = true;
                                    await invalidateAll();
                                    setTimeout(() => {
                                        savingAmber = false;
                                        successAmber = false;
                                        composeText = "";
                                        goto(result.data?.redirectTo || "/amber");
                                    }, 800);
                                } else {
                                    savingAmber = false;
                                }
                            };
                        }}
                    >
                        <input
                            type="hidden"
                            name="content"
                            value={composeText}
                        />
                        <button
                            type="submit"
                            disabled={savingAmber}
                            class="px-6 py-2 rounded-full text-sm font-bold text-white bg-resin-amber hover:bg-resin-amber/90 transition-all disabled:opacity-90 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2 min-w-[160px] justify-center"
                        >
                            {#if savingAmber}
                                <svg
                                    class="w-4 h-4 animate-spin"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        class="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        stroke-width="4"
                                    />
                                    <path
                                        class="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            {:else if successAmber}
                                <svg
                                    class="w-4 h-4 animate-bounce"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            {/if}
                            {successAmber
                                ? "Scheduling..."
                                : "Schedule Amber →"}
                        </button>
                    </form>
                {:else}
                    <a
                        href="/notes"
                        class="px-6 py-2 rounded-full text-sm font-bold text-resin-charcoal bg-white/60 border border-white/40 hover:bg-white hover:border-resin-forest/30 transition-all inline-block active:scale-95"
                    >
                        Save Note
                    </a>
                    <a
                        href="/amber"
                        class="px-6 py-2 rounded-full text-sm font-bold text-white bg-resin-amber hover:bg-resin-amber/90 transition-all inline-block active:scale-95"
                    >
                        Schedule Amber →
                    </a>
                {/if}
            </div>
        </div>
    </section>

    <!-- Weekly Activity Heatmap -->
    {#if weeklyStats}
        <section class="mb-8">
            <div
                class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-premium relative bg-gradient-to-br from-white/40 to-transparent"
            >
                <div class="flex items-center justify-between mb-6">
                    <h3
                        class="text-lg font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-forest"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                        This Week
                    </h3>
                    <div class="flex items-center gap-6">
                        <span
                            class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest"
                            >{weeklyStats.totalFocusMinutes}m focused</span
                        >
                        <span
                            class="text-[10px] font-bold text-resin-earth/50 uppercase tracking-widest"
                            >{weeklyStats.totalSessions} sessions</span
                        >
                    </div>
                </div>

                <div class="grid grid-cols-7 gap-3">
                    {#each weeklyStats.heatmap as day}
                        <div class="flex flex-col items-center gap-2">
                            <span
                                class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-wider"
                                >{day.day}</span
                            >
                            <div
                                class="w-full aspect-square rounded-2xl {heatColors[
                                    heatLevel(day.focusMinutes)
                                ]} flex items-center justify-center transition-all hover:scale-105 cursor-default"
                                title="{day.focusMinutes}m focused, {day.sessions} session(s)"
                            >
                                {#if day.focusMinutes > 0}
                                    <span
                                        class="text-sm font-bold {heatLevel(
                                            day.focusMinutes,
                                        ) >= 3
                                            ? 'text-white'
                                            : 'text-resin-forest/60'}"
                                        >{day.focusMinutes}m</span
                                    >
                                {/if}
                            </div>
                            <span
                                class="text-[9px] text-resin-earth/30 font-medium"
                                >{day.sessions}
                                {day.sessions === 1 ? "plan" : "plans"}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>
        </section>
    {/if}

    <!-- Onboarding Banner -->
    {#if showBanner}
        <div transition:fade class="mb-8">
            <div class="glass-card rounded-[2.5rem] p-8 border-2 border-resin-amber/40 bg-gradient-to-r from-resin-amber/10 to-transparent shadow-premium">
                <div class="flex items-start justify-between gap-6">
                    <div class="flex-1">
                        <h2 class="text-2xl font-bold text-resin-charcoal mb-2 flex items-center gap-2">
                            🌲 Welcome to Resin, {firstName}!
                        </h2>
                        <p class="text-sm text-resin-earth/70 mb-6">
                            Here's how to get the most out of your focus sessions:
                        </p>
                        <div class="flex flex-wrap gap-3">
                            <a
                                href="https://testflight.apple.com/join/YOUR_TESTFLIGHT_ID"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-resin-charcoal text-white font-semibold hover:bg-resin-forest transition-colors text-sm"
                            >
                                📱 Get the iOS App
                            </a>
                            <button
                                type="button"
                                onclick={() => showShieldModal = true}
                                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/50 border border-resin-forest/10 text-resin-charcoal font-semibold hover:bg-white transition-colors text-sm"
                            >
                                🔒 Install Browser Extension
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={dismissBanner}
                        class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-resin-forest/10 transition-colors text-resin-earth/60 hover:text-resin-charcoal"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Burnout Risk Banner -->
    {#if burnoutRisk}
        <section
            class="rounded-2xl p-6 bg-gradient-to-r from-resin-amber/10 to-orange-50/20 border border-resin-amber/30 shadow-sm"
            transition:fade={{ duration: 300 }}
        >
            <div class="flex items-center gap-4">
                <span class="text-3xl">🌿</span>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-resin-amber">
                        You've been feeling drained lately
                    </p>
                    <p class="text-xs text-resin-earth/60 mt-1">
                        Consider a lighter focus session today to recharge.
                    </p>
                </div>
            </div>
        </section>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Focus, Taste, Timeline -->
        <div class="lg:col-span-7 space-y-8">
            <ResinShieldCard />
            <FocusControl />

            <!-- Focus Groups Card -->
            {#if groups && groups.length > 0}
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-resin-forest/15 shadow-premium relative bg-gradient-to-br from-resin-forest/5 to-transparent overflow-hidden"
                >
                    <div
                        class="absolute -right-16 -bottom-16 w-48 h-48 bg-resin-forest/5 rounded-full blur-3xl"
                    ></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-10 h-10 rounded-2xl bg-resin-forest/10 flex items-center justify-center"
                                >
                                    <span class="text-lg">👥</span>
                                </div>
                                <div>
                                    <h3
                                        class="text-lg font-bold text-resin-charcoal"
                                    >
                                        Your Groups
                                    </h3>
                                    <p
                                        class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                                    >
                                        Focus with others
                                    </p>
                                </div>
                            </div>
                            <a
                                href="/groups"
                                class="text-sm font-bold text-resin-forest hover:text-resin-amber transition-colors"
                            >
                                View All →
                            </a>
                        </div>

                        <div class="space-y-2">
                            {#each groups.slice(0, 3) as group}
                                <a
                                    href="/groups/{group.id}"
                                    class="flex items-center justify-between p-3 rounded-2xl bg-white/40 hover:bg-white/60 transition-colors group/item"
                                >
                                    <div>
                                        <p class="text-sm font-bold text-resin-charcoal group-hover/item:text-resin-forest transition-colors">
                                            {group.name}
                                        </p>
                                        <p class="text-xs text-resin-earth/60">
                                            {group.userRole}
                                        </p>
                                    </div>
                                    <span class="text-resin-forest text-sm">→</span>
                                </a>
                            {/each}
                        </div>
                    </div>
                </section>
            {/if}

            <!-- Taste Insights Card -->
            {#if weeklyStats && (weeklyStats.topFeeling || weeklyStats.enjoyedThings.length > 0)}
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-resin-amber/15 shadow-premium relative bg-gradient-to-br from-resin-amber/5 to-transparent overflow-hidden"
                >
                    <div
                        class="absolute -right-16 -bottom-16 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl"
                    ></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-6">
                            <div
                                class="w-10 h-10 rounded-2xl bg-resin-amber/10 flex items-center justify-center"
                            >
                                <span class="text-lg">✦</span>
                            </div>
                            <div>
                                <h3
                                    class="text-lg font-bold text-resin-charcoal"
                                >
                                    Taste Profile
                                </h3>
                                <p
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest"
                                >
                                    What energizes you
                                </p>
                            </div>
                        </div>

                        {#if weeklyStats.topFeeling}
                            <div
                                class="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-white/40"
                            >
                                <span class="text-2xl"
                                    >{feelingIcons[weeklyStats.topFeeling] ||
                                        "✦"}</span
                                >
                                <div>
                                    <p
                                        class="text-xs font-bold text-resin-earth/50 uppercase tracking-wider"
                                    >
                                        Dominant feeling after sessions
                                    </p>
                                    <p
                                        class="text-lg font-bold text-resin-charcoal"
                                    >
                                        {weeklyStats.topFeeling}
                                    </p>
                                </div>
                            </div>
                        {/if}

                        {#if Object.keys(weeklyStats.feelingCounts).length > 1}
                            <div class="flex flex-wrap gap-2 mb-5">
                                {#each Object.entries(weeklyStats.feelingCounts) as [feeling, count]}
                                    <div
                                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 border border-resin-forest/5"
                                    >
                                        <span class="text-sm"
                                            >{feelingIcons[feeling] ||
                                                "·"}</span
                                        >
                                        <span
                                            class="text-xs font-semibold text-resin-earth"
                                            >{feeling}</span
                                        >
                                        <span
                                            class="text-[10px] font-bold text-resin-earth/40"
                                            >×{count}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        {#if weeklyStats.enjoyedThings.length > 0}
                            <div>
                                <p
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                                >
                                    Things you've enjoyed
                                </p>
                                <div class="space-y-2">
                                    {#each weeklyStats.enjoyedThings as thing}
                                        <div
                                            class="flex items-start gap-2 text-sm text-resin-earth/80"
                                        >
                                            <span
                                                class="text-resin-amber mt-0.5"
                                                >→</span
                                            >
                                            <span class="italic">"{thing}"</span
                                            >
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </section>
            {/if}

            <!-- Timeline -->
            <section
                class="glass-card rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-premium relative bg-gradient-to-br from-white/40 to-transparent"
            >
                <div class="flex items-center justify-between mb-8">
                    <h3
                        class="text-xl font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-amber"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Today's Timeline
                    </h3>
                    <span
                        class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest"
                        >{todayTasks.length} Events</span
                    >
                </div>

                {#if todayTasks.length > 0}
                    <div
                        class="space-y-0 relative before:absolute before:inset-0 before:left-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-resin-amber/40 before:via-resin-forest/10 before:to-transparent"
                    >
                        {#each todayTasks as task}
                            <a
                                href={task.session_id ? `/amber?sessionId=${task.session_id}` : '/amber'}
                                class="relative pl-10 pb-8 last:pb-0 group block hover:opacity-75 transition-opacity"
                            >
                                <div
                                    class="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#F8F5EE] bg-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-125"
                                >
                                    <div
                                        class="w-2 h-2 rounded-full {task.requires_focus
                                            ? 'bg-resin-amber'
                                            : 'bg-resin-forest/30'}"
                                    ></div>
                                </div>
                                <div
                                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                    <div>
                                        <p
                                            class="text-[10px] font-bold text-resin-amber tracking-wider uppercase mb-0.5"
                                        >
                                            {formatTime(task.start_time)} – {formatTime(
                                                task.end_time,
                                            )}
                                        </p>
                                        <h4
                                            class="font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                                        >
                                            {task.title}
                                        </h4>
                                    </div>
                                    {#if task.requires_focus}
                                        <span
                                            class="inline-flex items-center px-2 py-0.5 rounded-lg bg-resin-amber/5 border border-resin-amber/10 text-[10px] font-bold text-resin-amber uppercase"
                                            >Shield Active</span
                                        >
                                    {/if}
                                </div>
                                {#if task.description}
                                    <p
                                        class="text-sm text-resin-earth/70 mt-2 leading-relaxed whitespace-pre-line line-clamp-3"
                                    >
                                        {task.description}
                                    </p>
                                {/if}
                            </a>
                        {/each}
                    </div>
                {:else}
                    <div class="text-center py-12">
                        <div
                            class="w-16 h-16 rounded-3xl bg-resin-forest/5 flex items-center justify-center mx-auto mb-4 border border-dashed border-resin-forest/20"
                        >
                            <svg
                                class="w-8 h-8 text-resin-earth/30"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="1.5"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p class="text-resin-charcoal font-medium">
                            Nothing scheduled yet
                        </p>
                        <p class="text-xs text-resin-earth/60 mt-1">
                            Activate a note from the app to see your day take
                            shape.
                        </p>
                    </div>
                {/if}
            </section>
        </div>

        <!-- Right: Daily Routines + Quick Stats + Recent Notes -->
        <div class="lg:col-span-5 space-y-8">
            <!-- Forest & Rewards Card -->
            <a
                href="/forest"
                class="glass-card rounded-[2.5rem] p-8 border border-resin-forest/20 shadow-premium bg-gradient-to-br from-resin-forest/10 to-transparent hover:shadow-lg transition-all group block"
            >
                <div class="flex items-center justify-between mb-6">
                    <h3
                        class="text-lg font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-forest group-hover:scale-110 transition-transform"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                            />
                        </svg>
                        Forest & Rewards
                    </h3>
                    <svg
                        class="w-5 h-5 text-resin-earth/40 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div
                        class="p-4 rounded-xl bg-white/40 border border-white/20 text-center"
                    >
                        <p class="text-xs text-resin-earth/60 mb-1">Stones</p>
                        <p class="text-2xl font-bold text-resin-forest">
                            {syncedProfile?.total_stones || syncedProfile?.stones || 0}
                        </p>
                    </div>
                    <div
                        class="p-4 rounded-xl bg-white/40 border border-white/20 text-center"
                    >
                        <p class="text-xs text-resin-earth/60 mb-1">Streak</p>
                        <p class="text-2xl font-bold text-resin-amber">
                            {syncedProfile?.current_streak || 0}d
                        </p>
                    </div>
                    {#if weeklyStats?.avgRating > 0}
                        <div
                            class="p-4 rounded-xl bg-white/40 border border-white/20 text-center"
                        >
                            <p class="text-xs text-resin-earth/60 mb-1">
                                Avg Rating
                            </p>
                            <p class="text-2xl font-bold text-resin-amber">
                                {weeklyStats.avgRating}/5
                            </p>
                        </div>
                    {/if}
                    <div
                        class="p-4 rounded-xl bg-white/40 border border-white/20 text-center"
                    >
                        <p class="text-xs text-resin-earth/60 mb-1">
                            This Week
                        </p>
                        <p class="text-2xl font-bold text-resin-charcoal">
                            {weeklyStats?.totalFocusMinutes || 0}m
                        </p>
                    </div>
                </div>

                <p
                    class="text-xs text-resin-forest font-semibold mt-4 flex items-center gap-1"
                >
                    View your forest →
                </p>
            </a>

            <!-- Daily Routines Card -->
            <section
                class="glass-card rounded-[2.5rem] p-8 border border-white/20 shadow-premium bg-gradient-to-br from-white/40 to-transparent"
            >
                <div class="flex items-center justify-between mb-6">
                    <h3
                        class="text-lg font-bold text-resin-charcoal flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-resin-forest"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Daily Routines
                    </h3>
                </div>

                {#if automations.length > 0}
                    <div class="space-y-3 mb-6">
                        {#each automations as automation}
                            <div
                                class="flex items-center justify-between p-4 rounded-xl bg-white/40 border border-white/20"
                            >
                                <div>
                                    <p
                                        class="font-semibold text-resin-charcoal"
                                    >
                                        {automation.title}
                                    </p>
                                    <p class="text-xs text-resin-earth/60">
                                        {automation.time} • {automation.duration_minutes}m
                                        • {formatDaysOfWeek(
                                            automation.days_of_week,
                                        )}
                                    </p>
                                </div>
                                <form
                                    method="POST"
                                    action="?/deleteAutomation"
                                    use:enhance={() => {
                                        return async ({ result }) => {
                                            if (result.type === 'success') {
                                                await invalidateAll();
                                            }
                                        };
                                    }}
                                    class="inline"
                                >
                                    <input
                                        type="hidden"
                                        name="automationId"
                                        value={automation.id}
                                    />
                                    <button
                                        type="submit"
                                        class="w-6 h-6 rounded-full hover:bg-red-500/20 text-resin-earth/50 hover:text-red-600 transition-all flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}

                <button
                    onclick={() => {
                        showAddAutomation = !showAddAutomation;
                    }}
                    class="w-full px-4 py-3 rounded-xl text-sm font-bold text-resin-forest hover:bg-resin-forest/10 transition-colors text-center"
                >
                    + Add Routine
                </button>

                {#if showAddAutomation}
                    <form
                        method="POST"
                        action="?/createAutomation"
                        use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') {
                                    await invalidateAll();
                                    showAddAutomation = false;
                                    autoTitle = '';
                                    autoTime = '';
                                    autoDuration = '25';
                                    autoDays = {
                                        Mon: false,
                                        Tue: false,
                                        Wed: false,
                                        Thu: false,
                                        Fri: false,
                                        Sat: false,
                                        Sun: false,
                                    };
                                }
                            };
                        }}
                        onsubmit={(e) => {
                            const daysString = getDaysForSubmit();
                            if (!daysString) {
                                e.preventDefault();
                                alert("Select at least one day");
                                return;
                            }
                            const input = e.currentTarget.querySelector(
                                'input[name="daysOfWeek"]',
                            ) as HTMLInputElement;
                            if (input) input.value = daysString;
                        }}
                        class="mt-6 p-4 rounded-xl bg-resin-forest/5 border border-resin-forest/10 space-y-4"
                    >
                        <input
                            type="text"
                            name="title"
                            placeholder="Routine name"
                            bind:value={autoTitle}
                            required
                            class="w-full px-3 py-2 rounded-lg bg-white border border-white/20 text-sm placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/50"
                        />
                        <input
                            type="time"
                            name="time"
                            bind:value={autoTime}
                            required
                            class="w-full px-3 py-2 rounded-lg bg-white border border-white/20 text-sm focus:outline-none focus:border-resin-forest/50"
                        />
                        <select
                            name="duration"
                            bind:value={autoDuration}
                            class="w-full px-3 py-2 rounded-lg bg-white border border-white/20 text-sm focus:outline-none focus:border-resin-forest/50"
                        >
                            <option value="15">15 minutes</option>
                            <option value="25">25 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                        </select>
                        <div class="grid grid-cols-4 gap-2">
                            {#each Object.keys(autoDays) as day}
                                <label
                                    class="flex items-center gap-2 text-xs cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        bind:checked={autoDays[day]}
                                        class="rounded w-4 h-4"
                                    />
                                    {day}
                                </label>
                            {/each}
                        </div>
                        <input type="hidden" name="daysOfWeek" value="" />
                        <div class="flex gap-2">
                            <button
                                type="submit"
                                class="flex-1 px-4 py-2 rounded-lg bg-resin-forest text-white font-bold text-sm hover:bg-resin-forest/90 transition-colors"
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                onclick={() => {
                                    showAddAutomation = false;
                                }}
                                class="flex-1 px-4 py-2 rounded-lg bg-white border border-white/20 text-resin-charcoal font-bold text-sm hover:bg-resin-earth/5 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                {/if}
            </section>

            {#if weeklyStats}
                <div class="grid grid-cols-2 gap-4">
                    <a
                        href="/forest"
                        class="glass-card rounded-2xl p-5 border border-white/20 hover:border-resin-amber/30 transition-all group text-center"
                    >
                        <p
                            class="text-2xl font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                        >
                            {weeklyStats.scheduledPlans}
                        </p>
                        <p
                            class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mt-1"
                        >
                            Plans This Week
                        </p>
                    </a>
                    <a
                        href="/forest"
                        class="glass-card rounded-2xl p-5 border border-white/20 hover:border-resin-amber/30 transition-all group text-center"
                    >
                        <p
                            class="text-2xl font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                        >
                            {Math.round(
                                (weeklyStats.totalFocusMinutes / 60) * 10,
                            ) / 10}h
                        </p>
                        <p
                            class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-widest mt-1"
                        >
                            Focus Time
                        </p>
                    </a>
                </div>
            {/if}

            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-resin-charcoal font-serif">
                    Recent Notes
                </h3>
                <a
                    href="/notes"
                    class="text-xs font-bold text-resin-forest/50 hover:text-resin-amber transition-colors uppercase tracking-widest"
                    >View All</a
                >
            </div>

            <div class="grid grid-cols-1 gap-4">
                {#each recentNotes as note}
                    <a
                        href="/notes?id={note.id}"
                        class="glass-card rounded-3xl p-6 border border-white/20 hover:border-resin-amber/30 hover:shadow-xl transition-all group"
                    >
                        <div class="flex items-center justify-between mb-3">
                            <h4
                                class="font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors truncate pr-4"
                            >
                                {note.display_title ||
                                    note.title ||
                                    "Untitled Thought"}
                            </h4>
                            <span
                                class="text-[10px] font-bold text-resin-earth/40 whitespace-nowrap"
                            >
                                {new Date(note.created_at).toLocaleDateString(
                                    [],
                                    { month: "short", day: "numeric" },
                                )}
                            </span>
                        </div>
                        <p
                            class="text-sm text-resin-earth/70 line-clamp-2 leading-relaxed"
                        >
                            {note.raw_text || note.content || "..."}
                        </p>
                        <div class="mt-4 flex items-center gap-2">
                            {#if note.status === "scheduled"}
                                <span
                                    class="w-1.5 h-1.5 rounded-full bg-resin-amber"
                                ></span>
                                <span
                                    class="text-[10px] font-bold text-resin-amber uppercase tracking-wider"
                                    >Active Plan</span
                                >
                            {:else}
                                <span
                                    class="w-1.5 h-1.5 rounded-full bg-resin-forest/20"
                                ></span>
                                <span
                                    class="text-[10px] font-bold text-resin-earth/40 uppercase tracking-wider"
                                    >Draft</span
                                >
                            {/if}
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    </div>
</main>

<style>
    :global {
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        @keyframes bounce {
            0%,
            100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-4px);
            }
        }

        .animate-spin {
            animation: spin 1s linear infinite;
        }

        .animate-bounce {
            animation: bounce 0.6s ease-in-out;
        }
    }
</style>
