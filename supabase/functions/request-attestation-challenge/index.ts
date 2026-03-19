/**
 * Edge Function: request-attestation-challenge
 *
 * Generates a one-time nonce for iOS App Attest.
 * This prevents replay attacks by ensuring each attestation uses a unique, time-limited nonce.
 *
 * Endpoint: POST /functions/v1/request-attestation-challenge
 *
 * Request:
 * - Requires Authorization header with valid JWT
 *
 * Response:
 * {
 *   "nonce": "a1b2c3d4e5f6g7h8...",
 *   "expires_in": 300
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { jwtVerify } from 'https://esm.sh/jose@5.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwtSecret = Deno.env.get('JWT_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Verify request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const secret = new TextEncoder().encode(jwtSecret)

    let verified
    try {
      verified = await jwtVerify(token, secret)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
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

    // 2. Generate a cryptographically random nonce (32 bytes = 64 hex chars)
    const nonceBuffer = crypto.getRandomValues(new Uint8Array(32))
    const nonce = Array.from(nonceBuffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // 3. Store nonce in database (linked to user)
    const { error: insertError } = await supabase
      .from('attestation_challenges')
      .insert({
        user_id: userId,
        nonce: nonce,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('[attestation-challenge] Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create challenge', details: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[attestation-challenge] Generated nonce for user', userId)

    // 4. Return nonce to client
    return new Response(
      JSON.stringify({
        nonce: nonce,
        expires_in: 300, // 5 minutes in seconds
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (err) {
    console.error('[attestation-challenge] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

Deno.serve(handler)
