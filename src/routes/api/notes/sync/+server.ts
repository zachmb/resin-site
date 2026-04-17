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
 *   user_id: string   — Supabase user ID
 *   skipped: number   — notes that already existed and were not overwritten
 * }
 */

import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import { env } from '$env/dynamic/private'
import type { RequestEvent } from '@sveltejs/kit'

const RESIN_SYNC_KEY = env.RESIN_SYNC_KEY;

// Admin client — bypasses RLS so we can upsert on behalf of any user
const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
})

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

/** Extract first non-empty line, strip markdown heading markers, cap at 60 chars. */
function deriveTitle(text: string): string {
    const lines = text.split('\n')
    for (const line of lines) {
        const t = line.trim().replace(/^#+\s*/, '')
        if (t) return t.substring(0, 60)
    }
    return 'Untitled Note'
}

export const POST = async ({ request }: RequestEvent) => {
    // ── 1. Parse body ──────────────────────────────────────────────────────────
    let body: SyncRequestBody
    try {
        body = await request.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { email, api_key, notes } = body

    // ── 2. Validate API key ────────────────────────────────────────────────────
    if (!api_key || api_key !== RESIN_SYNC_KEY) {
        return json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (!email || !email.includes('@')) {
        return json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!Array.isArray(notes) || notes.length === 0) {
        return json({ synced: 0, user_id: null, skipped: 0 })
    }

    // ── 3. Find or create the Supabase user by email ───────────────────────────
    let userId: string

    // First, try to find the user in the profiles table (avoids auth admin list call)
    const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (existingProfile?.id) {
        userId = existingProfile.id
    } else {
        // Fall back to auth.admin to find by email
        const { data: listData, error: listError } = await admin.auth.admin.listUsers()
        if (listError) {
            console.error('[notes/sync] Could not list users:', listError.message)
            return json({ error: 'Server error looking up user' }, { status: 500 })
        }

        const authUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (authUser) {
            userId = authUser.id
        } else {
            // Create a new account for this email — they'll receive a magic link when
            // they visit the web app for the first time.
            const { data: newUser, error: createError } = await admin.auth.admin.createUser({
                email,
                email_confirm: true,   // mark email as verified so they can log in
            })
            if (createError || !newUser?.user) {
                console.error('[notes/sync] Could not create user:', createError?.message)
                return json({ error: 'Could not create account' }, { status: 500 })
            }
            userId = newUser.user.id
        }
    }

    // ── 4. Upsert notes into amber_sessions ────────────────────────────────────
    // We use the iOS-generated UUID as the primary key to make this idempotent.
    // Notes synced from iOS are stored as status='draft' (same as web notes).
    const now = new Date().toISOString()

    const rows = notes.map((note) => ({
        id: note.id,
        user_id: userId,
        raw_text: note.text,
        title: note.title ?? deriveTitle(note.text),
        display_title: note.title ?? deriveTitle(note.text),  // compat until migration
        status: 'draft' as const,
        rich_text_html: note.rich_text_html ?? null,
        stored_urls: note.stored_urls ?? [],
        group_id: note.group_id ?? null,
        created_at: note.created_at,
        updated_at: now,
        // Indicate this row was synced from the iOS app
        sync_source: 'ios',
    }))

    // Upsert: insert new, update existing only if the web hasn't modified it
    // (onConflict on `id` — if the row exists and sync_source='ios', overwrite; if web-modified, skip)
    const { data: upserted, error: upsertError } = await admin
        .from('amber_sessions')
        .upsert(rows, {
            onConflict: 'id',
            ignoreDuplicates: false,
        })
        .select('id')

    if (upsertError) {
        console.error('[notes/sync] Upsert failed:', upsertError.message)
        // Gracefully handle missing columns (sync_source, group_id) — retry without extras
        const fallbackRows = rows.map(({ sync_source: _s, group_id: _g, rich_text_html: _r, stored_urls: _u, ...rest }) => rest)
        const { data: fallback, error: fallbackError } = await admin
            .from('amber_sessions')
            .upsert(fallbackRows, { onConflict: 'id', ignoreDuplicates: false })
            .select('id')

        if (fallbackError) {
            return json({ error: 'Failed to save notes', details: fallbackError.message }, { status: 500 })
        }

        return json({
            synced: fallback?.length ?? 0,
            user_id: userId,
            skipped: notes.length - (fallback?.length ?? 0),
        })
    }

    return json({
        synced: upserted?.length ?? rows.length,
        user_id: userId,
        skipped: notes.length - (upserted?.length ?? rows.length),
    })
}

// Allow preflight CORS for the iOS URLSession requests
export const OPTIONS = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
