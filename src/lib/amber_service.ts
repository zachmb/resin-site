import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
    SUPABASE_SERVICE_ROLE_KEY,
    DEEPSEEK_API_KEY,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
} from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { sendPush } from './apns';
import { syncStonesFromNotes } from './gamification_service';

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

export interface DeepSeekTask {
    type: 'action' | 'intention' | 'habit';
    display_title: string;
    ai_plan: string[];
    scheduling: { start_time: string; end_time: string; duration_minutes: number };
    blocking_active: boolean;
    requires_verification: boolean;
    session_type: 'Soft' | 'Firm';
    energy_match_score: number;
    energy_demand: 'High' | 'Medium' | 'Low';
    notification_copy: string;
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
    const { data: creds } = await admin
        .from('user_credentials')
        .select('google_refresh_token')
        .eq('id', userId)
        .single();

    if (!creds?.google_refresh_token) throw new Error('No Google refresh token stored');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: creds.google_refresh_token,
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
    return data.access_token as string;
}

export async function getFreeBusy(accessToken: string, timezone: string): Promise<string> {
    const now = new Date();
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            timeMin: now.toISOString(),
            timeMax: end.toISOString(),
            timeZone: timezone,
            items: [{ id: 'primary' }],
        }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const busy = data.calendars?.primary?.busy ?? [];
    if (busy.length === 0) return 'No busy blocks in the next 48 hours.';
    return busy.map((b: any) => `Busy: ${b.start} → ${b.end}`).join('\n');
}

export async function createCalendarEvent(
    accessToken: string,
    task: DeepSeekTask,
    title: string,
    timezone: string
): Promise<string | null> {
    const description = task.ai_plan.join('\n');

    const body = {
        summary: title,
        description,
        start: { dateTime: task.scheduling.start_time, timeZone: timezone },
        end: { dateTime: task.scheduling.end_time, timeZone: timezone },
    };
    const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );
    if (!res.ok) {
        console.error('[amber_service] Calendar event creation failed:', await res.text());
        return null;
    }
    const ev = await res.json();
    return ev.id ?? null;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );
    if (!res.ok && res.status !== 404) {
        console.error('[amber_service] Calendar event deletion failed:', await res.text());
        return false;
    }
    return true;
}

export async function listCalendarEvents(
    accessToken: string,
    timeMin: string,
    timeMax: string,
    timezone: string
): Promise<any[]> {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('timeZone', timezone);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        console.error('[amber_service] Failed to list calendar events:', await res.text());
        return [];
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary || 'Busy',
        start: item.start.dateTime || item.start.date,
        end: item.end.dateTime || item.end.date,
        allDay: !!item.start.date,
        type: 'external'
    }));
}

