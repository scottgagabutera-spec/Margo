// app/api/posts/lyric-back/route.ts
//
// Create a Lyric Back (reply post). Same architecture as posts/moment:
// verify session from cookie, then insert via service role with the
// requested visibility enforced server-side — never trust client status.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

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
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const songTitle = typeof body.songTitle === 'string' ? body.songTitle.trim() : ''
  const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : ''
  const emotion = typeof body.emotion === 'string' ? body.emotion.trim() : ''

  if (!text || !songTitle || !artistName || !emotion) {
    return NextResponse.json({ error: 'Lyric, song, artist, and vibe are required.' }, { status: 400 })
  }
  if (text.length > MAX_TEXT || songTitle.length > MAX_SONG || artistName.length > MAX_ARTIST) {
    return NextResponse.json({ error: 'One of the fields is too long.' }, { status: 400 })
  }

  const parentPostId = body.parentPostId ?? null
  const isPrivate = body.isPrivate === true
  const status = isPrivate ? 'private' : 'active'

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  if (parentPostId) {
    const { data: parent, error: parentErr } = await admin
      .from('posts')
      .select('id, status')
      .eq('id', parentPostId)
      .maybeSingle()
    if (parentErr || !parent) {
      return NextResponse.json({ error: 'The Moment you are replying to could not be found.' }, { status: 400 })
    }
    if (parent.status !== 'active') {
      return NextResponse.json({ error: 'You can only reply to a public Moment.' }, { status: 400 })
    }
  }

  const { data, error } = await admin
    .from('posts')
    .insert({
      text,
      emotion,
      status,
      song_id: body.songId || null,
      song_title: songTitle,
      artist_name: artistName,
      artwork_url: parentPostId ? null : (body.artworkUrl || null),
      author_profile_id: userId,
      parent_post_id: parentPostId,
      snippet_start_sec: body.snippetStartSec ?? null,
      snippet_end_sec: body.snippetEndSec ?? null,
    })
    .select('id, status')
    .single()

  if (error || !data) {
    console.error('[posts/lyric-back POST] failed:', error)
    return NextResponse.json(
      { error: 'Could not send your Lyric Back. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ id: data.id, status: data.status })
}
