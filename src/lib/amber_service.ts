import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
    SUPABASE_SERVICE_ROLE_KEY,
    DEEPSEEK_API_KEY,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
} from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { sendPush } from './apns';

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
    userPreferences: string
): Promise<DeepSeekTask> {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour12: false });
    const pctLabel = Math.round(intensity * 100);

    const prefsAppend = userPreferences.trim()
        ? `\n\n# USER PREFERENCE SIGNALS\n${userPreferences.trim()}`
        : '';

    const systemPrompt = `# MISSION
You are the Lead Mentor of RESIN, a sophisticated productivity ecosystem. Your objective is not just to schedule tasks, but to architect a user's life according to their biology, true intent, and long-term well-being. You translate chaotic human thoughts into a prioritized, energy-aware "Amber Plan."

# OPERATIONAL PRINCIPLES
1. INTUITIVE INTENT EXTRACTION (Chain-of-Thought):
   - Anchor on Commitments: First, identify fixed deadlines, meetings, and hard constraints.
   - Disambiguate Intent: Distinguish between "aspirational dreams" and "urgent needs." Predict objective success criteria.
   - Dialogue-Ready: If vital information is missing, flag it in the notification copy.
2. ENERGY-AWARE TAGGING & CHRONOTYPE ALIGNMENT:
   - High-concentration tasks (coding, writing, planning) MUST be slotted into focus peaks.
   - The "Lull" Protocol: Routine work (admin, email) MUST be deferred to energy lulls.
3. EMPATHETIC PACING & BURNOUT PREVENTION:
   - Dynamic Intensity: Bias toward "Soft" sessions if recent success is low. Bias toward "Firm" for deep work.
   - The Guilt-Free Buffer: Ensure plans include non-negotiable breaks.
4. RECURSIVE REFINEMENT:
   - Memory Management: Use past reflections (\${userPreferences}) to avoid repeating failure patterns.

# TASK SCORING LOGIC
- Weight tasks by Urgency, Biological Fit (Energy vs. Peak), and Mental Clarity.

# OUTPUT CONTRACT (STRICT JSON ONLY)
{
  "type": "action" | "intention" | "habit",
  "display_title": "Punchy, empathetic title",
  "ai_plan": ["Step 1.", "Step 2.", "Step 3."],
  "scheduling": { "start_time": "ISO8601", "end_time": "ISO8601", "duration_minutes": number },
  "blocking_active": boolean (always true for High energy tasks),
  "requires_verification": boolean,
  "session_type": "Soft" | "Firm",
  "energy_match_score": 0.0-1.0,
  "energy_demand": "High" | "Medium" | "Low",
  "notification_copy": "Empathetic nudge summarizing the value of this session."
}

# CALENDAR ANALYSIS
PREFERRED WINDOW: ${startHour}:00–${endHour}:00
CURRENT TIME: ${now} (timezone: ${timezone})
FREE/BUSY:
${freeBusy}${prefsAppend}`;

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

        // 3. Call DeepSeek
        const plan = await callDeepSeek(rawText, freeBusy, intensity, start_hour, end_hour, timezone, enrichedPreferences);

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
