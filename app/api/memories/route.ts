import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMemoryPublic } from '@/lib/memory/assemble'
import { assembleMemoriesPublicBatch } from '@/lib/memory/assemble-batch'
import { validateMemoryCreatePayload } from '@/lib/memory/validate-payload'
import type { MemoryPhotoInput, MemorySongInput, MemoryVisibility } from '@/lib/memory/types'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId')?.trim()
  const username = request.nextUrl.searchParams.get('username')?.trim()
  if (!profileId && !username) {
    return NextResponse.json({ error: 'profileId or username required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null

  let ownerId = profileId
  if (!ownerId && username) {
    const admin = getSupabaseAdmin()
    const { data: prof } = await admin.from('profiles').select('id, is_admin').eq('username', username).maybeSingle()
    if (!prof || prof.is_admin) return NextResponse.json({ memories: [] })
    ownerId = prof.id as string
  }

  const { data: rows, error } = await supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('owner_profile_id', ownerId)
    .is('content_removed_at', null)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    console.error('[memories] list', error)
    return NextResponse.json({ memories: [] })
  }

  const memories = await assembleMemoriesPublicBatch(rows || [], viewerId)

  const isOwner = viewerId === ownerId
  if (!isOwner) {
    const filtered = memories.filter((m) => m.visibility !== 'only_me')
    return NextResponse.json({ memories: filtered, isOwner: false })
  }
  return NextResponse.json({ memories, isOwner: true })
}

type CreateBody = {
  title?: string
  story?: string
  mood?: string
  visibility?: MemoryVisibility
  showInLyricsFeed?: boolean
  showDatePublicly?: boolean
  dateGranularity?: string
  dateStart?: string | null
  dateEnd?: string | null
  songs?: MemorySongInput[]
  photos?: MemoryPhotoInput[]
  coverR2Key?: string | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const songs = (body.songs || []).slice(0, 30)
  const photos = (body.photos || []).slice(0, 10)
  const story = (body.story || '').trim().slice(0, 500) || null
  const title = (body.title || '').trim().slice(0, 80)

  const payloadErr = validateMemoryCreatePayload({
    title,
    songs,
    photos,
    story: story || '',
  })
  if (payloadErr) return NextResponse.json({ error: payloadErr }, { status: 400 })
  const mood = (body.mood || '').trim().slice(0, 40) || null
  const visibility = (body.visibility || 'public') as MemoryVisibility
  const allowedVis = new Set(['public', 'followers', 'only_me'])
  if (!allowedVis.has(visibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const coverKey =
    body.coverR2Key?.trim()
    || (body.photos?.[0]?.r2Key ?? null)

  const { data: memory, error: insErr } = await admin
    .from('memories')
    .insert({
      owner_profile_id: user.id,
      title,
      story,
      mood,
      visibility,
      show_in_lyrics_feed: body.showInLyricsFeed !== false,
      show_date_publicly: body.showDatePublicly !== false,
      date_granularity: body.dateGranularity || 'none',
      date_start: body.dateStart || null,
      date_end: body.dateEnd || null,
      cover_r2_key: coverKey,
    })
    .select(MEMORY_ROW_SELECT)
    .single()

  if (insErr || !memory) {
    console.error('[memories] create', insErr)
    return NextResponse.json({ error: 'Could not create memory' }, { status: 500 })
  }

  const memoryId = memory.id as string

  if (songs.length) {
    await admin.from('memory_songs').insert(
      songs.map((s, i) => ({
        memory_id: memoryId,
        position: s.position ?? i,
        song_id: s.songId || null,
        song_title: s.songTitle,
        artist_name: s.artistName,
        lyric_excerpt: s.lyricExcerpt || null,
        is_lyric_only: s.isLyricOnly,
      })),
    )
  }

  if (photos.length) {
    await admin.from('memory_photos').insert(
      photos.map((p, i) => ({
        memory_id: memoryId,
        position: p.position ?? i,
        r2_key: p.r2Key,
        width: p.width ?? null,
        height: p.height ?? null,
      })),
    )
  }

  const pub = await assembleMemoryPublic(memory, user.id)
  return NextResponse.json({ memory: pub })
}
