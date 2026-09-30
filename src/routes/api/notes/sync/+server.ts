/**
 * POST /api/notes/sync
 *
 * Receives notes from the iOS app and persists them to Supabase.
 * All Supabase logic lives here — the iOS app is a dumb HTTP client.
 *
 * Authentication: shared RESIN_SYNC_KEY secret (set in environment)
 *
 * Request body (JSON):
 * {
 *   email:    string          — user's email; used to find/create their Supabase account
 *   api_key:  string          — must match RESIN_SYNC_KEY env var
 *   notes: Array<{
 *     id:            string   — UUID from iOS SQLite (used for idempotent upsert)
 *     text:          string   — note body text
 *     created_at:    string   — ISO 8601 timestamp
 *     stored_urls?:  string[] — bookmarked URLs
 *     rich_text_html?: string — HTML formatted version (optional)
 *     group_id?:     string   — note group UUID (optional)
 *     title?:        string   — first-line title (optional, derived on server if absent)
 *   }>
 * }
 *
 * Response (200):
 * {
 *   synced:  number   — count of notes upserted
 *   skipped: number   — notes that already existed and were not overwritten
 * }
 */

import { json } from '@sveltejs/kit'
import { adminClient, isValidResinSyncKey, normalizeEmail, resolveExistingUserIdByEmail } from '$lib/server/auth'
import { readBoundedJsonBody, RequestBodyError } from '$lib/server/requestBody'
import type { RequestEvent } from '@sveltejs/kit'

const MAX_SYNC_NOTES = 250
const MAX_NOTE_TEXT_CHARS = 20_000
const MAX_RICH_TEXT_HTML_CHARS = 100_000
const MAX_STORED_URLS = 25
const MAX_URL_CHARS = 2_000
const MAX_REQUEST_BODY_LENGTH = 8_000_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DANGEROUS_HTML_RE = /<\s*script\b|on[a-z]+\s*=|javascript:/i
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

interface NotePayload {
    id: string
    text: string
    created_at: string
    stored_urls?: string[]
    rich_text_html?: string
    group_id?: string
    title?: string
}

interface SyncRequestBody {
    email: string
    api_key: string
    notes: NotePayload[]
}

function logSyncIssue(scope: string, error: unknown) {
    const issue = error as { code?: unknown; name?: unknown; message?: unknown; status?: unknown }
    console.error(`[notes/sync] ${scope}`, {
        code: typeof issue?.code === 'string' ? issue.code : undefined,
        name: typeof issue?.name === 'string' ? issue.name : undefined,
        status: typeof issue?.status === 'number' || typeof issue?.status === 'string' ? issue.status : undefined,
        hasMessage: typeof issue?.message === 'string' && issue.message.length > 0
    })
}

