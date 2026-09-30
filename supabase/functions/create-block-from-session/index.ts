/**
 * Edge Function: create-block-from-session
 *
 * Triggered when a user activates an Amber session (brain dump → plan).
 * This function creates authoritative active_blocks entries that propagate
 * to all platforms in real-time via Supabase Realtime.
 *
 * This is the "Sap → Hardening" trigger point.
 *
 * Endpoint: POST /functions/v1/create-block-from-session
 *
 * Request body:
 * {
 *   "session_id": "uuid",
 *   "category_ids": ["youtube", "reddit"],  // which categories to block during this session
 *   "block_entire_session": boolean  // if true, block for entire session duration
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "blocks_created": [
 *     {
 *       "id": "uuid",
 *       "category_id": "youtube",
 *       "server_start_time": "...",
 *       "server_end_time": "..."
 *     }
 *   ]
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_CATEGORY_IDS = 20
const MAX_REQUEST_BODY_BYTES = 16_000
const MAX_BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000
const CATEGORY_ID_RE = /^[a-z0-9_-]{1,64}$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const supabase = createClient(supabaseUrl, supabaseKey)

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication via Authorization header
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = parseBearerToken(authHeader)
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Extract user_id from JWT
    // In production, you'd verify the JWT signature here
    // For now, we trust the Authorization header; Supabase middleware verifies it
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const userId = user.id

    // Parse request
    let body: Record<string, unknown>
    try {
      body = await readBoundedJsonBody(req, MAX_REQUEST_BODY_BYTES)
    } catch (error) {
      const status = error instanceof Error && error.message === 'request_body_too_large' ? 413 : 400
      return new Response(
        JSON.stringify({ error: status === 413 ? 'Request body too large' : 'Invalid JSON body' }),
        { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    const { session_id, category_ids, block_entire_session } = body as {
      session_id: string
      category_ids: string[]
      block_entire_session?: boolean
    }

    const normalizedCategoryIds = normalizeCategoryIds(category_ids)

    if (!session_id || typeof session_id !== 'string' || !UUID_RE.test(session_id) || normalizedCategoryIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id, category_ids' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (normalizedCategoryIds.length > MAX_CATEGORY_IDS) {
      return new Response(
        JSON.stringify({ error: `Too many categories; maximum is ${MAX_CATEGORY_IDS}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 1. Fetch the amber session to get start/end times
    const { data: session, error: sessionError } = await supabase
      .from('amber_sessions')
      .select('id, status, display_title, amber_tasks(start_time, end_time)')
      .eq('id', session_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or unauthorized' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const blockWindowMs = blockEndTime.getTime() - blockStartTime.getTime()
    if (blockWindowMs <= 0 || blockWindowMs > MAX_BLOCK_WINDOW_MS) {
      return new Response(
        JSON.stringify({ error: 'Invalid block window' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 2. Determine block duration
    let blockStartTime: Date
    let blockEndTime: Date

    if (block_entire_session && session.amber_tasks && session.amber_tasks.length > 0) {
      // Use the span of all tasks
      const tasks = session.amber_tasks as any[]
      const startTimes = tasks.map(t => new Date(t.start_time)).filter(t => !isNaN(t.getTime()))
      const endTimes = tasks.map(t => new Date(t.end_time)).filter(t => !isNaN(t.getTime()))

      if (startTimes.length === 0 || endTimes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Session has no valid task times' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      blockStartTime = new Date(Math.min(...startTimes.map(t => t.getTime())))
      blockEndTime = new Date(Math.max(...endTimes.map(t => t.getTime())))
    } else {
      // Default: block for 90 minutes from now
      blockStartTime = new Date()
      blockEndTime = new Date(blockStartTime.getTime() + 90 * 60 * 1000)
    }

    // 3. Create active_blocks entries (one per category)
    const blocksToCreate = normalizedCategoryIds.map(category_id => ({
      user_id: userId,
      category_id,
      session_id,
      server_start_time: blockStartTime.toISOString(),
      server_end_time: blockEndTime.toISOString()
    }))

    const { data: createdBlocks, error: createError } = await supabase
      .from('active_blocks')
      .insert(blocksToCreate)
      .select('id, category_id, server_start_time, server_end_time')

    if (createError) {
      console.error('[create-block-from-session] Insert error')
      return new Response(
        JSON.stringify({ error: 'Failed to create blocks' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 4. Log audit event
    await supabase
      .from('block_audit_log')
      .insert({
        user_id: userId,
        event_type: 'created',
        event_details: {
          session_id,
          num_blocks: createdBlocks?.length || 0,
          categories: normalizedCategoryIds
        },
        platform: 'server'
      })
      .catch(() => console.error('[create-block-from-session] Audit error'))

    console.log('[create-block-from-session] Created', createdBlocks?.length || 0, 'blocks')

    return new Response(
      JSON.stringify({
        success: true,
        blocks_created: createdBlocks || [],
        message: `Created ${createdBlocks?.length || 0} active blocks. Propagating to all devices via Realtime.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch {
    console.error('[create-block-from-session] Unexpected error')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

Deno.serve(handler)

function normalizeCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(
    value
      .filter((categoryId): categoryId is string => typeof categoryId === 'string')
      .map(categoryId => categoryId.trim().toLowerCase())
      .filter(categoryId => CATEGORY_ID_RE.test(categoryId))
  ))
}

function parseBearerToken(authHeader: string): string | null {
  const match = authHeader.match(/^Bearer\s+([A-Za-z0-9._-]+)$/)
  return match?.[1] ?? null
}

async function readBoundedJsonBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('request_body_too_large')
  }

  const rawBody = await req.text()
  if (rawBody.length > maxBytes) {
    throw new Error('request_body_too_large')
  }

  const parsed = JSON.parse(rawBody) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_json_body')
  }

  return parsed as Record<string, unknown>
}
