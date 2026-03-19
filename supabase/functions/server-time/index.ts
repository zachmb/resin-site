/**
 * Edge Function: server-time
 *
 * Returns a server-signed JWT containing the current UTC timestamp.
 * iOS app verifies this signature and compares to device time.
 * If drift > 300 seconds, triggers emergency hardening.
 *
 * Endpoint: GET /functions/v1/server-time
 *
 * Response:
 * {
 *   "server_time": "2026-03-19T14:30:00.000Z",
 *   "timestamp_ms": 1711012200000,
 *   "iat": 1711012200,
 *   "exp": 1711012260,
 *   "alg": "HS256",
 *   "signature": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */

import { SignJWT, jwtVerify } from 'https://esm.sh/jose@5.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retrieve the shared secret from Supabase environment
// This secret is used to sign the JWT
const timeSecretKey = Deno.env.get('RESIN_TIME_SECRET')!

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const now = new Date()
    const nowSeconds = Math.floor(now.getTime() / 1000)
    const expiresAt = nowSeconds + 60  // Signature valid for 60 seconds

    // Encode the secret as bytes
    const secret = new TextEncoder().encode(timeSecretKey)

    // Create a signed JWT with server time
    // Using HS256 (HMAC-SHA256) for simplicity while maintaining security
    // The iOS app will verify this signature using the same secret
    const jwt = await new SignJWT({
      server_time: now.toISOString(),
      timestamp_ms: now.getTime(),
      nonce: Math.random().toString(36).substring(7),  // Prevent replay
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(nowSeconds)
      .setExpirationTime(expiresAt)
      .sign(secret)

    // Return both the JWT and decoded claims for easier parsing on iOS
    const response = {
      server_time: now.toISOString(),
      timestamp_ms: now.getTime(),
      iat: nowSeconds,
      exp: expiresAt,
      alg: 'HS256',
      jwt: jwt,
    }

    console.log('[server-time] Generated signed timestamp for device')

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (err) {
    console.error('[server-time] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

Deno.serve(handler)
