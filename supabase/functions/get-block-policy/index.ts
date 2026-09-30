/**
 * Edge Function: get-block-policy
 *
 * Server-authoritative endpoint that returns the current blocking policy for a user.
 * Clients NEVER decide when blocking is over; they request this function.
 *
 * This is the "Root" of the Resin system — all blocking decisions flow from here.
 *
 * Endpoint: POST /functions/v1/get-block-policy
 *
 * Request body:
 * {
 *   "user_id": "uuid",
 *   "categories_requested": ["youtube", "reddit"],  // optional; if omitted, return all active blocks
 *   "platform": "ios" | "extension" | "web",
 *   "device_id": "string"  // for audit trail
 * }
 *
 * Response:
 * {
 *   "user_id": "uuid",
 *   "timestamp": "2026-03-19T14:30:00Z",
 *   "blocks": [
 *     {
 *       "id": "uuid",
 *       "category_id": "youtube",
 *       "is_active": true,
 *       "server_start_time": "2026-03-19T14:30:00Z",
 *       "server_end_time": "2026-03-19T16:30:00Z",
 *       "seconds_remaining": 3600
 *     }
 *   ],
 *   "signature": "hmac-sha256(blocks_json, server_secret)"  // for tamper detection
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { jwtVerify } from 'https://esm.sh/jose@5.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BlockPolicy {
  id: string
  category_id: string
  is_active: boolean
  server_start_time: string
  server_end_time: string
  seconds_remaining: number
}

interface PolicyResponse {
  user_id: string
  timestamp: string
  blocks: BlockPolicy[]
  signature: string
}

// Initialize Supabase client with service role (bypasses RLS)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const jwtSecret = Deno.env.get('JWT_SECRET')!

const supabase = createClient(supabaseUrl, supabaseKey)
const MAX_REQUEST_BODY_BYTES = 16_000
const ALLOWED_PLATFORMS = new Set(['ios', 'extension', 'web'])
const SAFE_DEVICE_ID_RE = /^[a-zA-Z0-9._:-]{1,160}$/

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify request is authenticated
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = parseBearerToken(authHeader)
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Verify JWT using jose
    const secret = new TextEncoder().encode(jwtSecret)
    let verified
    try {
      verified = await jwtVerify(token, secret)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const userId = verified.payload.sub as string
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: no user ID in token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 2. Parse request body
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
    const { categories_requested, platform, device_id } = body as {
      categories_requested?: string[]
      platform?: string
      device_id?: string
    }
    const safePlatform = typeof platform === 'string' && ALLOWED_PLATFORMS.has(platform)
      ? platform
      : 'unknown'
    const safeDeviceId = typeof device_id === 'string' && SAFE_DEVICE_ID_RE.test(device_id)
      ? device_id
      : undefined
    const requestedCategories = Array.isArray(categories_requested)
      ? new Set(
          categories_requested
            .filter((category): category is string => typeof category === 'string')
            .map((category) => category.trim().toLowerCase())
            .filter((category) => /^[a-z0-9_-]{1,64}$/.test(category))
            .slice(0, 50)
        )
      : null

    // 3. Query active_blocks for this user
    const now = new Date()

    const { data: blocks, error: blocksError } = await supabase
      .from('active_blocks')
      .select('id, category_id, server_start_time, server_end_time')
      .eq('user_id', userId)
      .is('cancelled_by_user_at', null)
      .lte('server_start_time', now.toISOString())
      .gt('server_end_time', now.toISOString())

    if (blocksError) {
      console.error('[get-block-policy] active_blocks error')
      return new Response(
        JSON.stringify({ error: 'Failed to load active protection state' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 4. Query blocking_sessions for this user (Focus sessions)
    const { data: sessions, error: sessionsError } = await supabase
      .from('blocking_sessions')
      .select('id, start_time, end_time, title')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('start_time', now.toISOString())
      .gt('end_time', now.toISOString())

    if (sessionsError) {
      console.error('[get-block-policy] blocking_sessions error')
      return new Response(
        JSON.stringify({ error: 'Failed to load focus session state' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // 5. Combine and compute active blocks
    const results: BlockPolicy[] = []

    // A. Add explicit blocks from active_blocks table
    if (blocks) {
      for (const block of blocks) {
        const endTime = new Date(block.server_end_time)
        if (!requestedCategories || requestedCategories.has(block.category_id)) {
          results.push({
            id: block.id,
            category_id: block.category_id,
            is_active: true,
            server_start_time: block.server_start_time,
            server_end_time: block.server_end_time,
            seconds_remaining: Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))
          })
        }
      }
    }

    // B. Add "Focus Mode" blocks from matching sessions 
    // (If a session is active, we block all major categories by default)
    if (sessions && sessions.length > 0) {
      const defaultCategories = ['youtube', 'social', 'video', 'news', 'shopping']
      for (const session of sessions) {
        const endTime = new Date(session.end_time)
        const secondsRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))

        for (const cat of defaultCategories) {
          // Avoid duplicates if already in active_blocks
          if ((!requestedCategories || requestedCategories.has(cat)) && !results.some(r => r.category_id === cat)) {
            results.push({
              id: `session-${session.id}-${cat}`,
              category_id: cat,
              is_active: true,
              server_start_time: session.start_time,
              server_end_time: session.end_time,
              seconds_remaining: secondsRemaining
            })
          }
        }
      }
    }


    // 6. Log the policy request for audit trail
    const auditEvent = {
      user_id: userId,
      event_type: 'policy_requested',
      platform: safePlatform,
      device_id: safeDeviceId,
      num_blocks_returned: results.length,
      timestamp: now.toISOString()
    }

    // Fire and forget — don't block response on audit log
    supabase
      .from('block_audit_log')
      .insert({
        user_id: userId,
        event_type: 'policy_requested',
        event_details: auditEvent,
        platform: safePlatform
      })
      .then(() => console.log('[get-block-policy] Audit logged'))
      .catch(() => console.error('[get-block-policy] Audit log error'))

    // 7. Build response with server timestamp (never client-controlled)
    const response: PolicyResponse = {
      user_id: userId,
      timestamp: now.toISOString(),
      blocks: results,
      signature: ''  // Computed below
    }

    // 8. Sign the response to prevent tampering.
    response.signature = await signPolicy(results, response.timestamp, jwtSecret)

    console.log('[get-block-policy] Returning policy with', results.length, 'active blocks')

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch {
    console.error('[get-block-policy] Unexpected error')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

Deno.serve(handler)

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

async function signPolicy(blocks: BlockPolicy[], timestamp: string, secretValue: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretValue),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${JSON.stringify(blocks)}.${timestamp}`)
  )
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
