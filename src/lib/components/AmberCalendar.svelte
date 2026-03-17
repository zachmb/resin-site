<script lang="ts">
    interface AmberSession {
        id: string;
        display_title: string;
        amber_tasks: AmberTask[];
        [key: string]: any;
    }

    interface AmberTask {
        id: string;
        title: string;
        start_time: string | null;
        end_time: string | null;
        estimated_minutes?: number;
        [key: string]: any;
    }

    let {
        sessions = [],
        onReschedule = async () => {},
        onClearDay = (day: Date) => {}
    }: {
        sessions?: AmberSession[];
        onReschedule?: (task: AmberTask, newStart: string, newEnd: string) => Promise<void>;
        onClearDay?: (day: Date) => void;
    } = $props();

    // State
    let weekOffset = $state(0);
    let dragging = $state<{ task: AmberTask; originY: number; taskStartTime: string; dragY: number; startDayIndex: number; currentDayIndex: number } | null>(null);
    let isRescheduleLoading = $state(false);

    // Derive week start/end
    const weekStart = $derived.by(() => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        monday.setDate(monday.getDate() + weekOffset * 7);
        return monday;
    });

    const weekEnd = $derived.by(() => {
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        return end;
    });

    // Get all tasks with times
    const allTasks = $derived(sessions.flatMap(s =>
        s.amber_tasks
            .filter(t => t.start_time && t.end_time)
            .map(t => ({ ...t, session: s, sessionColor: getSessionColor(s.id) }))
    ));

    // Filter tasks to current week
    const weekTasks = $derived(allTasks.filter(t => {
        const taskStart = new Date(t.start_time!);
        return taskStart >= weekStart && taskStart <= weekEnd;
    }));

    // Group by day
    function getTasksByDay(dayIndex: number) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        dayDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);

        return weekTasks.filter(t => {
            const taskStart = new Date(t.start_time!);
            return taskStart >= dayDate && taskStart < nextDay;
        });
    }

    // Get consistent color per session
    function getSessionColor(sessionId: string): string {
        const colors = [
            'rgb(255, 159, 64)',     // amber
            'rgb(75, 192, 75)',      // green
            'rgb(201, 127, 88)',     // clay/brown
            'rgb(99, 99, 122)',      // slate
            'rgb(192, 75, 192)',     // purple
            'rgb(75, 192, 192)',     // teal
            'rgb(255, 99, 99)',      // rose
        ];
        const hash = sessionId
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    // Time utilities
    function timeToOffset(timeStr: string): number {
        const date = new Date(timeStr);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const minutesSince6am = (hours - 6) * 60 + minutes;
        return (minutesSince6am / 30) * 40; // 40px per 30min slot
    }

    function offsetToTime(offsetPx: number, baseDate?: Date): Date {
        const minutesSince6am = (offsetPx / 40) * 30;
        const hours = 6 + Math.floor(minutesSince6am / 60);
        const minutes = Math.floor(minutesSince6am % 60);
        const result = new Date(baseDate || weekStart);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    function snapTo15Minutes(date: Date): Date {
        const minutes = date.getMinutes();
        const snappedMinutes = Math.round(minutes / 15) * 15;
        date.setMinutes(snappedMinutes);
        return date;
    }

    function formatTime(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function formatDateHeader(dayIndex: number): string {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getDayName(dayIndex: number): string {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    }

    // Drag handling
    function onMouseDown(task: AmberTask, dayIndex: number, e: MouseEvent) {
        dragging = {
            task,
            originY: e.clientY,
            taskStartTime: task.start_time!,
            dragY: 0,
            startDayIndex: dayIndex,
            currentDayIndex: dayIndex,
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        if (!dragging) return;
        dragging.dragY = e.clientY - dragging.originY;

        // Detect which day column the mouse is over
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const dayCol = element?.closest('.day-column') as HTMLElement | null;
        if (dayCol) {
            const dayIndexStr = dayCol.getAttribute('data-day-index');
            if (dayIndexStr !== null) {
                dragging!.currentDayIndex = parseInt(dayIndexStr, 10);
            }
        }
    }

    function onMouseUp(e: MouseEvent) {
        if (!dragging) return;

        const dragDistance = Math.abs(e.clientY - dragging.originY);

        // Only reschedule if dragged more than 10px
        if (dragDistance > 10) {
            const startDate = new Date(dragging.taskStartTime);
            const endDate = new Date(dragging.task.end_time!);
            const durationMs = endDate.getTime() - startDate.getTime();

            // Calculate which day was dragged to
            const dayDelta = dragging.currentDayIndex - dragging.startDayIndex;
            const newDayDate = new Date(startDate);
            newDayDate.setDate(newDayDate.getDate() + dayDelta);

            // Calculate snapped new start time (on the new day)
            const dragPx = e.clientY - dragging.originY;
            const taskOriginalOffset = timeToOffset(dragging.taskStartTime);
            const newOffset = taskOriginalOffset + dragPx;
            const newStartDate = offsetToTime(newOffset, newDayDate);
            const snappedStart = snapTo15Minutes(newStartDate);

            // Calculate new end time (preserve duration)
            const newEndDate = new Date(snappedStart.getTime() + durationMs);

            // Call reschedule
            handleReschedule(dragging.task, snappedStart, newEndDate);
        }

        dragging = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }

    async function handleReschedule(task: AmberTask, newStart: Date, newEnd: Date) {
        isRescheduleLoading = true;
        try {
            await onReschedule(task, newStart.toISOString(), newEnd.toISOString());
        } catch (err) {
            console.error('Reschedule failed:', err);
        } finally {
            isRescheduleLoading = false;
        }
    }

    function handleClearDay(dayIndex: number) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        onClearDay(date);
    }
</script>

<div class="calendar-container hidden-mobile">
    <!-- Header -->
    <div class="calendar-header">
        <button on:click={() => (weekOffset -= 1)} class="week-nav">← Prev</button>
        <span class="week-label">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} —
            {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <button on:click={() => (weekOffset += 1)} class="week-nav">Next →</button>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
        <!-- Time Gutter -->
        <div class="time-gutter">
            <div class="time-slot"></div>
            {#each Array.from({ length: 34 }, (_, i) => {
                const hour = 6 + Math.floor(i / 2);
                const minute = (i % 2) * 30;
                return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }) as time}
                <div class="time-label">{time}</div>
            {/each}
        </div>

        <!-- Day Columns -->
        {#each Array.from({ length: 7 }, (_, i) => i) as dayIndex}
            <div class="day-column" data-day-index={dayIndex}>
                <!-- Day Header with Clear Button -->
                <div class="day-header">
                    <div class="day-title">
                        <span class="day-name">{getDayName(dayIndex)}</span>
                        <span class="day-date">{formatDateHeader(dayIndex)}</span>
                    </div>
                    <button
                        on:click={() => handleClearDay(dayIndex)}
                        class="clear-day-btn"
                        title="Clear this day"
                    >
                        ×
                    </button>
                </div>

                <!-- Time Grid -->
                <div class="day-grid">
                    {#each Array.from({ length: 34 }, (_, i) => i) as slotIndex (slotIndex)}
                        <div class="time-slot"></div>
                    {/each}

                    <!-- Task Blocks -->
                    {#each getTasksByDay(dayIndex) as task (task.id)}
                        {@const offset = timeToOffset(task.start_time!)}
                        {@const startDate = new Date(task.start_time!)}
                        {@const endDate = new Date(task.end_time!)}
                        {@const durationMs = endDate.getTime() - startDate.getTime()}
                        {@const height = (durationMs / (30 * 60 * 1000)) * 40}
                        {@const dragOffset = dragging?.task.id === task.id ? dragging.dragY : 0}
                        <div
                            class="task-block"
                            style="
                                top: {offset + dragOffset}px;
                                height: {height}px;
                                background-color: {task.sessionColor};
                                opacity: {dragging?.task.id === task.id ? 0.7 : 1};
                                transform: {dragging?.task.id === task.id
                                    ? 'scale(1.02)'
                                    : 'scale(1)'};
                                z-index: {dragging?.task.id === task.id ? 10 : 1};
                            "
                            on:mousedown={(e) => onMouseDown(task, dayIndex, e)}
                            role="button"
                            tabindex="0"
                        >
                            <div class="task-content">
                                <div class="task-title">{task.title}</div>
                                <div class="task-time">
                                    {formatTime(task.start_time!)} - {formatTime(task.end_time!)}
                                </div>
                                {#if task.session}
                                    <div class="task-session">{task.session.display_title}</div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>

    {#if isRescheduleLoading}
        <div class="reschedule-loading">Updating schedule...</div>
    {/if}
</div>

<div class="mobile-notice">
    <p>Calendar view available on desktop</p>
</div>

<style>
    .hidden-mobile {
        display: none;
    }

    @media (min-width: 640px) {
        .hidden-mobile {
            display: block;
        }

        .mobile-notice {
            display: none;
        }
    }

    .mobile-notice {
        padding: 20px;
        text-align: center;
        color: var(--color-text-muted);
    }

    .calendar-container {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: linear-gradient(135deg, #f5f1e8 0%, #faf8f3 100%);
        border-bottom: 1px solid #e0d5c7;
    }

    .week-label {
        font-weight: 600;
        color: #4a4a4a;
    }

    .week-nav {
        padding: 6px 12px;
        background: white;
        border: 1px solid #d4c5b3;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        color: #4a4a4a;
        transition: all 0.2s;
    }

    .week-nav:hover {
        background: #f9f7f2;
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: 80px repeat(7, 1fr);
        gap: 0;
        position: relative;
        background: white;
        overflow-x: auto;
    }

    .time-gutter {
        display: flex;
        flex-direction: column;
        border-right: 1px solid #e0d5c7;
        background: #faf8f3;
        position: sticky;
        left: 0;
        z-index: 5;
    }

    .time-label {
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: #999;
        border-bottom: 1px solid #f0ede8;
        font-weight: 500;
    }

    .time-slot {
        height: 40px;
        border-bottom: 1px solid #f0ede8;
    }

    .day-column {
        display: flex;
        flex-direction: column;
        min-width: 150px;
        border-right: 1px solid #e0d5c7;
    }

    .day-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #faf8f3;
        border-bottom: 1px solid #e0d5c7;
        min-height: 60px;
    }

    .day-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .day-name {
        font-weight: 600;
        font-size: 14px;
        color: #4a4a4a;
    }

    .day-date {
        font-size: 12px;
        color: #999;
    }

    .clear-day-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        background: white;
        border: 1px solid #d4c5b3;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        color: #d9534f;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .clear-day-btn:hover {
        background: #ffe0e0;
        border-color: #d9534f;
    }

    .day-grid {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .task-block {
        position: absolute;
        left: 4px;
        right: 4px;
        border-radius: 6px;
        padding: 6px;
        color: white;
        cursor: grab;
        user-select: none;
        transition: all 0.15s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .task-block:active {
        cursor: grabbing;
    }

    .task-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        pointer-events: none;
    }

    .task-title {
        font-weight: 600;
        font-size: 12px;
        line-height: 1.2;
    }

    .task-time {
        font-size: 10px;
        opacity: 0.9;
    }

    .task-session {
        font-size: 9px;
        opacity: 0.85;
        font-style: italic;
    }

    .reschedule-loading {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        font-size: 12px;
    }
</style>