export async function computeUserInsights(userId: string): Promise<string> {
    try {
        // Fetch last 30 days of sessions
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: sessions, error } = await admin
            .from('amber_sessions')
            .select('id, status, created_at, amber_tasks(start_time, end_time, estimated_minutes)')
            .eq('user_id', userId)
            .gte('created_at', since);

        if (error || !sessions || sessions.length < 3) return '';

        const completed = sessions.filter((s: any) => s.status === 'completed');
        const rate = Math.round((completed.length / sessions.length) * 100);

        // Peak hour from completed tasks
        const hourBuckets: Record<number, number> = {};
        for (const s of completed) {
            for (const t of (s.amber_tasks || [])) {
                if (t.start_time) {
                    const h = new Date(t.start_time).getHours();
                    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
                }
            }
        }
        const peakHourEntry = Object.entries(hourBuckets).sort((a, b) => +b[1] - +a[1])[0];
        const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : null;

        // Accuracy from tasks with both times
        let totalEst = 0, totalActual = 0, taskCount = 0;
        for (const s of completed) {
            for (const t of (s.amber_tasks || [])) {
                if (t.start_time && t.end_time && t.estimated_minutes) {
                    const actual = Math.round((new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 60000);
                    totalEst += t.estimated_minutes;
                    totalActual += actual;
                    taskCount++;
                }
            }
        }

        const lines: string[] = [];
        lines.push(`Completion rate (last 30 days): ${rate}%`);
        if (peakHour !== null) lines.push(`Peak performance hour: ${peakHour}:00 (${peakHourEntry![1]} completed tasks)`);
        if (taskCount > 2) {
            const accuracy = Math.round((totalActual / totalEst) * 100);
            if (accuracy > 110) lines.push(`User consistently underestimates tasks by ~${accuracy - 100}% — add extra buffer time`);
            else if (accuracy < 85) lines.push(`User finishes tasks ~${100 - accuracy}% faster than estimated — tighten estimates`);
            else lines.push('User estimation accuracy is good');
        }

        // NEW: Query amber_task_feedback for behavioral insights
        const { data: recentFeedback } = await admin
            .from('amber_task_feedback')
            .select('rating, comments, created_at')
            .eq('user_id', userId)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(30);

        if (recentFeedback && recentFeedback.length > 0) {
            lines.push('\n# BEHAVIORAL INSIGHTS FROM RECENT SESSIONS');

            // 1. Mood pattern analysis
            const feelingCounts: Record<string, number> = {};
            const lastThreeFeelings: string[] = [];

            for (const fb of recentFeedback) {
                const feelingMatch = fb.comments?.match(/feeling:(\w+)/);
                if (feelingMatch) {
                    const feeling = feelingMatch[1];
                    feelingCounts[feeling] = (feelingCounts[feeling] || 0) + 1;
                    if (lastThreeFeelings.length < 3) lastThreeFeelings.push(feeling);
                }
            }

            if (Object.keys(feelingCounts).length > 0) {
                const totalWithFeeling = Object.values(feelingCounts).reduce((a, b) => a + b, 0);
                const drainedPct = Math.round(((feelingCounts['Drained'] || 0) / totalWithFeeling) * 100);

                if (drainedPct >= 40) {
                    lines.push(`⚠️ Mood pattern: User reports feeling "Drained" in ${drainedPct}% of sessions — schedule more breaks and softer sessions.`);
                }

                if (lastThreeFeelings.filter(f => f === 'Drained' || f === 'Frustrated').length === 3) {
                    lines.push(`🚨 BURNOUT SIGNAL: Last 3 sessions all reported feeling drained or frustrated. STRONGLY recommend shorter, easier sessions today.`);
                }
            }

            // 2. Average task rating
            const ratings = recentFeedback
                .map(fb => {
                    const ratingMatch = fb.comments?.match(/rating:(\d)/);
                    return ratingMatch ? parseInt(ratingMatch[1]) : fb.rating;
                })
                .filter(r => r !== undefined && r !== null) as number[];

            if (ratings.length > 0) {
                const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                if (parseFloat(avgRating) < 2.5) {
                    lines.push(`Task satisfaction is low (avg rating ${avgRating}/5). User may be overloaded — consider reducing session scope or difficulty.`);
                } else if (parseFloat(avgRating) >= 4.0) {
                    lines.push(`User is highly satisfied with recent tasks (avg rating ${avgRating}/5). Current approach is working well.`);
                }
            }

            // 3. Enjoyment patterns
            const enjoyedThings: Record<string, number> = {};
            for (const fb of recentFeedback) {
                const enjoyedMatches = fb.comments?.match(/enjoyed:([^,;]+)/g) || [];
                for (const match of enjoyedMatches) {
                    const thing = match.replace('enjoyed:', '').trim();
                    enjoyedThings[thing] = (enjoyedThings[thing] || 0) + 1;
                }
            }

            if (Object.keys(enjoyedThings).length > 0) {
                const topEnjoyments = Object.entries(enjoyedThings)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(e => e[0])
                    .join(', ');
                lines.push(`User most enjoys: ${topEnjoyments}. Prioritize these in future plans when possible.`);
            }

            // 4. Calculate 7-day success rate
            const recentSessions = sessions.filter((s: any) => {
                const createdDate = new Date(s.created_at);
                return createdDate.getTime() > Date.now() - 7 * 86400000;
            });
            if (recentSessions.length > 0) {
                const recentCompleted = recentSessions.filter((s: any) => s.status === 'completed').length;
                const recentRate = Math.round((recentCompleted / recentSessions.length) * 100);
                if (recentRate < 60 && recentRate < rate) {
                    lines.push(`Recent dip: 7-day completion rate is ${recentRate}% (vs. 30-day ${rate}%). Consider lightening load.`);
                }
            }
        }

        return lines.join('\n');
    } catch (err) {
        console.error('Error computing user insights:', err);
        return '';
    }
}

