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
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import {
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
} from '$env/static/private'
import { isPermanentAPNsTokenFailure, sendPushWithResult } from '$lib/services/apns'
import { executeNoteCommands } from '$lib/services/commandExecutor'
import { computeUserInsights } from '$lib/services/amber'
import { syncStonesFromNotes, recordDailyActivity } from '$lib/services/gamification'
import { adminClient, userHasProAccess } from '$lib/server/auth'
import { readBoundedJsonBody, readBoundedJsonResponse, RequestBodyError } from '$lib/server/requestBody'
import type { RequestEvent } from '@sveltejs/kit'
import type { ActivateRequest, ActivateResponse } from '@resin/contracts'

const MIN_TASK_WINDOW_MS = 60 * 1000
const MAX_TASK_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_RAW_TEXT_LENGTH = 8000
const MAX_PREFERENCES_LENGTH = 4000
const MAX_REQUEST_BODY_LENGTH = 32_000
const MAX_JWT_LENGTH = 8192
const GOOGLE_TOKEN_TIMEOUT_MS = 8000
const GOOGLE_CALENDAR_TIMEOUT_MS = 8000
const AI_PROVIDER_TIMEOUT_MS = 10000
const MAX_GOOGLE_TOKEN_RESPONSE_LENGTH = 16_000
const MAX_GOOGLE_CALENDAR_RESPONSE_LENGTH = 64_000
const MAX_AI_PROVIDER_RESPONSE_LENGTH = 64_000
const MAX_USER_PUSH_DEVICE_TOKENS = 50
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
const DEFAULT_FOCUS_CATEGORIES = ['youtube', 'reddit', 'social', 'video']
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g
const TIMEZONE_RE = /^[A-Za-z0-9_+\-/.]{1,64}$/
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
}
const ALLOWED_BROWSER_ORIGINS = new Set([
    'https://noteresin.com',
    'https://www.noteresin.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
])

function corsPreflightHeaders(request: Request): HeadersInit {
    const origin = request.headers.get('origin') ?? ''
    const headers: Record<string, string> = {
        ...NO_STORE_HEADERS,
        Vary: 'Origin'
    }
    if (ALLOWED_BROWSER_ORIGINS.has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin
    }
    return headers
}

function isValidHour(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
}

