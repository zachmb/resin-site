<script lang="ts">
    import { onMount } from 'svelte';
    import { ChevronLeft, ChevronRight, Flame, Zap, Gem } from 'lucide-svelte';

    let activities: any[] = $state([]);
    let monthStats: any = $state({});
    let selectedDate: Date | null = $state(null);
    let currentMonth = $state(new Date());
    let isLoading = $state(false);
    let error = $state('');

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    const monthName = $derived(months[currentMonth.getMonth()] + ' ' + currentMonth.getFullYear());

    function getDaysInMonth(date: Date): number {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    function getFirstDayOfMonth(date: Date): number {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    }

    function previousMonth() {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
        loadData();
    }

    function nextMonth() {
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        loadData();
    }

    function getActivityLevel(activity: any): number {
        const focusScore = Math.min(Math.floor((activity?.focus_minutes || 0) / 5), 3);
        const planScore = Math.min(activity?.amber_plans_completed || 0, 3);
        const noteScore = Math.min(activity?.notes_created || 0, 2);
        return Math.min(focusScore + planScore + noteScore, 10);
    }

    function getActivityColor(activity: any): string {
        const level = getActivityLevel(activity);
        switch (true) {
            case level === 0: return 'bg-gray-50';
            case level <= 2: return 'bg-resin-forest/20';
            case level <= 5: return 'bg-resin-forest/50';
            case level <= 8: return 'bg-resin-forest/75';
            default: return 'bg-resin-forest';
        }
    }

    async function loadData() {
        isLoading = true;
        error = '';
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const dayInMonth = getDaysInMonth(currentMonth);

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}`;

        try {
            // Fetch activities from API endpoint instead of direct Supabase
            const response = await fetch(`/api/calendar/activity?start=${startDate}&end=${endDate}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            activities = result.activities || [];

            // Calculate stats
            const totalFocus = activities.reduce((sum, a) => sum + (a.focus_minutes || 0), 0);
            const totalPlans = activities.reduce((sum, a) => sum + (a.amber_plans_completed || 0), 0);
            const totalStones = activities.reduce((sum, a) => sum + (a.stones_earned || 0), 0);
            const productiveDays = activities.filter(a => getActivityLevel(a) >= 5).length;

            monthStats = { totalFocus, totalPlans, totalStones, productiveDays };
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load calendar data';
            console.error('[Calendar] Error loading data:', err);
            activities = [];
            monthStats = {};
        } finally {
            isLoading = false;
        }
    }

    onMount(() => loadData());
</script>

<svelte:head>
    <title>Activity Calendar | Resin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-resin-forest/5 via-white to-resin-earth/5">
    <div class="max-w-6xl mx-auto px-4 py-12">
        <!-- Header -->
        <div class="mb-10">
            <h1 class="text-4xl font-bold text-resin-charcoal flex items-center gap-3 mb-2">
                <span class="text-4xl">📅</span>
                Activity Calendar
            </h1>
            <p class="text-lg text-resin-earth/70">Track your daily focus and productivity</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Calendar -->
            <div class="lg:col-span-2">
                <div class="glass-card rounded-lg p-6 border border-white/20 shadow-premium">
                    <!-- Month Navigation -->
                    <div class="flex items-center justify-between mb-6">
                        <button
                            onclick={previousMonth}
                            class="p-2 hover:bg-resin-forest/10 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} class="text-resin-forest" />
                        </button>

                        <h2 class="text-2xl font-bold text-resin-charcoal">{monthName}</h2>

                        <button
                            onclick={nextMonth}
                            class="p-2 hover:bg-resin-forest/10 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} class="text-resin-forest" />
                        </button>
                    </div>

                    <!-- Day Headers -->
                    <div class="grid grid-cols-7 gap-2 mb-2">
                        {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
                            <div class="text-center text-sm font-semibold text-resin-earth/60 py-2">
                                {day}
                            </div>
                        {/each}
                    </div>

                    <!-- Calendar Grid -->
                    <div class="grid grid-cols-7 gap-2">
                        {#each Array(getFirstDayOfMonth(currentMonth)) as _}
                            <div class="aspect-square"></div>
                        {/each}

                        {#each Array(getDaysInMonth(currentMonth)) as _, i}
                            {@const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)}
                            {@const activity = activities.find(a => {
                                const aDate = new Date(a.activity_date);
                                return aDate.getFullYear() === date.getFullYear() &&
                                       aDate.getMonth() === date.getMonth() &&
                                       aDate.getDate() === date.getDate();
                            })}
                            <button
                                onclick={() => selectedDate = date}
                                class="aspect-square rounded-lg border-2 border-transparent hover:border-resin-forest/30 transition-all text-center flex flex-col items-center justify-center cursor-pointer {getActivityColor(activity)} {selectedDate?.getDate() === date.getDate() && selectedDate?.getMonth() === date.getMonth() ? 'border-resin-forest' : ''}"
                            >
                                <span class="text-sm font-semibold text-resin-charcoal">{i + 1}</span>
                                {#if activity && getActivityLevel(activity) > 0}
                                    <Flame size={12} class="text-orange-500 mt-1" />
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Stats Sidebar -->
            <div class="space-y-4">
                <!-- Monthly Stats -->
                <div class="glass-card rounded-lg p-6 border border-white/20 shadow-premium">
                    <h3 class="text-lg font-bold text-resin-charcoal mb-4">Monthly Stats</h3>

                    <div class="space-y-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-lg bg-resin-forest/10 flex items-center justify-center">
                                <span class="text-xl">⏱️</span>
                            </div>
                            <div>
                                <p class="text-xs text-resin-earth/60">Focus Time</p>
                                <p class="text-xl font-bold text-resin-charcoal">{monthStats.totalFocus || 0} <span class="text-sm text-resin-earth/60 font-normal">min</span></p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-lg bg-resin-amber/10 flex items-center justify-center">
                                <span class="text-xl">✅</span>
                            </div>
                            <div>
                                <p class="text-xs text-resin-earth/60">Plans Done</p>
                                <p class="text-xl font-bold text-resin-charcoal">{monthStats.totalPlans || 0}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                                <span class="text-xl">💎</span>
                            </div>
                            <div>
                                <p class="text-xs text-resin-earth/60">Stones</p>
                                <p class="text-xl font-bold text-resin-charcoal">{monthStats.totalStones || 0}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                                <span class="text-xl">🔥</span>
                            </div>
                            <div>
                                <p class="text-xs text-resin-earth/60">Productive Days</p>
                                <p class="text-xl font-bold text-resin-charcoal">{monthStats.productiveDays || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Legend -->
                <div class="glass-card rounded-lg p-6 border border-white/20 shadow-premium">
                    <h3 class="text-lg font-bold text-resin-charcoal mb-4">Activity Levels</h3>

                    <div class="space-y-2 text-sm">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-gray-50 border border-gray-200"></div>
                            <span class="text-resin-earth/70">No activity</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-resin-forest/20"></div>
                            <span class="text-resin-earth/70">Light</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-resin-forest/50"></div>
                            <span class="text-resin-earth/70">Moderate</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-resin-forest/75"></div>
                            <span class="text-resin-earth/70">Active</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-resin-forest"></div>
                            <span class="text-resin-earth/70">Very Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