export async function callDeepSeek(
    rawText: string,
    freeBusy: string,
    intensity: number,
    startHour: number,
    endHour: number,
    timezone: string,
    userPreferences: string,
    focusSuccessRate: number = 0.5
): Promise<DeepSeekTask> {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour12: false });
    const pctLabel = Math.round(intensity * 100);

    const prefsAppend = userPreferences.trim()
        ? `\n\n# BEHAVIORAL INSIGHTS (from recent sessions)\n${userPreferences.trim()}`
        : '';

    const energyProfileSection = `\n\n# USER AVAILABILITY & FOCUS PROFILE
Preferred Work Hours: ${startHour}:00 - ${endHour}:00
Recent Focus Success Rate: ${Math.round(focusSuccessRate * 100)}%`;

    const systemPrompt = `# MISSION
You are the Lead Mentor of RESIN, a sophisticated productivity ecosystem. Your objective is not just to schedule tasks, but to architect a user's life according to their biology, true intent, and long-term well-being. You translate chaotic human thoughts into a prioritized, energy-aware "Amber Plan."

# OPERATIONAL PRINCIPLES
1. INTUITIVE INTENT EXTRACTION (Chain-of-Thought):
   - Anchor on Commitments: First, identify fixed deadlines, meetings, and hard constraints.
   - Disambiguate Intent: Distinguish between "aspirational dreams" and "urgent needs." Predict objective success criteria.
   - Dialogue-Ready: If vital information is missing, flag it in the notification copy.
2. ENERGY-AWARE TAGGING & AVAILABILITY ALIGNMENT:
   - High-concentration tasks (coding, writing, planning) MUST be slotted within the availability window.
   - The "Off-Hours" Protocol: Routine work (admin, email) should be deferred when possible.
   - Availability Window (${startHour}:00 - ${endHour}:00): Schedule demanding tasks only within this window.
3. EMPATHETIC PACING & BURNOUT PREVENTION:
   - Dynamic Intensity: Bias toward "Soft" sessions if recent success <70%. Bias toward "Firm" for deep work if success ≥80%.
   - The Guilt-Free Buffer: Ensure plans include non-negotiable breaks between heavy tasks.
   - Recent Success Rate \${Math.round(focusSuccessRate * 100)}%: If low, reduce scope and expectations. If high, can push harder.
4. RECURSIVE REFINEMENT:
   - Memory Management: Use past reflections to avoid repeating failure patterns.
   - Learn from what worked: User most enjoys [extracted from feedback]. Prioritize these when possible.

# TASK BREAKDOWN QUALITY STANDARDS
Steps should be:
- **Granular**: Each step is 2-15 minutes of focused work, not vague directions
- **Concrete**: Use specific verbs (write 500 words, complete 3 exercises, design wireframe for login) not "work on"
- **Sequential**: Steps build on each other logically
- **Breakpoint-aware**: Add natural pauses where user can check, stretch, hydrate
- Example GOOD plan for "Write proposal":
  ["Outline 3 sections (5m)", "Draft executive summary (15m)", "Flesh out each section (30m)", "Proofread & format (10m)"]
- Example BAD plan: ["Work on proposal", "Keep going"]

# SCHEDULING OPTIMIZATION
- Always respect FREE/BUSY calendar (don't schedule during existing events)
- Schedule all tasks within the availability window (${startHour}:00 - ${endHour}:00)
- Add 5-minute buffer after each task for context switching
- For ${Math.round(intensity * 100)}% intensity: longer, deeper work is appropriate. Don't fragment.
- If task must happen outside availability window, ask user for permission via notification_copy.

# OUTPUT CONTRACT (STRICT JSON ONLY)
{
  "type": "action" | "intention" | "habit",
  "display_title": "Punchy, specific title (not generic 'Work on X')",
  "ai_plan": [
    "Step 1: Concrete action, 5-15 min",
    "Step 2: Next concrete action, 10-20 min",
    "Step 3: Final push or polish, 5-10 min"
  ],
  "scheduling": {
    "start_time": "ISO8601 (respect calendar and availability window ${startHour}:00-${endHour}:00)",
    "end_time": "ISO8601 (realistic: sum of step times + buffers)",
    "duration_minutes": number (total, including micro-breaks)
  },
  "blocking_active": boolean (true for High/Medium energy, false for Low/Soft),
  "requires_verification": boolean (true if completion needs photo/proof),
  "session_type": "Soft" | "Firm" (Soft if success<70% OR user is drained, Firm if success≥80%),
  "energy_match_score": 0.0-1.0 (1.0 = perfect chronotype + calendar fit, 0.5 = acceptable compromise),
  "energy_demand": "High" | "Medium" | "Low" (based on task type and user's recent success rate),
  "notification_copy": "Empathetic nudge that frames *why* this session matters to user's bigger goals."
}

# CRITICAL QUALITY GATES
✓ MUST: Each step is specific, actionable, timed (2-15 min)
✓ MUST: Start time respects calendar (no overlap with busy blocks)
✓ MUST: Session type + energy_demand align (High energy → Firm, not Soft)
✓ MUST: notification_copy references user's goal or enjoyment pattern if known
✓ MUST: Duration is realistic (sum of steps + 2-min buffers between them)
✗ AVOID: Generic titles like "Code" or "Study" — be specific
✗ AVOID: Vague steps like "Keep working" or "Continue from before"
✗ AVOID: Scheduling during user's lull hours (opposite of ${chronotype} peak)

# CALENDAR ANALYSIS
PREFERRED WINDOW: ${startHour}:00–${endHour}:00
CURRENT TIME: ${now} (timezone: ${timezone})
FREE/BUSY:
${freeBusy}${prefsAppend}${energyProfileSection}`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: rawText },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
        }),
    });

    if (!res.ok) throw new Error(`DeepSeek error: ${await res.text()}`);
    const completion = await res.json();
    return JSON.parse(completion.choices?.[0]?.message?.content ?? '{}') as DeepSeekTask;
}