function cleanUserText(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(CONTROL_CHAR_RE, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : ''
}

function normalizeTimezone(value: unknown): string {
    const candidate = typeof value === 'string' ? value.trim() : 'UTC'
    if (!TIMEZONE_RE.test(candidate)) return 'UTC'

    try {
        new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
        return candidate
    } catch {
        return 'UTC'
    }
}

function validateScheduleWindow(startIso: string, endIso: string, durationMinutes: number): string | null {
    const start = new Date(startIso)
    const end = new Date(endIso)
    const windowMs = end.getTime() - start.getTime()
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return 'Planner returned an invalid time'
    }
    if (windowMs < MIN_TASK_WINDOW_MS || windowMs > MAX_TASK_WINDOW_MS) {
        return 'Planner returned an unsupported focus window'
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 24 * 60) {
        return 'Planner returned an invalid duration'
    }
    return null
}

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
    const { data: creds, error: credsError } = await adminClient
        .from('user_credentials')
        .select('google_refresh_token')
        .eq('id', userId)
        .maybeSingle()

    if (credsError) {
        console.error('[getGoogleAccessToken] Credential lookup failed');
        throw new Error('Cannot retrieve Google credentials')
    }

    if (!creds?.google_refresh_token) {
        throw new Error('Google Calendar not connected. Please sign in with Google in Account settings.')
    }

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
        signal: AbortSignal.timeout(GOOGLE_TOKEN_TIMEOUT_MS),
    })
    const data = await readBoundedJsonResponse<{ error?: unknown; access_token?: unknown }>(
        res,
        MAX_GOOGLE_TOKEN_RESPONSE_LENGTH
    )
    if (!res.ok) {
        console.error('[getGoogleAccessToken] Google token refresh failed');

        // Check if error is due to invalid refresh token
        if (data.error === 'invalid_grant') {
            throw new Error('Google authorization expired. Please sign in again with Google in Account settings.')
        }
        throw new Error('Google token refresh failed')
    }
    if (typeof data.access_token !== 'string') {
        throw new Error('Google token refresh failed')
    }
    return data.access_token
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
        signal: AbortSignal.timeout(GOOGLE_CALENDAR_TIMEOUT_MS),
    })
    if (!res.ok) return ''
    const data = await readBoundedJsonResponse<{ calendars?: { primary?: { busy?: unknown } } }>(
        res,
        MAX_GOOGLE_CALENDAR_RESPONSE_LENGTH
    )
    const busy = Array.isArray(data.calendars?.primary?.busy) ? data.calendars.primary.busy : []
    if (busy.length === 0) return 'No busy blocks in the next 48 hours.'
    return busy
        .filter((block): block is { start: string; end: string } =>
            Boolean(block) &&
            typeof block === 'object' &&
            typeof (block as { start?: unknown }).start === 'string' &&
            typeof (block as { end?: unknown }).end === 'string'
        )
        .map(b => `Busy: ${b.start} → ${b.end}`)
        .join('\n')
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
                signal: AbortSignal.timeout(GOOGLE_CALENDAR_TIMEOUT_MS),
            }
        )
        if (res.ok) {
            const ev = await readBoundedJsonResponse<{ id?: unknown }>(res, MAX_GOOGLE_CALENDAR_RESPONSE_LENGTH)
            return typeof ev.id === 'string' ? ev.id : null
        }
        console.error('[activate] Calendar event creation failed')
        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
    }
    console.warn('[activate] Calendar event creation failed after 2 attempts — task will be saved without calendar event')
    return null
}

// ── AI Planning helpers ────────────────────────────────────────────────────────────

