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

const supabase = createClient(supabaseUrl, supabaseKey)

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication via Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract user_id from JWT
    // In production, you'd verify the JWT signature here
    const token = authHeader.replace('Bearer ', '')
    // For now, we trust the Authorization header; Supabase middleware verifies it
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Parse request
    const body = await req.json()
    const { session_id, category_ids, block_entire_session } = body as {
      session_id: string
      category_ids: string[]
      block_entire_session?: boolean
    }

    if (!session_id || !category_ids || category_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id, category_ids' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 1. Fetch the amber session to get start/end times
    const { data: session, error: sessionError } = await supabase
      .from('amber_sessions')
      .select('id, status, display_title, amber_tasks(start_time, end_time)')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or unauthorized' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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
          { status: 400, headers: { 'Content-Type': 'application/json' } }
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
    const blocksToCreate = category_ids.map(category_id => ({
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
      console.error('[create-block-from-session] Insert error:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create blocks', details: createError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
          categories: category_ids
        },
        platform: 'server'
      })
      .catch(err => console.error('[create-block-from-session] Audit error:', err))

    console.log('[create-block-from-session] Created', createdBlocks?.length || 0, 'blocks for user', userId)

    return new Response(
      JSON.stringify({
        success: true,
        blocks_created: createdBlocks || [],
        message: `Created ${createdBlocks?.length || 0} active blocks. Propagating to all devices via Realtime.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (err) {
    console.error('[create-block-from-session] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

Deno.serve(handler)
