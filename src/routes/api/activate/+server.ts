/**
 * POST /api/activate
 *
 * Full server-side scheduling pipeline:
 *   1. Authenticate the user via Bearer JWT
 *   2. Get a fresh Google access token
 *   3. Call DeepSeek to generate the plan
 *   4. Create Google Calendar event(s) in free slots
 *   5. Write results to Supabase (amber_sessions + amber_tasks)
 *   6. Send APNs push notification to the user's device
 *
 * Request body (JSON):
 * {
 *   session_id:       string  (UUID — already saved to Supabase by the app)
 *   raw_text:         string
 *   intensity:        number  (0..1)
 *   start_hour:       number  (preferred window start, e.g. 16)
 *   end_hour:         number  (preferred window end,   e.g. 22)
 *   user_preferences: string  (from PlanAdjustmentService.preferenceSummary(), may be empty)
 *   timezone:         string  (IANA tz, e.g. "America/Chicago")
 * }
 *
 * Response: { status: "scheduled", tasks: AmberTask[] }
 */

import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import {
    SUPABASE_SERVICE_ROLE_KEY,
    DEEPSEEK_API_KEY,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
} from '$env/static/private'
import { sendPush } from '$lib/apns'
import { executeNoteCommands } from '$lib/services/commandExecutor'
import { computeUserInsights } from '$lib/amber_service'
import { syncStonesFromNotes, recordDailyActivity } from '$lib/gamification_service'
import type { RequestEvent } from '@sveltejs/kit'

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
})

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeepSeekTask {
    type: 'action' | 'intention' | 'habit'
    display_title: string
    ai_plan: string[]
    scheduling: { start_time: string; end_time: string; duration_minutes: number }
    blocking_active: boolean
    requires_verification: boolean
    session_type: 'Soft' | 'Firm'
    energy_match_score: number
    energy_demand: 'High' | 'Medium' | 'Low'
    notification_copy: string
}

// ── Google Calendar helpers ────────────────────────────────────────────────────

/** Refresh Google access token using stored refresh token from user_credentials table. */
async function getGoogleAccessToken(userId: string): Promise<string> {
    const { data: creds, error: credsError } = await admin
        .from('user_credentials')
        .select('google_refresh_token')
        .eq('id', userId)
        .single()

    if (credsError) {
        console.error(`[getGoogleAccessToken] Error fetching credentials for ${userId}:`, credsError);
        throw new Error(`Cannot retrieve Google credentials: ${credsError.message}`)
    }

    if (!creds?.google_refresh_token) {
        throw new Error('Google Calendar not connected. Please sign in with Google in Account settings.')
    }

    console.log(`[getGoogleAccessToken] Refreshing token for ${userId}.`);
    console.log(`[getGoogleAccessToken] Config: ID len=${GOOGLE_CLIENT_ID?.length}, Secret len=${GOOGLE_CLIENT_SECRET?.length}`);
    console.log(`[getGoogleAccessToken] Token prefix: ${creds.google_refresh_token.substring(0, 10)}...`);

    const params: Record<string, string> = {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: creds.google_refresh_token,
    }

    // Google sometimes requires the original redirect_uri if it was provided during authorization.
    // For Supabase, this is the internal Supabase callback.
    const supabaseCallback = `${PUBLIC_SUPABASE_URL}/auth/v1/callback`
    params.redirect_uri = supabaseCallback

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    })
    const data = await res.json()
    if (!res.ok) {
        console.error(`[getGoogleAccessToken] Google token refresh failed for user ${userId}. Status: ${res.status}. Data:`, JSON.stringify(data));
        console.error(`[getGoogleAccessToken] Client ID length: ${GOOGLE_CLIENT_ID?.length}`);

        // Check if error is due to invalid refresh token
        if (data.error === 'invalid_grant') {
            throw new Error('Google authorization expired. Please sign in again with Google in Account settings.')
        }
        throw new Error(`Google token refresh failed: ${data.error || JSON.stringify(data)}`)
    }
    return data.access_token as string
}

/** Fetch free/busy from Google Calendar for the next 48 hours. */
async function getFreeBusy(accessToken: string, timezone: string): Promise<string> {
    const now = new Date()
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            timeMin: now.toISOString(),
            timeMax: end.toISOString(),
            timeZone: timezone,
            items: [{ id: 'primary' }],
        }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const busy: { start: string; end: string }[] = data.calendars?.primary?.busy ?? []
    if (busy.length === 0) return 'No busy blocks in the next 48 hours.'
    return busy.map(b => `Busy: ${b.start} → ${b.end}`).join('\n')
}