export async function runActivationPipeline(userId: string, sessionId: string, rawText: string, options: any = {}) {
    const {
        intensity = 0.5,
        start_hour = 16,
        end_hour = 22,
        user_preferences = '',
        timezone = 'UTC'
    } = options;

    // 1. Mark session as processing
    await admin.from('amber_sessions').update({ status: 'processing' }).eq('id', sessionId).eq('user_id', userId);

    try {
        // 2. Refresh Google tokens
        const gToken = await getGoogleAccessToken(userId);
        const freeBusy = await getFreeBusy(gToken, timezone);

        // 2.5. Compute learned insights from past sessions
        const learnedInsights = await computeUserInsights(userId);
        const enrichedPreferences = [learnedInsights, user_preferences].filter(Boolean).join('\n\n');

        // 2.7. Fetch user profile for availability schedule and success rate
        const { data: profile } = await admin
            .from('profiles')
            .select('availability_schedule')
            .eq('id', userId)
            .single();

        // Get day-specific availability for today
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
        const availSchedule = profile?.availability_schedule as any[] || null;
        let dayStartHour = start_hour;
        let dayEndHour = end_hour;

        if (availSchedule && Array.isArray(availSchedule) && availSchedule[dayOfWeek]) {
            dayStartHour = availSchedule[dayOfWeek].start || start_hour;
            dayEndHour = availSchedule[dayOfWeek].end || end_hour;
        }

        // Calculate 7-day focus success rate
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: recentSessions } = await admin
            .from('amber_sessions')
            .select('status')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo);

        const completedCount = (recentSessions || []).filter((s: any) => s.status === 'completed').length;
        const focusSuccessRate = recentSessions && recentSessions.length > 0
            ? completedCount / recentSessions.length
            : 0.5;

        // 3. Call DeepSeek with enhanced user context
        const plan = await callDeepSeek(rawText, freeBusy, intensity, dayStartHour, dayEndHour, timezone, enrichedPreferences, focusSuccessRate);

        // 4. Calendar event
        const calEventId = await createCalendarEvent(gToken, plan, plan.display_title, timezone);

        // 5. Update amber_session
        await admin.from('amber_sessions').upsert({
            id: sessionId,
            user_id: userId,
            raw_text: rawText,
            display_title: plan.display_title,
            status: 'scheduled',
            intensity: intensity.toFixed(2),
        });

        // 6. Tasks
        const taskRow = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            title: plan.display_title,
            description: plan.ai_plan.join('\n'),
            estimated_minutes: plan.scheduling.duration_minutes,
            sequence_order: 1,
            start_time: plan.scheduling.start_time,
            end_time: plan.scheduling.end_time,
            calendar_event_id: calEventId,
            requires_focus: plan.blocking_active,
            requires_camera_verification: plan.requires_verification,
        };
        await admin.from('amber_tasks').upsert(taskRow);

        // 6.5. Sync stones based on note count (1 note = 1 stone)
        await syncStonesFromNotes(userId);

        // 7. Push Notifications
        const { data: tokens } = await admin.from('device_tokens').select('device_token').eq('user_id', userId).eq('platform', 'apns');
        if (tokens && tokens.length > 0) {
            const startStr = new Date(plan.scheduling.start_time).toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' });
            await Promise.all(tokens.map(({ device_token }) =>
                sendPush(device_token, {
                    title: `${plan.display_title} scheduled`,
                    body: `Starting at ${startStr} · ${plan.scheduling.duration_minutes} min`,
                    data: { amber_session_id: sessionId }
                })
            ));
        }

        return { success: true, plan };
    } catch (err) {
        console.error('[amber_service] Pipeline failed:', err);
        await admin.from('amber_sessions').update({ status: 'failed' }).eq('id', sessionId).eq('user_id', userId);
        throw err;
    }
}
