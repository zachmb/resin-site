<script lang="ts">
    import { onMount } from "svelte";
    import { createSupabaseClient } from "$lib/db/client";
    import { Clock, Users, Play, Plus } from "lucide-svelte";

    let { groupId = "", groupName = "" } = $props<{
        groupId?: string;
        groupName?: string;
    }>();

    let sessions: any[] = $state([]);
    let participants: Record<string, any[]> = $state({});
    let showCreateForm = $state(false);
    let sessionTitle = $state("");
    let sessionDuration = $state("45");
    let sessionStartTime = $state("");
    let loading = $state(false);
    let userSessions: Record<string, boolean> = $state({});

    const supabase = createSupabaseClient();

    onMount(async () => {
        await loadSessions();
    });

    async function loadSessions() {
        if (!groupId) return;

        try {
            const { data } = await supabase
                .from("group_focus_sessions")
                .select("*")
                .eq("group_id", groupId)
                .gte("start_time", new Date().toISOString())
                .order("start_time", { ascending: true })
                .limit(10);

            if (data) {
                sessions = data;
                await loadParticipants();
            }
        } catch (error) {
            console.error("Error loading sessions:", error);
        }
    }

    async function loadParticipants() {
        for (const session of sessions) {
            try {
                const { data } = await supabase
                    .from("group_session_participants")
                    .select("user_id, profiles(email)")
                    .eq("session_id", session.id)
                    .is("left_at", null);

                if (data) {
                    participants[session.id] = data;
                }
            } catch (error) {
                console.error("Error loading participants:", error);
            }
        }
    }

    async function createSession() {
        if (!sessionTitle || !sessionStartTime || !groupId) return;

        loading = true;
        try {
            const { data: session } = await supabase
                .from("group_focus_sessions")
                .insert({
                    group_id: groupId,
                    title: sessionTitle,
                    start_time: new Date(sessionStartTime).toISOString(),
                    duration_minutes: parseInt(sessionDuration),
                    status: "scheduled"
                })
                .select()
                .single();

            if (session) {
                sessionTitle = "";
                sessionStartTime = "";
                sessionDuration = "45";
                showCreateForm = false;
                await loadSessions();
            }
        } catch (error) {
            console.error("Error creating session:", error);
        } finally {
            loading = false;
        }
    }

    async function joinSession(sessionId: string) {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            await supabase.from("group_session_participants").insert({
                session_id: sessionId,
                user_id: user.user.id
            });

            userSessions[sessionId] = true;
            await loadParticipants();
        } catch (error) {
            console.error("Error joining session:", error);
        }
    }

    async function leaveSession(sessionId: string) {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            await supabase
                .from("group_session_participants")
                .update({ left_at: new Date().toISOString() })
                .eq("session_id", sessionId)
                .eq("user_id", user.user.id);

            userSessions[sessionId] = false;
            await loadParticipants();
        } catch (error) {
            console.error("Error leaving session:", error);
        }
    }

    function formatTime(dateString: string) {
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            month: "short",
            day: "numeric"
        });
    }
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <h3 class="font-bold text-resin-charcoal flex items-center gap-2">
            <Play size={16} class="text-resin-forest" />
            Group Focus Sessions
        </h3>
        <button
            onclick={() => (showCreateForm = !showCreateForm)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-resin-forest rounded-lg hover:bg-resin-forest/90 transition-colors"
        >
            <Plus size={14} /> New Session
        </button>
    </div>

    {#if showCreateForm}
        <div class="p-4 bg-resin-forest/5 rounded-lg border border-resin-forest/20 space-y-3">
            <input
                type="text"
                placeholder="Session title (e.g., Evening Focus)"
                bind:value={sessionTitle}
                class="w-full px-3 py-2 text-sm rounded border border-resin-earth/20 focus:outline-none focus:border-resin-forest/50"
            />
            <input
                type="datetime-local"
                bind:value={sessionStartTime}
                class="w-full px-3 py-2 text-sm rounded border border-resin-earth/20 focus:outline-none focus:border-resin-forest/50"
            />
            <select
                bind:value={sessionDuration}
                class="w-full px-3 py-2 text-sm rounded border border-resin-earth/20 focus:outline-none focus:border-resin-forest/50"
            >
                <option value="25">25 minutes (Pomodoro)</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
            </select>
            <div class="flex gap-2">
                <button
                    onclick={createSession}
                    disabled={loading}
                    class="flex-1 px-3 py-2 text-xs font-bold bg-resin-forest text-white rounded hover:bg-resin-forest/90 disabled:opacity-50 transition-colors"
                >
                    {loading ? "Creating..." : "Create Session"}
                </button>
                <button
                    onclick={() => (showCreateForm = false)}
                    class="flex-1 px-3 py-2 text-xs font-bold border border-resin-earth/20 rounded hover:bg-resin-earth/5 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    {/if}

    {#if sessions.length > 0}
        <div class="space-y-2">
            {#each sessions as session (session.id)}
                <div class="p-3 bg-white/50 rounded-lg border border-resin-forest/10 hover:border-resin-forest/30 transition-colors">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-sm text-resin-charcoal">{session.title}</h4>
                            <div class="flex items-center gap-4 mt-1.5 text-xs text-resin-earth/60">
                                <span class="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatTime(session.start_time)}
                                </span>
                                <span>{session.duration_minutes}m</span>
                                <span class="flex items-center gap-1">
                                    <Users size={12} />
                                    {participants[session.id]?.length || 0} joined
                                </span>
                            </div>
                        </div>
                        <button
                            onclick={() => {
                                if (userSessions[session.id]) {
                                    leaveSession(session.id);
                                } else {
                                    joinSession(session.id);
                                }
                            }}
                            class="px-3 py-1.5 text-xs font-bold rounded transition-colors {userSessions[session.id]
                                ? 'bg-resin-earth/10 text-resin-earth/70 hover:bg-red-100 hover:text-red-600'
                                : 'bg-resin-forest text-white hover:bg-resin-forest/90'}"
                        >
                            {userSessions[session.id] ? "Leave" : "Join"}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-xs text-resin-earth/50 py-4 text-center">
            No upcoming sessions. Create one to get started! 🚀
        </p>
    {/if}
</div>