/** Create a Google Calendar event and return its id. Retries once on failure. */
async function createCalendarEvent(
    accessToken: string,
    task: DeepSeekTask,
    title: string,
    timezone: string
): Promise<string | null> {
    const body = {
        summary: title,
        description: task.ai_plan.join('\n'),
        start: { dateTime: task.scheduling.start_time, timeZone: timezone },
        end: { dateTime: task.scheduling.end_time, timeZone: timezone },
    }

    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        )
        if (res.ok) {
            const ev = await res.json()
            return ev.id ?? null
        }
        const errText = await res.text()
        console.error(`[activate] Calendar event creation failed (attempt ${attempt + 1}):`, errText)
        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
    }
    console.warn('[activate] Calendar event creation failed after 2 attempts — task will be saved without calendar event')
    return null
}

// ── DeepSeek helper ────────────────────────────────────────────────────────────

async function callDeepSeek(
    rawText: string,
    freeBusy: string,
    intensity: number,
    startHour: number,
    endHour: number,
    timezone: string,
    userPreferences: string
): Promise<DeepSeekTask> {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour12: false })
    const pctLabel = Math.round(intensity * 100)

    const prefsAppend = userPreferences.trim()
        ? `\n\n# USER PREFERENCE SIGNALS\n${userPreferences.trim()}`
        : ''

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
   - Memory Management: Use past reflections (${userPreferences}) to avoid repeating failure patterns.

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

FREE/BUSY CALENDAR DATA:
${freeBusy}${prefsAppend}

OUTPUT ONLY VALID JSON. NO MARKDOWN. NO CODE BLOCKS.`

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
            max_tokens: 1024,
        }),
    })

    if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`)
    const completion = await res.json()
    const raw = completion.choices?.[0]?.message?.content ?? ''
    return JSON.parse(raw) as DeepSeekTask
}

// ── Main handler ───────────────────────────────────────────────────────────────

