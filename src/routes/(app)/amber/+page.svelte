<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createClient } from '$lib/supabase/client';
  import type { AmberSession, AmberTask } from '$lib/types';
  import type { PageData } from './$types';
  import { format, formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';

  export let data: PageData;

  const supabase = createClient();

  let sessions: AmberSession[] = data.sessions ?? [];
  let selectedId: string | null = null;
  let searchQuery = '';
  let channel: ReturnType<typeof supabase.channel> | null = null;

  $: filteredSessions = searchQuery
    ? sessions.filter((s) =>
        (s.display_title ?? s.raw_text).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  $: selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function selectSession(session: AmberSession) {
    selectedId = session.id;
  }

  function sessionTitle(s: AmberSession) {
    return s.display_title || s.raw_text.split('\n')[0] || 'Untitled Plan';
  }

  function formatTime(iso: string | null) {
    if (!iso) return '—';
    try { return format(parseISO(iso), 'h:mm a'); } catch { return '—'; }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '';
    try { return format(parseISO(iso), 'MMM d'); } catch { return ''; }
  }

  function taskDuration(task: AmberTask) {
    if (task.start_time && task.end_time) {
      try {
        const mins = differenceInMinutes(parseISO(task.end_time), parseISO(task.start_time));
        return mins >= 60
          ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + 'm' : ''}`
          : `${mins}m`;
      } catch { /* fall through */ }
    }
    return task.estimated_minutes ? `${task.estimated_minutes}m` : null;
  }

  function statusColor(status: string) {
    if (status === 'accepted') return 'text-resin-green bg-resin-green/10';
    if (status === 'rejected') return 'text-red-500 bg-red-50';
    return 'text-resin-brown bg-resin-bg-3';
  }

  onMount(() => {
    if (!data.userId) return;

    // Select the first session by default
    if (sessions.length > 0) selectedId = sessions[0].id;

    channel = supabase
      .channel('amber_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'amber_sessions', filter: `user_id=eq.${data.userId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch with tasks
            const { data: full } = await supabase
              .from('amber_sessions')
              .select('*, amber_tasks(*)')
              .eq('id', payload.new.id)
              .single();
            if (full) sessions = [full, ...sessions];
          } else if (payload.eventType === 'UPDATE') {
            sessions = sessions.map((s) =>
              s.id === payload.new.id ? { ...s, ...payload.new } : s
            );
          } else if (payload.eventType === 'DELETE') {
            sessions = sessions.filter((s) => s.id !== (payload.old as { id: string }).id);
            if (selectedId === (payload.old as { id: string }).id) {
              selectedId = sessions[0]?.id ?? null;
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'amber_tasks' },
        (payload) => {
          // Update tasks within the relevant session
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as AmberTask;
            sessions = sessions.map((s) =>
              s.id === newTask.session_id
                ? {
                    ...s,
                    amber_tasks: [...(s.amber_tasks ?? []), newTask].sort(
                      (a, b) => a.sequence_order - b.sequence_order
                    )
                  }
                : s
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AmberTask;
            sessions = sessions.map((s) =>
              s.id === updated.session_id
                ? {
                    ...s,
                    amber_tasks: (s.amber_tasks ?? []).map((t) =>
                      t.id === updated.id ? updated : t
                    )
                  }
                : s
            );
          }
        }
      )
      .subscribe();
  });

  onDestroy(() => {
    if (channel) supabase.removeChannel(channel);
  });
</script>

<svelte:head>
  <title>Plans — Resin</title>
</svelte:head>

<div class="flex flex-1 overflow-hidden">

  <!-- Session list panel -->
  <aside class="w-64 flex flex-col border-r border-resin-bg-3 bg-resin-bg-2 flex-shrink-0 overflow-hidden">
    <div class="px-3 pt-3 pb-2 border-b border-resin-bg-3">
      <span class="text-xs font-semibold text-resin-brown uppercase tracking-wider block mb-2">Plans</span>
      <input
        type="text"
        placeholder="Search plans…"
        bind:value={searchQuery}
        class="input-resin text-xs py-1.5"
      />
    </div>

    <ul class="flex-1 overflow-y-auto py-1 px-1">
      {#if filteredSessions.length === 0}
        <li class="px-3 py-4 text-center text-xs text-resin-gray">
          {searchQuery ? 'No plans match' : 'No plans yet — create one in the iOS app'}
        </li>
      {:else}
        {#each filteredSessions as session (session.id)}
          <li>
            <button
              class="note-row w-full text-left {selectedId === session.id ? 'active' : ''}"
              on:click={() => selectSession(session)}
            >
              <span class="text-sm font-semibold text-resin-charcoal truncate block leading-snug">
                {sessionTitle(session)}
              </span>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-resin-gray">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </span>
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize
                             {statusColor(session.status)}">
                  {session.status ?? 'pending'}
                </span>
              </div>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  </aside>

  <!-- Session detail panel -->
  <main class="flex flex-col flex-1 overflow-hidden">
    {#if selectedSession}
      <!-- Header -->
      <div class="px-6 py-4 border-b border-resin-bg-3 flex-shrink-0">
        <h1 class="text-xl font-bold text-resin-charcoal leading-tight">
          {sessionTitle(selectedSession)}
        </h1>
        <div class="flex items-center gap-3 mt-1.5">
          <span class="text-xs text-resin-gray">
            {format(new Date(selectedSession.created_at), 'MMMM d, yyyy · h:mm a')}
          </span>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full capitalize
                       {statusColor(selectedSession.status)}">
            {selectedSession.status ?? 'pending'}
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-5">
        <!-- Original brain dump -->
        {#if selectedSession.raw_text}
          <div class="mb-6 p-4 bg-resin-bg-2 rounded-xl border border-resin-bg-3">
            <p class="text-[10px] font-semibold text-resin-gray uppercase tracking-wider mb-2">Brain Dump</p>
            <p class="text-sm text-resin-brown whitespace-pre-wrap leading-relaxed">
              {selectedSession.raw_text}
            </p>
          </div>
        {/if}

        <!-- Tasks timeline -->
        {#if selectedSession.amber_tasks && selectedSession.amber_tasks.length > 0}
          <p class="text-[10px] font-semibold text-resin-gray uppercase tracking-wider mb-3">
            Tasks ({selectedSession.amber_tasks.length})
          </p>

          <div class="flex flex-col gap-3">
            {#each selectedSession.amber_tasks as task, i (task.id)}
              <div class="relative flex gap-4">
                <!-- Timeline line -->
                {#if i < (selectedSession.amber_tasks?.length ?? 0) - 1}
                  <div class="absolute left-[19px] top-10 bottom-0 w-px bg-resin-bg-3 -mb-3"></div>
                {/if}

                <!-- Sequence number -->
                <div class="w-10 h-10 rounded-full bg-resin-amber/10 border border-resin-amber/20
                            flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span class="text-sm font-bold text-resin-amber">{task.sequence_order}</span>
                </div>

                <!-- Task card -->
                <div class="flex-1 bg-white rounded-xl border border-resin-bg-3 p-4 shadow-warm">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-semibold text-resin-charcoal text-sm leading-snug">{task.title}</h3>
                    {#if taskDuration(task)}
                      <span class="text-[10px] font-medium text-resin-amber bg-resin-amber/10
                                   px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        {taskDuration(task)}
                      </span>
                    {/if}
                  </div>

                  {#if task.description}
                    <p class="text-xs text-resin-brown mt-1.5 leading-relaxed">{task.description}</p>
                  {/if}

                  <!-- Time info -->
                  {#if task.start_time || task.end_time}
                    <div class="flex items-center gap-2 mt-2.5 text-xs text-resin-brown">
                      <svg class="w-3.5 h-3.5 text-resin-gray flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>
                        {#if task.start_time}
                          {formatDate(task.start_time)} · {formatTime(task.start_time)}
                          {#if task.end_time} – {formatTime(task.end_time)}{/if}
                        {/if}
                      </span>
                    </div>
                  {/if}

                  <!-- Calendar sync badge -->
                  {#if task.calendar_event_id}
                    <div class="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-resin-green">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      Synced to Calendar
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="py-8 text-center text-sm text-resin-gray">
            No tasks scheduled for this plan yet
          </div>
        {/if}
      </div>
    {:else}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
        <div class="w-14 h-14 rounded-2xl bg-resin-bg-2 flex items-center justify-center">
          <svg class="w-7 h-7 text-resin-gray" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-resin-charcoal">No plan selected</p>
          <p class="text-sm text-resin-brown mt-1">
            {sessions.length === 0
              ? 'Create plans in the Resin iOS app — they'll appear here instantly'
              : 'Choose a plan from the list'}
          </p>
        </div>
      </div>
    {/if}
  </main>

</div>
