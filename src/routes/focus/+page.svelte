<script lang="ts">
    import { enhance } from '$app/forms';
    import { fade, slide } from 'svelte/transition';
    import { invalidateAll } from '$app/navigation';
    import { onMount } from 'svelte';
    import FocusControl from '$lib/components/FocusControl.svelte';
    import { Circle, Calendar, Users, Clock, Trash2 } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data } = $props();

    let activeSessions = $state(data.activeSessions || []);
    let scheduledSessions = $state(data.scheduledSessions || []);
    let deviceCount = $state(data.deviceCount || 0);
    let groups = $state(data.groups || []);
    let showScheduleForm = $state(false);
    let showAutomationForm = $state(false);

    let scheduleTitle = $state('');
    let scheduleDate = $state(new Date().toISOString().split('T')[0]);
    let scheduleTime = $state('09:00');
    let scheduleDuration = $state(30);

    let automationTitle = $state('');
    let automationDuration = $state(25);
    let automationDaysOfWeek = $state<string[]>(['Monday', 'Wednesday', 'Friday']);
    let automationTime = $state('09:00');

    let editingSessionId = $state<string | null>(null);
    let editSessionData = $state<{ [key: string]: any }>({});

    let friends = $state(data.friends || []);
    let sharedSessions = $state(data.sharedSessions || []);
    let showInviteForm = $state(false);
    let inviteCollaboratorId = $state('');
    let inviteTitle = $state('');
    let inviteDate = $state(new Date().toISOString().split('T')[0]);
    let inviteTime = $state('09:00');
    let inviteDuration = $state(30);
    let recurringSessionId = $state<string | null>(null);
    let recurringDays = $state<Record<string, boolean>>({
        'Mon': false,
        'Tue': false,
        'Wed': false,
        'Thu': false,
        'Fri': false,
        'Sat': false,
        'Sun': false,
    });

    let showCreateGroupForm = $state(false);
    let groupFormData = $state({ name: '', description: '' });
    let groupFormError = $state('');
    let isCreatingGroup = $state(false);

    onMount(() => {
        // Immediately invalidate and refresh data to show newly created sessions
        const refreshFocusData = async () => {
            try {
                const response = await fetch('?/refresh');
                if (response.ok) {
                    await invalidateAll();
                }
            } catch (err) {
                console.error('Error refreshing focus data:', err);
            }
        };

        // Refresh immediately on mount to show the latest active sessions
        refreshFocusData();
    });

    // Cache data for offline access, but always prefer server data on load
    $effect(() => {
        const focusCache = {
            activeSessions,
            scheduledSessions,
            deviceCount,
            groups,
            friends,
            sharedSessions,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('resin_focus_data', JSON.stringify(focusCache));
        } catch (err) {
            // Silently fail if localStorage is unavailable
        }
    });

    async function handleCreateGroup() {
        groupFormError = '';
        if (!groupFormData.name.trim()) {
            groupFormError = 'Group name is required';
            return;
        }

        isCreatingGroup = true;
        try {
            const response = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupFormData)
            });

            const result = await response.json();

            if (!response.ok) {
                groupFormError = result.error || 'Failed to create group';
                return;
            }

            // Reset and navigate to new group
            showCreateGroupForm = false;
            groupFormData = { name: '', description: '' };
            window.location.href = `/groups/${result.group.id}`;
        } catch (e) {
            groupFormError = 'An error occurred. Please try again.';
            console.error(e);
        } finally {
            isCreatingGroup = false;
        }
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayOfWeekAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const startEditingSession = (session: any) => {
        editingSessionId = session.id;
        const startDate = new Date(session.start_time);
        const hours = String(startDate.getHours()).padStart(2, '0');
        const minutes = String(startDate.getMinutes()).padStart(2, '0');
        const dateStr = startDate.toISOString().split('T')[0];
        const duration = Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000);

        editSessionData = {
            [session.id]: {
                title: session.title,
                date: dateStr,
                time: `${hours}:${minutes}`,
                duration: duration
            }
        };
    };

    const cancelEditingSession = () => {
        editingSessionId = null;
        editSessionData = {};
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const toggleDayOfWeek = (day: string) => {
        if (automationDaysOfWeek.includes(day)) {
            automationDaysOfWeek = automationDaysOfWeek.filter(d => d !== day);
        } else {
            automationDaysOfWeek = [...automationDaysOfWeek, day];
        }
    };

    const getSyncStatus = (session: any) => {
        if (session.device_scheduled === true) {
            return { icon: '✓', label: 'Synced to device', color: 'bg-green-400/10 border-green-400/20 text-green-700' };
        }
        if (deviceCount === 0) {
            return { icon: '⚠', label: 'No device connected', color: 'bg-gray-400/10 border-gray-400/20 text-gray-600' };
        }
        return { icon: '⟳', label: 'Pending device sync', color: 'bg-resin-amber/10 border-resin-amber/20 text-resin-amber animate-pulse' };
    };
</script>

<svelte:head>
    <title>Focus | Resin</title>
</svelte:head>

<main class="w-full min-h-screen pt-28 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
        <h1 class="text-3xl font-serif font-bold text-resin-charcoal">
            Focus Sessions
        </h1>
        <p class="text-resin-earth/60 font-medium mt-2">
            Control when your phone blocks distractions. All sessions sync instantly to your device.
        </p>
    </div>

    <!-- Quick Focus (FocusControl) -->
    <section class="mb-12">
        <FocusControl />
    </section>

    <!-- Focus Groups -->
    <section class="mb-12" transition:fade>
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <Users class="w-6 h-6 text-resin-forest" />
                Your Groups {#if groups.length > 0}({groups.length}){/if}
            </h2>
            <div class="flex items-center gap-2">
                <button
                    onclick={() => (showCreateGroupForm = !showCreateGroupForm)}
                    class="px-4 py-2 bg-resin-amber/10 border border-resin-amber/30 text-resin-amber rounded-lg text-xs font-bold hover:bg-resin-amber/20 transition-all flex items-center gap-2"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create
                </button>
                <a
                    href="/groups"
                    class="px-4 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all"
                >
                    All Groups
                </a>
            </div>
        </div>

        <!-- Create Group Form Modal -->
        {#if showCreateGroupForm}
            <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4" transition:fade>
                <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" transition:slide={{ duration: 300 }}>
                    <h3 class="text-2xl font-serif font-bold text-resin-charcoal mb-6">Create New Group</h3>

                    {#if groupFormError}
                        <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {groupFormError}
                        </div>
                    {/if}

                    <div class="mb-4">
                        <label for="groupName" class="block text-sm font-semibold text-resin-charcoal mb-2">
                            Group Name *
                        </label>
                        <input
                            id="groupName"
                            type="text"
                            bind:value={groupFormData.name}
                            placeholder="e.g., Morning Study Squad"
                            class="w-full px-4 py-2 border border-resin-forest/20 rounded-lg focus:outline-none focus:border-resin-forest focus:ring-2 focus:ring-resin-forest/20"
                            disabled={isCreatingGroup}
                        />
                    </div>

                    <div class="mb-6">
                        <label for="groupDesc" class="block text-sm font-semibold text-resin-charcoal mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            id="groupDesc"
                            bind:value={groupFormData.description}
                            placeholder="What's this group about?"
                            rows="3"
                            class="w-full px-4 py-2 border border-resin-forest/20 rounded-lg focus:outline-none focus:border-resin-forest focus:ring-2 focus:ring-resin-forest/20 resize-none"
                            disabled={isCreatingGroup}
                        ></textarea>
                    </div>

                    <div class="flex gap-3">
                        <button
                            onclick={() => {
                                showCreateGroupForm = false;
                                groupFormError = '';
                                groupFormData = { name: '', description: '' };
                            }}
                            class="flex-1 px-4 py-2 border border-resin-forest/20 text-resin-charcoal rounded-lg font-semibold hover:bg-resin-forest/5 transition-all"
                            disabled={isCreatingGroup}
                        >
                            Cancel
                        </button>
                        <button
                            onclick={handleCreateGroup}
                            class="flex-1 px-4 py-2 bg-resin-forest text-white rounded-lg font-semibold hover:bg-resin-forest/90 transition-all disabled:opacity-50"
                            disabled={isCreatingGroup || !groupFormData.name.trim()}
                        >
                            {isCreatingGroup ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        {#if groups.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each groups.slice(0, 3) as group (group.id)}
                    <a
                        href="/groups/{group.id}"
                        class="glass-card rounded-2xl p-6 border border-resin-forest/10 hover:border-resin-forest/30 transition-all group/card"
                    >
                        <div class="mb-4">
                            <h3 class="font-bold text-resin-charcoal group-hover/card:text-resin-forest transition-colors">
                                {group.name}
                            </h3>
                            <p class="text-xs text-resin-earth/60 mt-1">
                                {group.userRole}
                            </p>
                        </div>

                        {#if group.description}
                            <p class="text-xs text-resin-earth/70 leading-relaxed mb-4 line-clamp-2">
                                {group.description}
                            </p>
                        {/if}

                        <div class="flex items-center justify-between text-xs text-resin-earth/50">
                            <span>Joined {new Date(group.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span class="text-resin-forest font-bold">→</span>
                        </div>
                    </a>
                {/each}
            </div>
        {:else}
            <div class="text-center py-12 px-6 bg-gradient-to-br from-resin-forest/5 to-transparent rounded-2xl border border-resin-forest/10">
                <Users class="w-12 h-12 text-resin-forest/30 mx-auto mb-4" />
                <p class="text-resin-charcoal font-semibold mb-2">No groups yet</p>
                <p class="text-sm text-resin-earth/60 mb-4">Create one or ask a friend to invite you</p>
                <button
                    onclick={() => (showCreateGroupForm = true)}
                    class="px-4 py-2 bg-resin-forest text-white rounded-lg text-sm font-semibold hover:bg-resin-forest/80 transition-all"
                >
                    Create Your First Group
                </button>
            </div>
        {/if}
    </section>

    <!-- Active Sessions -->
    {#if activeSessions.length > 0}
        <section class="mb-12" transition:fade>
            <h2 class="text-2xl font-bold text-resin-charcoal mb-6 flex items-center gap-3">
                <Circle class="w-6 h-6 text-resin-amber fill-current" />
                Active Now ({activeSessions.length})
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each activeSessions as session (session.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-amber/30 bg-resin-amber/5" transition:slide>
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <h3 class="font-bold text-resin-charcoal">{session.title}</h3>
                                <p class="text-xs text-resin-earth/60 mt-1">
                                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                </p>
                                <div class="mt-2">
                                    {#if session.device_scheduled === true}
                                        <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-400/10 border border-green-400/20 text-green-700">
                                            ✓ Synced to device
                                        </span>
                                    {:else if deviceCount === 0}
                                        <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-400/10 border border-gray-400/20 text-gray-600">
                                            ⚠ No device connected
                                        </span>
                                    {:else}
                                        <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber animate-pulse">
                                            ⟳ Pending device sync
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            <div class="w-3 h-3 rounded-full bg-resin-amber animate-pulse flex-shrink-0"></div>
                        </div>

                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs mb-2">
                                <span class="text-resin-earth/60">Progress</span>
                                <span class="font-bold text-resin-charcoal">
                                    {Math.round((new Date().getTime() - new Date(session.start_time).getTime()) / (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) * 100)}%
                                </span>
                            </div>
                            <div class="h-2 bg-resin-earth/10 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-resin-amber transition-all"
                                    style="width: {Math.round((new Date().getTime() - new Date(session.start_time).getTime()) / (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) * 100)}%"
                                ></div>
                            </div>
                        </div>

                        <form method="POST" action="?/cancelSession" use:enhance>
                            <input type="hidden" name="sessionId" value={session.id} />
                            <button
                                type="submit"
                                class="w-full text-xs font-bold text-resin-amber hover:text-red-500 transition-colors py-2"
                            >
                                End Session Early
                            </button>
                        </form>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Scheduled Sessions -->
    <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <Calendar class="w-6 h-6 text-resin-forest" />
                Scheduled Sessions
            </h2>
            <button
                onclick={() => showScheduleForm = !showScheduleForm}
                class="px-4 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all"
            >
                + Schedule
            </button>
        </div>

        {#if showScheduleForm}
            <form
                method="POST"
                action="?/scheduleSession"
                use:enhance
                class="glass-card rounded-2xl p-6 mb-6 border border-resin-forest/20 bg-resin-forest/5"
                transition:slide
            >
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                            What are you focusing on?
                        </label>
                        <input
                            type="text"
                            name="title"
                            bind:value={scheduleTitle}
                            placeholder="e.g., Deep Work Session"
                            required
                            class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                name="date"
                                bind:value={scheduleDate}
                                required
                                class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                name="time"
                                bind:value={scheduleTime}
                                required
                                class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-3">
                            Duration: {scheduleDuration} minutes
                        </label>
                        <input
                            type="range"
                            name="duration"
                            bind:value={scheduleDuration}
                            min="15"
                            max="480"
                            step="15"
                            class="w-full"
                        />
                        <div class="flex justify-between text-xs text-resin-earth/60 mt-2">
                            <span>15 min</span>
                            <span>8 hours</span>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!scheduleTitle.trim()}
                            class="flex-1 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all disabled:opacity-50"
                        >
                            Schedule Session
                        </button>
                        <button
                            type="button"
                            onclick={() => showScheduleForm = false}
                            class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        {/if}

        {#if scheduledSessions.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each scheduledSessions as session (session.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-forest/20" transition:slide>
                        {#if editingSessionId === session.id}
                            <form
                                method="POST"
                                action="?/updateSession"
                                use:enhance={() => {
                                    return async ({ result }) => {
                                        if (result.type === 'success') {
                                            cancelEditingSession();
                                        }
                                    };
                                }}
                                class="space-y-4"
                            >
                                <input type="hidden" name="sessionId" value={session.id} />

                                <div>
                                    <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        bind:value={editSessionData[session.id].title}
                                        required
                                        class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-3 py-2 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                                    />
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            bind:value={editSessionData[session.id].date}
                                            required
                                            class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-3 py-2 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            name="time"
                                            bind:value={editSessionData[session.id].time}
                                            required
                                            class="w-full bg-white/70 border border-resin-forest/10 rounded-lg px-3 py-2 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-forest/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                        Duration: {editSessionData[session.id].duration} min
                                    </label>
                                    <input
                                        type="range"
                                        name="duration"
                                        bind:value={editSessionData[session.id].duration}
                                        min="15"
                                        max="480"
                                        step="15"
                                        class="w-full"
                                    />
                                </div>

                                <div class="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        class="flex-1 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onclick={cancelEditingSession}
                                        class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        {:else}
                            <h3 class="font-bold text-resin-charcoal mb-1">{session.title}</h3>
                            <p class="text-xs text-resin-earth/60 mb-2">
                                {formatDateTime(session.start_time)} • {session.duration_minutes || Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)} min
                            </p>
                            <div class="mb-4">
                                {#if session.device_scheduled === true}
                                    <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-400/10 border border-green-400/20 text-green-700">
                                        ✓ Synced to device
                                    </span>
                                {:else if deviceCount === 0}
                                    <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-400/10 border border-gray-400/20 text-gray-600">
                                        ⚠ No device connected
                                    </span>
                                {:else}
                                    <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber animate-pulse">
                                        ⟳ Pending device sync
                                    </span>
                                {/if}
                            </div>

                            {#if recurringSessionId === session.id}
                                <form
                                    method="POST"
                                    action="?/makeRecurring"
                                    use:enhance={() => {
                                        return async ({ result }) => {
                                            if (result.type === 'success') {
                                                recurringSessionId = null;
                                                recurringDays = {
                                                    'Mon': false,
                                                    'Tue': false,
                                                    'Wed': false,
                                                    'Thu': false,
                                                    'Fri': false,
                                                    'Sat': false,
                                                    'Sun': false,
                                                };
                                            }
                                        };
                                    }}
                                    class="space-y-3 mb-4"
                                >
                                    <input type="hidden" name="sessionId" value={session.id} />
                                    <input type="hidden" name="daysOfWeek" value={Object.entries(recurringDays).filter(([_, checked]) => checked).map(([day]) => day).join(',')} />
                                    <div>
                                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                            Repeat On
                                        </label>
                                        <div class="flex flex-wrap gap-2">
                                            {#each dayOfWeekAbbr as day}
                                                <button
                                                    type="button"
                                                    onclick={() => recurringDays[day] = !recurringDays[day]}
                                                    class="px-3 py-1 rounded-lg text-xs font-bold transition-all {recurringDays[day]
                                                        ? 'bg-resin-forest text-white'
                                                        : 'bg-resin-earth/10 text-resin-earth hover:bg-resin-earth/20'}"
                                                >
                                                    {day}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={Object.values(recurringDays).every(v => !v)}
                                            class="flex-1 py-2 bg-resin-forest text-white rounded-lg text-xs font-bold hover:bg-resin-forest/80 transition-all disabled:opacity-50"
                                        >
                                            Create Routine
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => recurringSessionId = null}
                                            class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            {/if}

                            <div class="flex gap-2 {recurringSessionId === session.id ? 'opacity-50 pointer-events-none' : ''}">
                                <button
                                    type="button"
                                    onclick={() => {
                                        if (recurringSessionId === session.id) {
                                            recurringSessionId = null;
                                        } else {
                                            recurringSessionId = session.id;
                                            recurringDays = {
                                                'Mon': false,
                                                'Tue': false,
                                                'Wed': false,
                                                'Thu': false,
                                                'Fri': false,
                                                'Sat': false,
                                                'Sun': false,
                                            };
                                        }
                                    }}
                                    class="flex-1 text-xs font-bold text-resin-amber hover:text-resin-amber/80 transition-colors"
                                >
                                    ↻ Make Recurring
                                </button>

                                <button
                                    type="button"
                                    onclick={() => startEditingSession(session)}
                                    class="flex-1 text-xs font-bold text-resin-forest hover:text-resin-forest/80 transition-colors"
                                >
                                    Edit
                                </button>

                                <form method="POST" action="?/cancelSession" use:enhance class="flex-1">
                                    <input type="hidden" name="sessionId" value={session.id} />
                                    <button
                                        type="submit"
                                        class="w-full text-xs font-bold text-resin-earth/60 hover:text-red-500 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </form>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else if !showScheduleForm}
            <p class="text-resin-earth/60 text-sm">No scheduled sessions yet.</p>
        {/if}
    </section>

    <!-- Focus with Friends -->
    <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <Users class="w-6 h-6 text-resin-amber" />
                Focus with Friends
            </h2>
            {#if friends.length > 0}
                <button
                    onclick={() => showInviteForm = !showInviteForm}
                    class="px-4 py-2 bg-resin-amber text-white rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all"
                >
                    + Invite Friend
                </button>
            {/if}
        </div>

        {#if friends.length === 0}
            <div class="glass-card rounded-2xl p-8 text-center border border-resin-forest/20">
                <p class="text-resin-earth/60 mb-2">You don't have any friends yet!</p>
                <a href="/friends" class="text-xs font-bold text-resin-amber hover:text-resin-amber/80 transition-colors">
                    Add friends →
                </a>
            </div>
        {:else}
            {#if showInviteForm}
                <form
                    method="POST"
                    action="?/inviteFriendToFocus"
                    use:enhance
                    class="glass-card rounded-2xl p-6 mb-6 border border-resin-amber/20 bg-resin-amber/5"
                    transition:slide
                >
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Invite Friend
                            </label>
                            <select
                                name="collaboratorId"
                                bind:value={inviteCollaboratorId}
                                required
                                class="w-full bg-white/70 border border-resin-amber/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-amber/30 transition-all"
                            >
                                <option value="">Select a friend...</option>
                                {#each friends as friend}
                                    <option value={friend.id}>{friend.email}</option>
                                {/each}
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Focus Title
                            </label>
                            <input
                                type="text"
                                name="title"
                                bind:value={inviteTitle}
                                placeholder="e.g., Deep Work Session"
                                required
                                class="w-full bg-white/70 border border-resin-amber/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-amber/30 transition-all"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    bind:value={inviteDate}
                                    required
                                    class="w-full bg-white/70 border border-resin-amber/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-amber/30 transition-all"
                                />
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    name="time"
                                    bind:value={inviteTime}
                                    required
                                    class="w-full bg-white/70 border border-resin-amber/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-amber/30 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-3">
                                Duration: {inviteDuration} minutes
                            </label>
                            <input
                                type="range"
                                name="duration"
                                bind:value={inviteDuration}
                                min="15"
                                max="480"
                                step="15"
                                class="w-full"
                            />
                            <div class="flex justify-between text-xs text-resin-earth/60 mt-2">
                                <span>15 min</span>
                                <span>8 hours</span>
                            </div>
                        </div>

                        <div class="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={!inviteCollaboratorId || !inviteTitle.trim()}
                                class="flex-1 py-2 bg-resin-amber text-white rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all disabled:opacity-50"
                            >
                                Send Invite
                            </button>
                            <button
                                type="button"
                                onclick={() => showInviteForm = false}
                                class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            {/if}

            {#if sharedSessions.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each sharedSessions as session (session.id)}
                        <div class="glass-card rounded-2xl p-6 border border-resin-amber/20" transition:slide>
                            <div class="flex items-start justify-between mb-3">
                                <div>
                                    <h3 class="font-bold text-resin-charcoal flex items-center gap-2">
                                        <Users class="w-4 h-4 text-resin-amber" />
                                        {session.title}
                                    </h3>
                                    <p class="text-xs text-resin-earth/60 mt-1">
                                        {formatDateTime(session.start_time)} • {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000)} min
                                    </p>
                                </div>
                            </div>

                            {#if session.status === 'pending' && session.collaborator_id === data.session?.user.id}
                                <div class="flex gap-2 mb-3">
                                    <form method="POST" action="?/acceptSharedFocus" use:enhance class="flex-1">
                                        <input type="hidden" name="sharedSessionId" value={session.id} />
                                        <button type="submit" class="w-full py-2 bg-resin-amber text-white rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all">
                                            Accept
                                        </button>
                                    </form>
                                    <form method="POST" action="?/declineSharedFocus" use:enhance class="flex-1">
                                        <input type="hidden" name="sharedSessionId" value={session.id} />
                                        <button type="submit" class="w-full py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all">
                                            Decline
                                        </button>
                                    </form>
                                </div>
                            {:else if session.status === 'pending'}
                                <p class="text-xs text-resin-earth/60 mb-3 italic">Awaiting response...</p>
                            {/if}

                            {#if session.status === 'scheduled'}
                                <div class="flex gap-2 mb-3">
                                    <form method="POST" action="?/completeSharedFocus" use:enhance class="flex-1">
                                        <input type="hidden" name="sharedSessionId" value={session.id} />
                                        <button type="submit" class="w-full py-2 bg-resin-amber text-white rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all">
                                            Mark Complete
                                        </button>
                                    </form>
                                    <form method="POST" action="?/cancelSharedFocus" use:enhance class="flex-1">
                                        <input type="hidden" name="sharedSessionId" value={session.id} />
                                        <button type="submit" class="w-full py-2 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                                            Cancel
                                        </button>
                                    </form>
                                </div>
                            {:else if session.status === 'completed'}
                                <div class="p-3 rounded-lg bg-resin-amber/10 border border-resin-amber/30">
                                    <p class="text-xs font-bold text-resin-amber">✓ Completed! Both earned +5 stones</p>
                                </div>
                            {:else if session.status === 'canceled'}
                                <div class="p-3 rounded-lg bg-resin-earth/5 border border-resin-earth/20">
                                    <p class="text-xs text-resin-earth/60">Session canceled</p>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else if !showInviteForm}
                <p class="text-resin-earth/60 text-sm">No shared sessions yet. Invite a friend to focus together!</p>
            {/if}
        {/if}
    </section>

    <!-- Automations -->
    <section>
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-resin-charcoal flex items-center gap-3">
                <Clock class="w-6 h-6 text-resin-lavender" />
                Automations & Recurring
            </h2>
            <button
                onclick={() => showAutomationForm = !showAutomationForm}
                class="px-4 py-2 bg-resin-lavender text-white rounded-lg text-xs font-bold hover:bg-resin-lavender/80 transition-all"
            >
                + Create
            </button>
        </div>

        {#if showAutomationForm}
            <form
                method="POST"
                action="?/createAutomation"
                use:enhance
                class="glass-card rounded-2xl p-6 mb-6 border border-resin-lavender/20 bg-resin-lavender/5"
                transition:slide
            >
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-2">
                            Automation Name
                        </label>
                        <input
                            type="text"
                            name="title"
                            bind:value={automationTitle}
                            placeholder="e.g., Morning Focus Block"
                            required
                            class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-resin-charcoal mb-3">
                            Repeats On
                        </label>
                        <div class="flex flex-wrap gap-2">
                            {#each daysOfWeek as day}
                                <button
                                    type="button"
                                    onclick={() => toggleDayOfWeek(day)}
                                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {automationDaysOfWeek.includes(day)
                                        ? 'bg-resin-lavender text-white'
                                        : 'bg-resin-earth/10 text-resin-earth hover:bg-resin-earth/20'}"
                                >
                                    {day.slice(0, 3)}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                name="time"
                                bind:value={automationTime}
                                required
                                class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-resin-charcoal mb-2">
                                Duration (min)
                            </label>
                            <input
                                type="number"
                                name="duration"
                                bind:value={automationDuration}
                                min="15"
                                max="480"
                                required
                                class="w-full bg-white/70 border border-resin-lavender/10 rounded-lg px-4 py-3 text-sm text-resin-charcoal focus:outline-none focus:ring-2 focus:ring-resin-lavender/30 transition-all"
                            />
                        </div>
                    </div>

                    <input type="hidden" name="daysOfWeek" value={automationDaysOfWeek.join(',')} />

                    <div class="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={!automationTitle.trim() || automationDaysOfWeek.length === 0}
                            class="flex-1 py-2 bg-resin-lavender text-white rounded-lg text-xs font-bold hover:bg-resin-lavender/80 transition-all disabled:opacity-50"
                        >
                            Create Automation
                        </button>
                        <button
                            type="button"
                            onclick={() => showAutomationForm = false}
                            class="flex-1 py-2 bg-resin-earth/10 text-resin-earth rounded-lg text-xs font-bold hover:bg-resin-earth/20 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        {/if}

        {#if data.automations && data.automations.length > 0}
            <div class="space-y-3">
                {#each data.automations as automation (automation.id)}
                    <div class="glass-card rounded-2xl p-6 border border-resin-lavender/20" transition:slide>
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="font-bold text-resin-charcoal">{automation.title}</h3>
                            <form method="POST" action="?/deleteAutomation" use:enhance>
                                <input type="hidden" name="automationId" value={automation.id} />
                                <button
                                    type="submit"
                                    class="text-resin-earth/60 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                        <p class="text-xs text-resin-earth/60">
                            {automation.days_of_week.split(',').join(', ')} at {automation.time} • {automation.duration_minutes} min
                        </p>
                    </div>
                {/each}
            </div>
        {:else if !showAutomationForm}
            <p class="text-resin-earth/60 text-sm">No automations yet. Create one to block distractions on a schedule.</p>
        {/if}
    </section>
</main>

<style>
</style>
