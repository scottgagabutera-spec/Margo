// app/api/posts/lyric-back/route.ts
//
// Create a Lyric Back (reply post). Same architecture as posts/moment:
// verify session from cookie, then insert via service role with the
// requested visibility enforced server-side — never trust client status.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isNotificationAllowed } from '@/lib/notification-prefs'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import {
  lyricBackChildDepthAllowed,
  lyricBackDepthCapErrorMessage,
  lyricBackPostDepth,
} from '@/lib/lyric-back-depth-server'
import { parseLyricBackWriteBody } from '@/lib/lyric-back-request'
import { moderateOwnedPostText } from '@/lib/server-post-moderation'
import {
  guardLyricBackPatchWithChildren,
  recheckChildLockBeforeWrite,
} from '@/lib/post-edit-child-lock-server'
import type { LyricBackWriteSnapshot } from '@/lib/post-edit-child-lock'

const PATCHES_PER_HOUR = 30

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

async function notifyParentLyricBack(
  admin: ReturnType<typeof getAdmin>,
  opts: {
    parentPostId: string
    parentAuthorId: string
    actorId: string
  },
): Promise<void> {
  if (!admin) return
  const { parentPostId, parentAuthorId, actorId } = opts
  if (parentAuthorId === actorId) return

  try {
    const allowed = await isNotificationAllowed(admin, parentAuthorId, 'lyricBack')
    if (!allowed) return

    const { error } = await admin.from('notifications').insert({
      recipient_id: parentAuthorId,
      actor_id: actorId,
      type: 'lyric_back',
      post_id: parentPostId,
    })
    if (error) {
      console.error('[posts/lyric-back POST] lyric_back notification failed:', error)
    }
  } catch (err) {
    console.error('[posts/lyric-back POST] lyric_back notification failed:', err)
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = parseLyricBackWriteBody(json)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }
  const {
    text,
    songTitle,
    artistName,
    emotion,
    songId,
    artworkUrl,
    snippetStartSec,
    snippetEndSec,
    externalListenUrl,
  } = parsed.body

  const parentPostId =
    json && typeof json === 'object' && 'parentPostId' in json
      ? (json as { parentPostId?: string | null }).parentPostId ?? null
      : null
  const isPrivate =
    json && typeof json === 'object' && (json as { isPrivate?: boolean }).isPrivate === true
  const status = isPrivate ? 'private' : 'active'

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  let parentAuthorId: string | null = null

  if (parentPostId) {
    const { data: parent, error: parentErr } = await admin
      .from('posts')
      .select('id, status, author_profile_id')
      .eq('id', parentPostId)
      .maybeSingle()
    if (parentErr || !parent) {
      return NextResponse.json({ error: 'The Moment you are replying to could not be found.' }, { status: 400 })
    }
    if (parent.status !== 'active') {
      return NextResponse.json({ error: 'You can only reply to a public Moment.' }, { status: 400 })
    }
    parentAuthorId = parent.author_profile_id ?? null

    const parentDepth = await lyricBackPostDepth(admin, parentPostId)
    if (parentDepth === null) {
      return NextResponse.json({ error: 'The Moment you are replying to could not be found.' }, { status: 400 })
    }
    if (!lyricBackChildDepthAllowed(parentDepth)) {
      return NextResponse.json({ error: lyricBackDepthCapErrorMessage() }, { status: 400 })
    }
  }

  const insertRow: Record<string, unknown> = {
    text,
    emotion,
    status,
    song_id: songId,
    song_title: songTitle,
    artist_name: artistName,
    artwork_url: artworkUrl,
    author_profile_id: userId,
    parent_post_id: parentPostId,
    snippet_start_sec: snippetStartSec,
    snippet_end_sec: snippetEndSec,
  }
  if (externalListenUrl) {
    insertRow.external_listen_url = externalListenUrl
  }

  let { data, error } = await admin.from('posts').insert(insertRow).select('id, status').single()

  if (error && externalListenUrl && /external_listen_url/.test(error.message || '')) {
    delete insertRow.external_listen_url
    const retry = await admin.from('posts').insert(insertRow).select('id, status').single()
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    console.error('[posts/lyric-back POST] failed:', error)
    return NextResponse.json(
      { error: 'Could not send your Lyric Back. Please try again.' },
      { status: 500 },
    )
  }

  if (parentPostId && !isPrivate && parentAuthorId) {
    await notifyParentLyricBack(admin, {
      parentPostId,
      parentAuthorId,
      actorId: userId,
    })
  }

  return NextResponse.json({ id: data.id, status: data.status })
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const limited = await consumeHourlyApiRateLimit({
    route: 'posts/lyric-back-patch',
    bucket: userId,
    limit: PATCHES_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many edits. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const postId =
    json && typeof json === 'object' && typeof (json as { postId?: string }).postId === 'string'
      ? (json as { postId: string }).postId
      : ''
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const parsed = parseLyricBackWriteBody(json)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: row, error: loadErr } = await admin
    .from('posts')
    .select('id, author_profile_id, parent_post_id, content_removed_at, status, text, song_id, song_title, artist_name, snippet_start_sec, snippet_end_sec')
    .eq('id', postId)
    .maybeSingle()

  if (loadErr || !row) {
    return NextResponse.json({ error: 'This Lyric Back could not be found.' }, { status: 404 })
  }
  if (row.author_profile_id !== userId) {
    return NextResponse.json({ error: 'You can only edit your own Lyric Back.' }, { status: 403 })
  }
  if (row.content_removed_at) {
    return NextResponse.json({ error: 'This Lyric Back can no longer be edited.' }, { status: 400 })
  }
  if (!row.parent_post_id) {
    return NextResponse.json({ error: 'Only Lyric Backs can be edited here.' }, { status: 400 })
  }

  const {
    text,
    songTitle,
    artistName,
    emotion,
    songId,
    artworkUrl,
    snippetStartSec,
    snippetEndSec,
    externalListenUrl,
  } = parsed.body

  const after: LyricBackWriteSnapshot = {
    text,
    songId,
    songTitle,
    artistName,
    snippetStartSec,
    snippetEndSec,
  }
  const before: LyricBackWriteSnapshot = {
    text: row.text ?? '',
    songId: row.song_id ?? null,
    songTitle: row.song_title ?? '',
    artistName: row.artist_name ?? '',
    snippetStartSec: row.snippet_start_sec ?? null,
    snippetEndSec: row.snippet_end_sec ?? null,
  }
  const lock = await guardLyricBackPatchWithChildren(admin, postId, before, after)
  if (!lock.ok) {
    return NextResponse.json({ error: lock.error, code: 'edit_locked' }, { status: 400 })
  }
  const songOrLineChanged = before.text !== after.text
    || before.songId !== after.songId
    || before.songTitle !== after.songTitle
    || before.artistName !== after.artistName
    || before.snippetStartSec !== after.snippetStartSec
    || before.snippetEndSec !== after.snippetEndSec
  const recheck = await recheckChildLockBeforeWrite(admin, postId, songOrLineChanged)
  if (!recheck.ok) {
    return NextResponse.json({ error: recheck.error, code: 'edit_locked' }, { status: 400 })
  }

  await moderateOwnedPostText({ text, postId, authorId: userId })

  const updateRow: Record<string, unknown> = {
    text,
    emotion,
    song_id: songId,
    song_title: songTitle,
    artist_name: artistName,
    artwork_url: artworkUrl,
    snippet_start_sec: snippetStartSec,
    snippet_end_sec: snippetEndSec,
    external_listen_url: externalListenUrl,
  }
  if (!externalListenUrl) {
    updateRow.external_listen_url = null
  }

  let { error: updateErr } = await admin.from('posts').update(updateRow).eq('id', postId)

  if (updateErr && externalListenUrl && /external_listen_url/.test(updateErr.message || '')) {
    delete updateRow.external_listen_url
    const retry = await admin.from('posts').update(updateRow).eq('id', postId)
    updateErr = retry.error
  }

  if (updateErr) {
    console.error('[posts/lyric-back PATCH] failed:', updateErr)
    return NextResponse.json(
      { error: 'Could not save your Lyric Back. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    id: postId,
    text,
    emotion,
    songTitle,
    artistName,
    songId,
    snippetStartSec,
    snippetEndSec,
    externalListenUrl,
    artworkUrl,
  })
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

  const { data, error } = await admin.rpc('delete_or_shell_own_lyric_back', {
    p_post_id: body.postId,
    p_user_id: userId,
  })

  if (error) {
    console.error('[posts/lyric-back DELETE] rpc failed:', error)
    const msg = `${error.message || ''} ${error.code || ''}`
    if (/permission denied|42501|does not own|not a Lyric Back/i.test(msg)) {
      return NextResponse.json({ error: 'Could not delete this Lyric Back.' }, { status: 403 })
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ error: 'This Lyric Back could not be found.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Could not delete this Lyric Back.' }, { status: 500 })
  }

  const outcome =
    data && typeof data === 'object' && (data as { outcome?: string }).outcome === 'shelled'
      ? 'shelled'
      : 'deleted'
  return NextResponse.json({ success: true, outcome })
}
