// app/api/posts/moment/route.ts
//
// Delete / Edit for a user's own Moment. Same architecture as
// app/api/delete-account/route.ts: verify the caller's real session from
// their cookie, then call a SECURITY DEFINER RPC (service role) that
// re-checks ownership server-side before touching anything. Ownership is
// never trusted from client-supplied post data.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

function getAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) return null
  return data.user.id
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  let body: { postId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { error } = await admin.rpc('delete_own_post', {
    p_post_id: body.postId,
    p_user_id: userId,
  })

  if (error) {
    // Logged server-side only — the raw RPC message can include row-level
    // detail (e.g. another user's id when an ownership check fails) that
    // has no reason to reach the caller. The generic message is enough for
    // the client to show a retry prompt.
    console.error('[posts/moment DELETE] failed:', error)
    return NextResponse.json(
      { error: 'Could not delete this Moment. Please try again.' },
      { status: 500 },
    )
  }
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  let body: { postId?: string; lines?: Array<Record<string, unknown>> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.postId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'postId and at least one line are required' }, { status: 400 })
  }
  if (body.lines.length > 3) {
    return NextResponse.json({ error: 'Moments can hold up to 3 lines.' }, { status: 400 })
  }
  // Fast-fail before the DB round trip. The RPC enforces the same ceiling
  // as the actual security boundary (this check is a cheap UX/DoS
  // shortcut, not a substitute for it) — the client-side 140-char
  // textarea limit in EditMomentModal is UI-only and trivially bypassed
  // by calling this route directly.
  const tooLong = body.lines.some((line) => {
    const text = typeof line?.text === 'string' ? line.text : ''
    const song = typeof line?.song_title === 'string' ? line.song_title : ''
    const artist = typeof line?.artist_name === 'string' ? line.artist_name : ''
    return text.length > 500 || song.length > 300 || artist.length > 300
  })
  if (tooLong) {
    return NextResponse.json({ error: 'One of the lines is too long.' }, { status: 400 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { error } = await admin.rpc('update_own_moment', {
    p_post_id: body.postId,
    p_user_id: userId,
    p_lines: body.lines,
  })

  if (error) {
    console.error('[posts/moment PATCH] failed:', error)
    return NextResponse.json(
      { error: 'Could not save your changes. Please try again.' },
      { status: 500 },
    )
  }
  return NextResponse.json({ success: true })
}
