import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { notifyMemoryOwner } from '@/lib/memory/notify-owner'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'

type Ctx = { params: Promise<{ id: string }> }

export type MemoryReplyRow = {
  id: string
  kind: 'text' | 'lyric'
  body: string
  songId: string | null
  songTitle: string | null
  artistName: string | null
  lyricExcerpt: string | null
  artworkUrl: string | null
  createdAt: string
  actorId: string
  actorUsername: string
  actorAvatarUrl: string | null
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const admin = getSupabaseAdmin()

  const { data: rows, error } = await admin
    .from('memory_lyric_backs')
    .select('id, kind, body, song_id, song_title, artist_name, lyric_excerpt, created_at, actor_id')
    .eq('memory_id', id)
    .is('content_removed_at', null)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    console.error('[memories/replies GET]', error)
    return NextResponse.json({ replies: [] })
  }

  const songIds = [...new Set((rows || []).map((r) => r.song_id).filter(Boolean))] as string[]
  const art = new Map<string, string | null>()
  if (songIds.length) {
    const { data: songs } = await admin.from('songs').select('id, artwork_url').in('id', songIds)
    for (const s of songs || []) art.set(s.id as string, (s.artwork_url as string | null) ?? null)
  }

  const actorIds = [...new Set((rows || []).map((r) => r.actor_id as string))]
  const profMap = new Map<string, { username: string; avatar_url: string | null }>()
  if (actorIds.length) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, avatar_url, is_admin')
      .in('id', actorIds)
    for (const p of profs || []) {
      if (p.is_admin) continue
      profMap.set(p.id as string, {
        username: p.username as string,
        avatar_url: (p.avatar_url as string | null) ?? null,
      })
    }
  }

  const replies: MemoryReplyRow[] = (rows || [])
    .map((r) => {
      const prof = profMap.get(r.actor_id as string)
      if (!prof) return null
      return {
        id: r.id as string,
        kind: ((r.kind as string) === 'text' ? 'text' : 'lyric') as 'text' | 'lyric',
        body: r.body as string,
        songId: (r.song_id as string | null) ?? null,
        songTitle: (r.song_title as string | null) ?? null,
        artistName: (r.artist_name as string | null) ?? null,
        lyricExcerpt: (r.lyric_excerpt as string | null) ?? null,
        artworkUrl: r.song_id ? art.get(r.song_id as string) ?? null : null,
        createdAt: r.created_at as string,
        actorId: r.actor_id as string,
        actorUsername: prof.username,
        actorAvatarUrl: prof.avatar_url,
      }
    })
    .filter(Boolean) as MemoryReplyRow[]

  return NextResponse.json({ replies })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: {
    kind?: 'text' | 'lyric'
    body?: string
    songId?: string
    songTitle?: string
    artistName?: string
    lyricExcerpt?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const kind = body.kind === 'lyric' ? 'lyric' : 'text'
  const text = (body.body || '').trim()
  if (text.length < 1 || text.length > 500) {
    return NextResponse.json({ error: 'Reply text required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: memory } = await admin
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('id', id)
    .is('content_removed_at', null)
    .maybeSingle()

  if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ownerId = memory.owner_profile_id as string

  const { error: insErr } = await admin.from('memory_lyric_backs').insert({
    memory_id: id,
    actor_id: user.id,
    body: text,
    kind,
    song_id: kind === 'lyric' ? body.songId || null : null,
    song_title: kind === 'lyric' ? body.songTitle || null : null,
    artist_name: kind === 'lyric' ? body.artistName || null : null,
    lyric_excerpt: kind === 'lyric' ? body.lyricExcerpt || null : null,
  })

  if (insErr) {
    console.error('[memories/replies POST]', insErr)
    return NextResponse.json({ error: 'Could not save reply' }, { status: 400 })
  }

  await notifyMemoryOwner(admin, {
    memoryId: id,
    ownerId,
    actorId: user.id,
    type: kind === 'lyric' ? 'memory_lyric_reply' : 'memory_reply',
  })

  return NextResponse.json({ ok: true })
}
