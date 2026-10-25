// app/api/posts/moment/route.ts
//
// Delete / Edit for a user's own Moment. Same architecture as
// app/api/delete-account/route.ts: verify the caller's real session from
// their cookie, then call a SECURITY DEFINER RPC (service role) that
// re-checks ownership server-side before touching anything. Ownership is
// never trusted from client-supplied post data.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeEmotionKey } from '@/lib/moment/vibe'
import {
  guardMomentPatchWithChildren,
  recheckChildLockBeforeWrite,
} from '@/lib/post-edit-child-lock-server'
import type { MomentLineSnapshot } from '@/lib/post-edit-child-lock'

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

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { error } = await admin.rpc('delete_own_post', {
    p_post_id: body.postId,
    p_user_id: userId,
  })

  if (error) {
    console.error('[posts/moment DELETE] rpc failed:', error)

    const rpcMissing = /delete_own_post|42883|does not exist/i.test(
      `${error.message || ''} ${error.code || ''}`,
    )

    if (rpcMissing) {
      const supabase = await createServerSupabase()
      const { data: owned, error: ownerErr } = await supabase
        .from('posts')
        .select('id')
        .eq('id', body.postId)
        .eq('author_profile_id', userId)
        .maybeSingle()

      if (ownerErr || !owned) {
        return NextResponse.json({ error: 'Could not delete this Moment. Please try again.' }, { status: 403 })
      }

      const { error: deleteErr } = await supabase
        .from('posts')
        .delete()
        .eq('id', body.postId)
        .eq('author_profile_id', userId)

      if (deleteErr) {
        console.error('[posts/moment DELETE] rls fallback failed:', deleteErr)
        return NextResponse.json(
          { error: 'Could not delete this Moment. Please try again.' },
          { status: 500 },
        )
      }
      return NextResponse.json({ success: true })
    }

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

  let body: { postId?: string; lines?: Array<Record<string, unknown>>; emotion?: string }
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

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: row, error: loadErr } = await admin
    .from('posts')
    .select('id, author_profile_id, content_removed_at, parent_post_id, text, song_id, song_title, artist_name, snippet_start_sec, snippet_end_sec')
    .eq('id', body.postId)
    .maybeSingle()

  if (loadErr || !row) {
    return NextResponse.json({ error: 'This post could not be found.' }, { status: 404 })
  }
  if (row.author_profile_id !== userId) {
    return NextResponse.json({ error: 'You can only edit your own post.' }, { status: 403 })
  }
  if (row.content_removed_at) {
    return NextResponse.json({ error: 'This post can no longer be edited.' }, { status: 400 })
  }
  if (row.parent_post_id) {
    return NextResponse.json({ error: 'Use Lyric Back edit for Lyric Backs.' }, { status: 400 })
  }

  const line0 = body.lines[0] ?? {}
  const after: MomentLineSnapshot = {
    text: typeof line0.text === 'string' ? line0.text : '',
    songId: typeof line0.song_id === 'string' && line0.song_id ? line0.song_id : null,
    songTitle: typeof line0.song_title === 'string' ? line0.song_title : '',
    artistName: typeof line0.artist_name === 'string' ? line0.artist_name : '',
    snippetStart: typeof line0.snippet_start_sec === 'number' ? line0.snippet_start_sec : null,
    snippetEnd: typeof line0.snippet_end_sec === 'number' ? line0.snippet_end_sec : null,
  }
  const before: MomentLineSnapshot = {
    text: row.text ?? '',
    songId: row.song_id ?? null,
    songTitle: row.song_title ?? '',
    artistName: row.artist_name ?? '',
    snippetStart: row.snippet_start_sec ?? null,
    snippetEnd: row.snippet_end_sec ?? null,
  }
  const lock = await guardMomentPatchWithChildren(admin, body.postId, before, after)
  if (!lock.ok) {
    return NextResponse.json({ error: lock.error, code: 'edit_locked' }, { status: 400 })
  }
  const recheck = await recheckChildLockBeforeWrite(
    admin,
    body.postId,
    before.text !== after.text
      || before.songId !== after.songId
      || before.songTitle !== after.songTitle
      || before.artistName !== after.artistName
      || before.snippetStart !== after.snippetStart
      || before.snippetEnd !== after.snippetEnd,
  )
  if (!recheck.ok) {
    return NextResponse.json({ error: recheck.error, code: 'edit_locked' }, { status: 400 })
  }

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

  if (typeof body.emotion === 'string' && body.emotion.trim()) {
    const emotionKey = normalizeEmotionKey(body.emotion.trim())
    const allowed = new Set([
      'chill', 'hope', 'healing', 'grateful', 'spiritual', 'nostalgia', 'joy', 'love',
      'hype', 'proud', 'heartbreak', 'pain', 'loneliness', 'lost', 'rage', 'sendit', 'letout',
    ])
    if (allowed.has(emotionKey)) {
      await admin.from('posts').update({ emotion: emotionKey }).eq('id', body.postId)
    }
  }

  return NextResponse.json({ success: true })
}