/** Generate system prompt for AI planning */
function getSystemPrompt(
    startHour: number,
    endHour: number,
    timezone: string,
    freeBusy: string,
    userPreferences: string
): string {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone, hour12: false })
    const prefsAppend = userPreferences.trim()
        ? `\n\n# USER PREFERENCE SIGNALS\n${userPreferences.trim()}`
        : ''

    return `# MISSION
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
}

/** Call DeepSeek API */
async function callDeepSeek(
    rawText: string,
    systemPrompt: string
): Promise<DeepSeekTask> {
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
        signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
    })

    if (!res.ok) throw new Error('DeepSeek request failed')
    const completion = await readBoundedJsonResponse<unknown>(res, MAX_AI_PROVIDER_RESPONSE_LENGTH)
    const raw = aiMessageContent(completion)
    return JSON.parse(raw) as DeepSeekTask
}

/** Call Gemini API as fallback */
async function callGemini(
    rawText: string,
    systemPrompt: string
): Promise<DeepSeekTask> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured')
    }

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: systemPrompt },
                        { text: rawText },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json',
            },
        }),
        signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
    })

    if (!res.ok) throw new Error('Gemini request failed')
    const completion = await readBoundedJsonResponse<unknown>(res, MAX_AI_PROVIDER_RESPONSE_LENGTH)
    const raw = geminiMessageContent(completion)
    return JSON.parse(raw) as DeepSeekTask
}

function aiMessageContent(completion: unknown): string {
    if (!completion || typeof completion !== 'object') throw new Error('Invalid AI response')
    const choices = (completion as { choices?: unknown }).choices
    const firstChoice = Array.isArray(choices) ? choices[0] : null
    const message = firstChoice && typeof firstChoice === 'object'
        ? (firstChoice as { message?: unknown }).message
        : null
    const content = message && typeof message === 'object'
        ? (message as { content?: unknown }).content
        : null
    if (typeof content !== 'string' || content.length > MAX_AI_PROVIDER_RESPONSE_LENGTH) {
        throw new Error('Invalid AI response')
    }
    return content
}

function geminiMessageContent(completion: unknown): string {
    if (!completion || typeof completion !== 'object') throw new Error('Invalid AI response')
    const candidates = (completion as { candidates?: unknown }).candidates
    const firstCandidate = Array.isArray(candidates) ? candidates[0] : null
    const content = firstCandidate && typeof firstCandidate === 'object'
        ? (firstCandidate as { content?: unknown }).content
        : null
    const parts = content && typeof content === 'object'
        ? (content as { parts?: unknown }).parts
        : null
    const firstPart = Array.isArray(parts) ? parts[0] : null
    const text = firstPart && typeof firstPart === 'object'
        ? (firstPart as { text?: unknown }).text
        : null
    if (typeof text !== 'string' || text.length > MAX_AI_PROVIDER_RESPONSE_LENGTH) {
        throw new Error('Invalid AI response')
    }
    return text
}

/** Try DeepSeek with timeout; fall back to Gemini on failure */
async function callDeepSeekWithFallback(
    rawText: string,
    systemPrompt: string
): Promise<{ task: DeepSeekTask; service: 'deepseek' | 'gemini' }> {
    try {
        const task = await callDeepSeek(rawText, systemPrompt)
        console.log('[activate] DeepSeek succeeded')
        return { task, service: 'deepseek' }
    } catch {
        console.warn('[activate] DeepSeek failed; falling back to Gemini')
    }

    try {
        const task = await callGemini(rawText, systemPrompt)
        console.log('[activate] Gemini fallback succeeded')
        return { task, service: 'gemini' }
    } catch {
        console.error('[activate] Both DeepSeek and Gemini failed')
        throw new Error('AI planning failed')
    }
}

// ── Main handler ───────────────────────────────────────────────────────────────

export const POST = async ({ request }: RequestEvent) => {
    // 1. Auth: require Bearer header so tokens are not carried in JSON bodies.
    const authHeader = request.headers.get('authorization') ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    // 2. Parse body.
    let body: {
        session_id: string
        raw_text: string
        intensity?: number
        start_hour?: number
        end_hour?: number
        user_preferences?: string
        timezone?: string
    }
    try {
        body = await readBoundedJsonBody<typeof body>(request, MAX_REQUEST_BODY_LENGTH)
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers: NO_STORE_HEADERS })
    }

    if (!jwt || jwt.length > MAX_JWT_LENGTH || !JWT_RE.test(jwt)) {
        return json({
            error: 'Authentication failed: missing or invalid token.'
        }, { status: 401, headers: NO_STORE_HEADERS })
    }

    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt)
    if (userError || !user) {
        return json({
            error: 'Invalid token'
        }, { status: 401, headers: NO_STORE_HEADERS })
    }

    if (!(await userHasProAccess(user.id))) {
        return json({
            error: 'Pro required',
            code: 'PRO_REQUIRED',
            message: 'AI scheduling from the web app and Chrome extension requires Resin Pro. The iPhone app stays free.'
        }, { status: 402, headers: NO_STORE_HEADERS })
    }

    let {
        session_id,
        raw_text,
        intensity = 0.5,
        start_hour,
        end_hour,
        user_preferences = '',
        timezone = 'UTC',
    } = body

    raw_text = cleanUserText(raw_text, MAX_RAW_TEXT_LENGTH)
    user_preferences = cleanUserText(user_preferences, MAX_PREFERENCES_LENGTH)
    timezone = normalizeTimezone(timezone)

    if (!session_id || !raw_text) {
        return json({ error: 'session_id and raw_text are required' }, { status: 400, headers: NO_STORE_HEADERS })
    }
    if (!SESSION_ID_RE.test(session_id)) {
        return json({ error: 'Invalid session_id' }, { status: 400, headers: NO_STORE_HEADERS })
    }
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
        return json({ error: 'intensity must be between 0 and 1' }, { status: 400, headers: NO_STORE_HEADERS })
    }

    const { data: existingSession, error: existingSessionError } = await adminClient
        .from('amber_sessions')
        .select('id, user_id')
        .eq('id', session_id)
        .maybeSingle()

    if (existingSessionError) {
        console.error('[activate] Session ownership check failed')
        return json({ error: 'Could not verify session ownership' }, { status: 500, headers: NO_STORE_HEADERS })
    }
    if (existingSession && existingSession.user_id !== user.id) {
        return json({ error: 'Session not found or permission denied' }, { status: 403, headers: NO_STORE_HEADERS })
    }

    // Mark session as processing
    if (existingSession) {
        const { error: processingError } = await adminClient.from('amber_sessions')
            .update({ status: 'processing' })
            .eq('id', session_id)
            .eq('user_id', user.id)
        if (processingError) {
            console.error('[activate] Could not mark session processing')
            return json({ error: 'Could not start activation' }, { status: 500, headers: NO_STORE_HEADERS })
        }
    }

    try {
        // 2.5. Get per-day availability if not provided
        if (start_hour === undefined || end_hour === undefined) {
            const { data: profile } = await adminClient
                .from('profiles')
                .select('availability_schedule')
                .eq('id', user.id)
                .maybeSingle()

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
        if (!isValidHour(start_hour) || !isValidHour(end_hour) || start_hour >= end_hour) {
            return json({ error: 'Availability window must use valid start/end hours' }, { status: 400, headers: NO_STORE_HEADERS })
        }

        // 3. Get Google access token & free/busy. Calendar access always comes
        // from the signed-in user's server-stored credentials, never a caller-
        // supplied access token.
        const gToken = await getGoogleAccessToken(user.id)

        const freeBusy = await getFreeBusy(gToken, timezone)

        // 3.5. Compute learned insights from past sessions
        const learnedInsights = await computeUserInsights(user.id)
        const enrichedPreferences = [learnedInsights, user_preferences].filter(Boolean).join('\n\n')

        // 4. Generate system prompt and call DeepSeek (with Gemini fallback)
        const systemPrompt = getSystemPrompt(start_hour ?? 16, end_hour ?? 22, timezone, freeBusy, enrichedPreferences)
        const { task: plan, service } = await callDeepSeekWithFallback(raw_text, systemPrompt)
        console.log(`[activate] Used ${service} for plan generation`)
        const scheduleError = validateScheduleWindow(
            plan.scheduling.start_time,
            plan.scheduling.end_time,
            plan.scheduling.duration_minutes
        )
        if (scheduleError) {
            throw new Error(scheduleError)
        }

        // 5. Create Google Calendar event
        const calEventId = await createCalendarEvent(gToken, plan, plan.display_title, timezone)

        // 6. Upsert amber_session with scheduled status
        await adminClient.from('amber_sessions').upsert({
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
            description,
            estimated_minutes: plan.scheduling.duration_minutes,
            sequence_order: 1,
            start_time: plan.scheduling.start_time,
            end_time: plan.scheduling.end_time,
            calendar_event_id: calEventId,
            requires_focus: plan.blocking_active,
            requires_camera_verification: plan.requires_verification,
        }
        await adminClient.from('amber_tasks').upsert(taskRow)

        // 7.5. Create a blocking session + active blocks for the extension (best-effort)
        // This keeps web/Chrome blocking in lockstep with Amber plan scheduling, even when activation
        // originates from the Chrome extension (which calls this endpoint directly).
        try {
            const { data: profile, error: profileError } = await adminClient
                .from('profiles')
                .select('blocking_enabled, extension_enabled')
                .eq('id', user.id)
                .maybeSingle()

            if (profileError) {
                console.warn('[activate] Blocking profile lookup skipped')
            }

            const blockingEnabled = (profile as any)?.blocking_enabled ?? true
            const extensionEnabled = (profile as any)?.extension_enabled ?? true

            if (blockingEnabled && extensionEnabled) {
                await adminClient.from('blocking_sessions').upsert({
                    id: session_id,
                    user_id: user.id,
                    start_time: plan.scheduling.start_time,
                    end_time: plan.scheduling.end_time,
                    is_active: true,
                    device_scheduled: false,
                    title: `Amber Session: ${plan.display_title || 'Focus'}`
                })

                await adminClient.from('active_blocks').delete().eq('session_id', session_id).eq('user_id', user.id)
                const { error: activeBlocksError } = await adminClient.from('active_blocks').insert(
                    DEFAULT_FOCUS_CATEGORIES.map((categoryId) => ({
                        user_id: user.id,
                        category_id: categoryId,
                        session_id,
                        server_start_time: plan.scheduling.start_time,
                        server_end_time: plan.scheduling.end_time
                    }))
                )
                if (activeBlocksError) throw activeBlocksError
            }
        } catch (blockingErr) {
            console.warn('[activate] Warning: extension blocking sync failed (non-fatal)')
        }

        // 8. Sync stones for activation (1 note = 1 stone)
        await syncStonesFromNotes(user.id);
        await recordDailyActivity(user.id);

        // 9. Send APNs push to active registered devices for this user
        const { data: tokens } = await adminClient
            .from('device_tokens')
            .select('token')
            .eq('user_id', user.id)
            .eq('device_type', 'ios')
            .eq('is_active', true)
            .limit(MAX_USER_PUSH_DEVICE_TOKENS + 1)

        if (tokens && tokens.length > 0) {
            if (tokens.length > MAX_USER_PUSH_DEVICE_TOKENS) {
                console.warn('[activate] APNs fanout capped for user')
            }
            const pushTokens = tokens.slice(0, MAX_USER_PUSH_DEVICE_TOKENS)
            const startStr = new Date(plan.scheduling.start_time)
                .toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })

            const results = await Promise.allSettled(pushTokens.map(async ({ token }) => {
                const result = await sendPushWithResult(token, {
                    title: 'Resin plan scheduled',
                    body: `Starting at ${startStr} · ${plan.scheduling.duration_minutes} min`,
                    data: { amber_session_id: session_id },
                })
                return { token, permanentFailure: isPermanentAPNsTokenFailure(result) }
            }))

            const permanentlyFailedTokens = results
                .filter((result): result is PromiseFulfilledResult<{ token: string; permanentFailure: boolean }> =>
                    result.status === 'fulfilled' && result.value.permanentFailure
                )
                .map((result) => result.value.token)

            if (permanentlyFailedTokens.length > 0) {
                await adminClient
                    .from('device_tokens')
                    .update({ is_active: false, last_used_at: null, updated_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                    .in('token', permanentlyFailedTokens)
            }
        }

        // 9.5. Execute any claw: commands (async, non-blocking)
        executeCommandsInBackground(user.id, raw_text, adminClient);

        // 10. Return the full result to the caller (app may still be in foreground)
        return json({
            status: 'scheduled',
            session_id,
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
        }, { headers: NO_STORE_HEADERS })

    } catch {
        console.error('[activate] Pipeline error')
        // Mark session as failed so app can retry
        await adminClient.from('amber_sessions')
            .update({ status: 'failed' })
            .eq('id', session_id)
            .eq('user_id', user.id)
        return json({ error: 'Activation failed' }, { status: 500, headers: NO_STORE_HEADERS })
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

            console.log(`[commands] Executed ${results.length} command(s)`);
        } catch (error) {
            console.error('[commands] Background execution failed');
        }
    })();
}

export const OPTIONS = async ({ request }: RequestEvent) => new Response(null, {
    headers: {
        ...corsPreflightHeaders(request),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
})