export const POST = async ({ request }: RequestEvent) => {
    // 1. Auth: Try header first, then fallback to body
    const authHeader = request.headers.get('authorization') ?? ''
    let jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    // 2. Parse body (early so we can check for access_token)
    let body: {
        session_id: string
        raw_text: string
        intensity?: number
        start_hour?: number
        end_hour?: number
        user_preferences?: string
        timezone?: string
        access_token?: string
        google_access_token?: string
    }
    try {
        body = await request.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!jwt && body.access_token) {
        jwt = body.access_token
    }

    if (!jwt) {
        return json({
            error: 'Authentication failed: No token found.',
            debug: {
                has_auth_header: !!authHeader,
                auth_header_prefix: authHeader ? authHeader.slice(0, 10) + '...' : 'none',
                has_body: !!body,
                body_keys: body ? Object.keys(body) : [],
                has_access_token_in_body: !!body?.access_token
            }
        }, { status: 401 })
    }

    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !user) {
        return json({
            error: 'Invalid token',
            details: userError?.message || 'No user found for this token',
            jwt_prefix: jwt.slice(0, 10) + '...'
        }, { status: 401 })
    }

    let {
        session_id,
        raw_text,
        intensity = 0.5,
        start_hour,
        end_hour,
        user_preferences = '',
        timezone = 'UTC',
        google_access_token = null,
    } = body

    if (!session_id || !raw_text) {
        return json({ error: 'session_id and raw_text are required' }, { status: 400 })
    }

    // Mark session as processing
    await admin.from('amber_sessions')
        .update({ status: 'processing' })
        .eq('id', session_id)
        .eq('user_id', user.id)

    try {
        // 2.5. Get per-day availability if not provided
        if (start_hour === undefined || end_hour === undefined) {
            const { data: profile } = await admin
                .from('profiles')
                .select('availability_schedule')
                .eq('id', user.id)
                .single()

            const today = new Date()
            const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
            const availSchedule = profile?.availability_schedule as any[] || null

            if (availSchedule && Array.isArray(availSchedule) && availSchedule[dayOfWeek]) {
                start_hour = start_hour ?? availSchedule[dayOfWeek].start ?? 16
                end_hour = end_hour ?? availSchedule[dayOfWeek].end ?? 22
            } else {
                start_hour = start_hour ?? 16
                end_hour = end_hour ?? 22
            }
        }

        // 3. Get Google access token & free/busy
        let gToken: string
        if (google_access_token) {
            console.log(`[activate] Using provided google_access_token for user ${user.id}`)
            gToken = google_access_token
        } else {
            gToken = await getGoogleAccessToken(user.id)
        }

        const freeBusy = await getFreeBusy(gToken, timezone)

        // 3.5. Compute learned insights from past sessions
        const learnedInsights = await computeUserInsights(user.id)
        const enrichedPreferences = [learnedInsights, user_preferences].filter(Boolean).join('\n\n')

        // 4. Call DeepSeek
        const plan = await callDeepSeek(raw_text, freeBusy, intensity, start_hour, end_hour, timezone, enrichedPreferences)

        // 5. Create Google Calendar event
        const calEventId = await createCalendarEvent(gToken, plan, plan.display_title, timezone)

        // 6. Upsert amber_session with scheduled status
        await admin.from('amber_sessions').upsert({
            id: session_id,
            user_id: user.id,
            raw_text,
            display_title: plan.display_title,
            status: 'scheduled',
            intensity: intensity.toFixed(2),
        })

        // 7. Upsert the generated task(s)
        // Handle both formats: array of objects {title, duration_minutes, steps} OR array of strings
        const description = plan.ai_plan
            .map(step => {
                if (typeof step === 'string') {
                    // If it's a plain string, return it as-is
                    return step;
                } else if (step && typeof step === 'object' && 'title' in step) {
                    // If it's an object with title/duration/steps, format it nicely
                    const title = (step as any).title || '';
                    const duration = (step as any).duration_minutes || 0;
                    const substeps = (step as any).steps || [];
                    return [
                        `📍 ${title}${duration ? ` (${duration}m)` : ''}`,
                        ...substeps.map((s: string) => `  • ${s}`)
                    ].join('\n');
                } else {
                    return String(step);
                }
            })
            .join('\n');

        const taskRow = {
            id: crypto.randomUUID(),
            session_id,
            title: plan.display_title,
            description: plan.ai_plan.join('\n'),
            estimated_minutes: plan.scheduling.duration_minutes,
            sequence_order: 1,
            start_time: plan.scheduling.start_time,
            end_time: plan.scheduling.end_time,
            calendar_event_id: calEventId,
            requires_focus: plan.blocking_active,
            requires_camera_verification: plan.requires_verification,
        }
        await admin.from('amber_tasks').upsert(taskRow)

        // 8. Sync stones for activation (1 note = 1 stone)
        await syncStonesFromNotes(user.id);
        await recordDailyActivity(user.id);

        // 9. Send APNs push to all registered devices for this user
        const { data: tokens } = await admin
            .from('device_tokens')
            .select('device_token')
            .eq('user_id', user.id)
            .eq('platform', 'apns')

        if (tokens && tokens.length > 0) {
            const startStr = new Date(plan.scheduling.start_time)
                .toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })

            await Promise.all(tokens.map(({ device_token }) =>
                sendPush(device_token, {
                    title: `${plan.display_title} scheduled`,
                    body: `Starting at ${startStr} · ${plan.scheduling.duration_minutes} min`,
                    data: { amber_session_id: session_id },
                })
            ))
        }

        // 9.5. Execute any claw: commands (async, non-blocking)
        executeCommandsInBackground(user.id, raw_text, admin);

        // 10. Return the full result to the caller (app may still be in foreground)
        return json({
            status: 'scheduled',
            task: {
                id: taskRow.id,
                title: plan.display_title,
                description: taskRow.description,
                // Normalize ai_plan to always be an array of strings for consistency
                ai_plan: plan.ai_plan.map(step =>
                    typeof step === 'string' ? step : (step as any).title || String(step)
                ),
                start_time: plan.scheduling.start_time,
                end_time: plan.scheduling.end_time,
                duration_minutes: plan.scheduling.duration_minutes,
                calendar_event_id: calEventId,
                requires_focus: plan.blocking_active,
                requires_camera_verification: plan.requires_verification,
                notification_copy: plan.notification_copy,
            }
        })

    } catch (err) {
        console.error('[activate] Pipeline error:', err)
        // Mark session as failed so app can retry
        await admin.from('amber_sessions')
            .update({ status: 'failed' })
            .eq('id', session_id)
        return json({ error: String(err) }, { status: 500 })
    }
}

/**
 * Execute commands in the background (non-blocking)
 */
function executeCommandsInBackground(userId: string, noteContent: string, db: any) {
    // Run in background - don't wait for it
    (async () => {
        try {
            // Fetch user's command integrations
            const { data: configs } = await db
                .from('command_integrations')
                .select('command_type, config, enabled')
                .eq('user_id', userId)
                .eq('enabled', true);

            if (!configs || configs.length === 0) {
                return; // No commands configured
            }

            // Execute commands
            const results = await executeNoteCommands(noteContent, configs);

            // Log results (for debugging/auditing)
            if (results.length > 0) {
                await db
                    .from('command_execution_logs')
                    .insert(
                        results.map(r => ({
                            user_id: userId,
                            command: r.command,
                            success: r.success,
                            message: r.message,
                            executed_at: new Date().toISOString()
                        }))
                    );
            }

            console.log(`[commands] Executed ${results.length} commands for user ${userId}`);
        } catch (error) {
            console.error('[commands] Background execution failed:', error);
        }
    })();
}

export const OPTIONS = async () => new Response(null, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
