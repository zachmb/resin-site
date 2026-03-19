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

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify JWT using jose
    const secret = new TextEncoder().encode(jwtSecret)
    let verified
    try {
      verified = await jwtVerify(token, secret)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token', details: e.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = verified.payload.sub as string
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: no user ID in token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const { categories_requested, platform, device_id } = body as {
      categories_requested?: string[]
      platform?: string
      device_id?: string
    }

    // 3. Query active_blocks for this user from Supabase
    // The query uses server_start_time and server_end_time (set by server, not client)
    const now = new Date()

    let query = supabase
      .from('active_blocks')
      .select('id, category_id, server_start_time, server_end_time')
      .eq('user_id', userId)
      .is('cancelled_by_user_at', null)  // Don't return cancelled blocks

    // If specific categories requested, filter
    if (categories_requested && categories_requested.length > 0) {
      query = query.in('category_id', categories_requested)
    }

    const { data: blocks, error } = await query

    if (error) {
      console.error('[get-block-policy] Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Compute which blocks are currently active (server-side)
    const activeBlocks: BlockPolicy[] = (blocks || [])
      .filter(block => {
        const startTime = new Date(block.server_start_time)
        const endTime = new Date(block.server_end_time)
        return now >= startTime && now < endTime
      })
      .map(block => {
        const endTime = new Date(block.server_end_time)
        const secondsRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))

        return {
          id: block.id,
          category_id: block.category_id,
          is_active: true,  // Already filtered above
          server_start_time: block.server_start_time,
          server_end_time: block.server_end_time,
          seconds_remaining: secondsRemaining
        }
      })

    // 5. Log the policy request for audit trail
    const auditEvent = {
      user_id: userId,
      event_type: 'policy_requested',
      platform,
      device_id,
      num_blocks_returned: activeBlocks.length,
      timestamp: now.toISOString()
    }

    // Fire and forget — don't block response on audit log
    supabase
      .from('block_audit_log')
      .insert({
        user_id: userId,
        event_type: 'policy_requested',
        event_details: auditEvent,
        platform: platform || 'unknown'
      })
      .then(() => console.log('[get-block-policy] Audit logged'))
      .catch(err => console.error('[get-block-policy] Audit log error:', err))

    // 6. Build response with server timestamp (never client-controlled)
    const response: PolicyResponse = {
      user_id: userId,
      timestamp: now.toISOString(),
      blocks: activeBlocks,
      signature: ''  // Computed below
    }

    // 7. Sign the response to prevent tampering
    // Client cannot forge this signature without the secret
    const signatureData = JSON.stringify(activeBlocks) + now.toISOString() + jwtSecret
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureData)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    response.signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log('[get-block-policy] Returning policy for user', userId, 'with', activeBlocks.length, 'active blocks')

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (err) {
    console.error('[get-block-policy] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

Deno.serve(handler)