/** Extract first non-empty line, strip markdown heading markers, cap at 60 chars. */
function deriveTitle(text: string): string {
    const lines = text.split('\n')
    for (const line of lines) {
        const t = line.trim().replace(/^#+\s*/, '')
        if (t) return t.substring(0, 60)
    }
    return 'Untitled Note'
}

function parseValidDate(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function normalizeStoredUrls(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .filter((url): url is string => typeof url === 'string')
        .map((url) => {
            const trimmed = url.trim()
            if (trimmed.length === 0 || trimmed.length > MAX_URL_CHARS) return null
            try {
                const parsed = new URL(trimmed)
                if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
                parsed.username = ''
                parsed.password = ''
                return parsed.toString()
            } catch {
                return null
            }
        })
        .filter((url): url is string => Boolean(url))
        .slice(0, MAX_STORED_URLS)
}

function normalizeNotePayload(note: NotePayload): NotePayload | null {
    if (!note || typeof note.id !== 'string' || !UUID_RE.test(note.id)) return null
    if (typeof note.text !== 'string') return null

    const text = note.text.trim()
    if (!text || text.length > MAX_NOTE_TEXT_CHARS) return null

    const createdAt = parseValidDate(note.created_at)
    if (!createdAt) return null

    const title = typeof note.title === 'string' && note.title.trim()
        ? note.title.trim().slice(0, 120)
        : undefined
    const richTextHtml = typeof note.rich_text_html === 'string' && !DANGEROUS_HTML_RE.test(note.rich_text_html)
        ? note.rich_text_html.slice(0, MAX_RICH_TEXT_HTML_CHARS)
        : undefined
    const groupId = typeof note.group_id === 'string' && UUID_RE.test(note.group_id)
        ? note.group_id
        : undefined

    return {
        id: note.id,
        text,
        created_at: createdAt,
        stored_urls: normalizeStoredUrls(note.stored_urls),
        rich_text_html: richTextHtml,
        group_id: groupId,
        title
    }
}

export const POST = async ({ request, setHeaders }: RequestEvent) => {
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    })

    // ── 1. Parse body ──────────────────────────────────────────────────────────
    let body: SyncRequestBody
    try {
        body = await readBoundedJsonBody<SyncRequestBody>(request, MAX_REQUEST_BODY_LENGTH)
    } catch (error) {
        const status = error instanceof RequestBodyError ? error.status : 400
        return json({
            error: status === 413 ? 'Request body too large' : 'Invalid JSON body'
        }, { status, headers: NO_STORE_HEADERS })
    }

    const { email, api_key, notes } = body

    // ── 2. Validate API key ────────────────────────────────────────────────────
    if (!isValidResinSyncKey(api_key)) {
        return json({ error: 'Invalid API key' }, { status: 401, headers: NO_STORE_HEADERS })
    }

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
        return json({ error: 'Valid email required' }, { status: 400, headers: NO_STORE_HEADERS })
    }

    if (!Array.isArray(notes) || notes.length === 0) {
        return json({ synced: 0, skipped: 0 }, { headers: NO_STORE_HEADERS })
    }
    if (notes.length > MAX_SYNC_NOTES) {
        return json({ error: `Too many notes. Max ${MAX_SYNC_NOTES} per sync.` }, { status: 413, headers: NO_STORE_HEADERS })
    }

    // ── 3. Resolve the existing Supabase user by email ─────────────────────────
    const userId = await resolveExistingUserIdByEmail(normalizedEmail)
    if (!userId) {
        return json({ synced: 0, skipped: notes.length }, { headers: NO_STORE_HEADERS })
    }

    const { data: entitlementProfile, error: entitlementError } = await adminClient
        .from('profiles')
        .select('account_type')
        .eq('id', userId)
        .maybeSingle()
    const accountType = typeof entitlementProfile?.account_type === 'string'
        ? entitlementProfile.account_type.toLowerCase()
        : 'free'
    const hasProAccess = accountType === 'pro' || accountType === 'premium' || accountType === 'paid'
    if (entitlementError || !hasProAccess) {
        return json({
            error: 'Pro required',
            code: 'PRO_REQUIRED',
            message: 'Web note sync requires Resin Pro.'
        }, { status: 402, headers: NO_STORE_HEADERS })
    }

    // ── 4. Upsert notes into amber_sessions ────────────────────────────────────
    // We use the iOS-generated UUID as the primary key to make this idempotent.
    // Notes synced from iOS are stored as status='draft' (same as web notes).
    const now = new Date().toISOString()
    const validNotes = notes
        .map(normalizeNotePayload)
        .filter((note): note is NotePayload => note !== null)

    if (validNotes.length === 0) {
        return json({ synced: 0, skipped: notes.length }, { headers: NO_STORE_HEADERS })
    }

    const uniqueNotes = Array.from(new Map(validNotes.map((note) => [note.id, note])).values())
    const noteIds = uniqueNotes.map((note) => note.id)

    const { data: existingNotes, error: ownershipError } = await adminClient
        .from('amber_sessions')
        .select('id, user_id')
        .in('id', noteIds)

    if (ownershipError) {
        logSyncIssue('ownership_check_failed', ownershipError)
        return json({ error: 'Failed to verify note ownership' }, { status: 500, headers: NO_STORE_HEADERS })
    }

    const hasForeignNote = (existingNotes ?? []).some((note) => note.user_id !== userId)
    if (hasForeignNote) {
        return json({
            error: 'Note ownership conflict',
            code: 'NOTE_OWNERSHIP_CONFLICT'
        }, { status: 409, headers: NO_STORE_HEADERS })
    }

    const existingNoteIds = new Set((existingNotes ?? []).map((note) => note.id))
    const { data: iosOwnedNotes, error: sourceLookupError } = existingNoteIds.size > 0
        ? await adminClient
            .from('amber_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('sync_source', 'ios')
            .in('id', [...existingNoteIds])
        : { data: [], error: null }
    if (sourceLookupError) {
        logSyncIssue('source_check_failed', sourceLookupError)
    }
    const iosOwnedNoteIds = new Set((iosOwnedNotes ?? []).map((note) => note.id))

    const groupIds = Array.from(new Set(
        uniqueNotes
            .map((note) => note.group_id)
            .filter((id): id is string => Boolean(id))
    ))
    let ownedGroupIds = new Set<string>()

    if (groupIds.length > 0) {
        const { data: ownedGroups, error: groupLookupError } = await adminClient
            .from('note_groups')
            .select('id')
            .eq('user_id', userId)
            .in('id', groupIds)

        if (groupLookupError) {
            logSyncIssue('group_lookup_failed', groupLookupError)
        } else {
            ownedGroupIds = new Set((ownedGroups ?? []).map((group) => group.id))
        }
    }

    const rows = uniqueNotes.map((note) => ({
        id: note.id,
        user_id: userId,
        raw_text: note.text,
        title: note.title ?? deriveTitle(note.text),
        display_title: note.title ?? deriveTitle(note.text),  // compat until migration
        status: 'draft' as const,
        rich_text_html: note.rich_text_html ?? null,
        stored_urls: note.stored_urls ?? [],
        group_id: note.group_id && ownedGroupIds.has(note.group_id) ? note.group_id : null,
        created_at: note.created_at,
        updated_at: now,
        // Indicate this row was synced from the iOS app
        sync_source: 'ios',
    })).filter((row) => !existingNoteIds.has(row.id) || iosOwnedNoteIds.has(row.id))

    if (rows.length === 0) {
        return json({ synced: 0, skipped: notes.length }, { headers: NO_STORE_HEADERS })
    }

    // Never use an admin upsert for both new and existing rows: a conflicting
    // UUID created after the ownership check could otherwise be reassigned.
    const newRows = rows.filter((row) => !existingNoteIds.has(row.id))
    const existingRows = rows.filter((row) => existingNoteIds.has(row.id))
    let synced = 0

    if (newRows.length > 0) {
        const { data: inserted, error: insertError } = await adminClient
            .from('amber_sessions')
            .insert(newRows)
            .select('id')

        if (insertError) {
            logSyncIssue('insert_failed', insertError)
            // Gracefully handle older schemas without optional sync columns.
            const fallbackRows = newRows.map(({ sync_source: _s, group_id: _g, rich_text_html: _r, stored_urls: _u, ...rest }) => rest)
            const { data: fallback, error: fallbackError } = await adminClient
                .from('amber_sessions')
                .insert(fallbackRows)
                .select('id')

            if (fallbackError) {
                logSyncIssue('fallback_insert_failed', fallbackError)
                return json({ error: 'Failed to save notes' }, { status: 500, headers: NO_STORE_HEADERS })
            }
            synced += fallback?.length ?? 0
        } else {
            synced += inserted?.length ?? newRows.length
        }
    }

    for (const row of existingRows) {
        const { id, user_id: _userId, ...updates } = row
        const { data: updated, error: updateError } = await adminClient
            .from('amber_sessions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .eq('sync_source', 'ios')
            .select('id')
            .maybeSingle()

        if (updateError) {
            logSyncIssue('update_failed', updateError)
            return json({ error: 'Failed to save notes' }, { status: 500, headers: NO_STORE_HEADERS })
        }
        if (updated) synced += 1
    }

    return json({
        synced,
        skipped: notes.length - synced,
    }, { headers: NO_STORE_HEADERS })
}

// Allow preflight CORS for the iOS URLSession requests
export const OPTIONS = async ({ request }: RequestEvent) => {
    return new Response(null, {
        status: 204,
        headers: {
            ...corsPreflightHeaders(request),
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
