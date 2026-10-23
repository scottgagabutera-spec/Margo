// app/api/posts/lyric-back/route.ts
//
// Create a Lyric Back (reply post). Same architecture as posts/moment:
// verify session from cookie, then insert via service role with the
// requested visibility enforced server-side — never trust client status.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { isNotificationAllowed } from '@/lib/notification-prefs'
import { resolveLyricBackStoredEmotion } from '@/lib/moment/vibe'

const MAX_TEXT = 500
const MAX_SONG = 300
const MAX_ARTIST = 300

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

function trimExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('http://') && !s.startsWith('https://')) return null
  return s
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  let body: {
    parentPostId?: string | null
    isPrivate?: boolean
    text?: string
    emotion?: string
    songId?: string | null
    songTitle?: string
    artistName?: string
    artworkUrl?: string | null
    snippetStartSec?: number | null
    snippetEndSec?: number | null
    externalListenUrl?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const songTitle = typeof body.songTitle === 'string' ? body.songTitle.trim() : ''
  const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : ''
  const emotionRaw = typeof body.emotion === 'string' ? body.emotion : undefined

  if (!text || !songTitle || !artistName) {
    return NextResponse.json({ error: 'Lyric, song, and artist are required.' }, { status: 400 })
  }
  if (text.length > MAX_TEXT || songTitle.length > MAX_SONG || artistName.length > MAX_ARTIST) {
    return NextResponse.json({ error: 'One of the fields is too long.' }, { status: 400 })
  }

  const parentPostId = body.parentPostId ?? null
  const isPrivate = body.isPrivate === true
  const status = isPrivate ? 'private' : 'active'
  const artworkUrl =
    typeof body.artworkUrl === 'string' && body.artworkUrl.trim() ? body.artworkUrl.trim() : null
  const externalListenUrl = trimExternalUrl(body.externalListenUrl)

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  let parentAuthorId: string | null = null
  let parentEmotion: string | null = null

  if (parentPostId) {
    const { data: parent, error: parentErr } = await admin
      .from('posts')
      .select('id, status, author_profile_id, emotion')
      .eq('id', parentPostId)
      .maybeSingle()
    if (parentErr || !parent) {
      return NextResponse.json({ error: 'The Moment you are replying to could not be found.' }, { status: 400 })
    }
    if (parent.status !== 'active') {
      return NextResponse.json({ error: 'You can only reply to a public Moment.' }, { status: 400 })
    }
    parentAuthorId = parent.author_profile_id ?? null
    parentEmotion = typeof parent.emotion === 'string' ? parent.emotion : null
  }

  const resolvedEmotion = resolveLyricBackStoredEmotion(emotionRaw, parentEmotion)
  if (!resolvedEmotion.ok) {
    return NextResponse.json({ error: 'Invalid vibe.' }, { status: 400 })
  }
  const emotion = resolvedEmotion.emotion

  const insertRow: Record<string, unknown> = {
    text,
    emotion,
    status,
    song_id: body.songId || null,
    song_title: songTitle,
    artist_name: artistName,
    artwork_url: artworkUrl,
    author_profile_id: userId,
    parent_post_id: parentPostId,
    snippet_start_sec: body.snippetStartSec ?? null,
    snippet_end_sec: body.snippetEndSec ?? null,
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

  let body: { postId?: string; text?: string; emotion?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const postId = typeof body.postId === 'string' ? body.postId.trim() : ''
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'Lyric is required.' }, { status: 400 })
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: 'One of the fields is too long.' }, { status: 400 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data: row, error: loadErr } = await admin
    .from('posts')
    .select('id, author_profile_id, parent_post_id, emotion')
    .eq('id', postId)
    .maybeSingle()

  if (loadErr || !row) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (row.author_profile_id !== userId) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  if (!row.parent_post_id) {
    return NextResponse.json({ error: 'Not a Lyric Back' }, { status: 400 })
  }

  let parentEmotion: string | null = null
  const { data: parent } = await admin
    .from('posts')
    .select('emotion')
    .eq('id', row.parent_post_id)
    .maybeSingle()
  parentEmotion = typeof parent?.emotion === 'string' ? parent.emotion : null

  const emotionRaw = typeof body.emotion === 'string' ? body.emotion : undefined
  let emotion = typeof row.emotion === 'string' ? row.emotion : ''
  if (emotionRaw !== undefined) {
    const resolved = resolveLyricBackStoredEmotion(emotionRaw, parentEmotion)
    if (!resolved.ok) {
      return NextResponse.json({ error: 'Invalid vibe.' }, { status: 400 })
    }
    emotion = resolved.emotion
  }

  const { error: updateErr } = await admin
    .from('posts')
    .update({ text, emotion })
    .eq('id', postId)
    .eq('author_profile_id', userId)

  if (updateErr) {
    console.error('[posts/lyric-back PATCH] failed:', updateErr)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: postId })
}
