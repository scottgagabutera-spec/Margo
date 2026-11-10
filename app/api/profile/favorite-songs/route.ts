import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { favoriteSongsTablesReady } from '@/lib/favorites/table-ready'
import { loadProfileFavoriteSongs } from '@/lib/profile/load-favorite-songs'

type FavoriteRow = {
  catalogSongId: string
  position: number
  artworkUrl?: string | null
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(request: NextRequest) {
  const ready = await favoriteSongsTablesReady()
  if (!ready) {
    return NextResponse.json({ favorites: [], ready: false })
  }
  const profileId = request.nextUrl.searchParams.get('profileId')?.trim()
  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  }
  const favorites = await loadProfileFavoriteSongs(profileId)
  return NextResponse.json({ favorites, ready: true })
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (!(await favoriteSongsTablesReady())) {
    return NextResponse.json({ error: 'Feature not available', ready: false }, { status: 503 })
  }

  let body: { favorites?: FavoriteRow[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const items = body.favorites
  if (!Array.isArray(items) || items.length > 10) {
    return NextResponse.json({ error: 'Invalid favorites' }, { status: 400 })
  }

  const seenPos = new Set<number>()
  const seenSong = new Set<string>()
  for (const item of items) {
    if (typeof item.position !== 'number' || item.position < 0 || item.position > 9) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
    }
    if (seenPos.has(item.position) || seenSong.has(item.catalogSongId)) {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 400 })
    }
    seenPos.add(item.position)
    seenSong.add(item.catalogSongId)
  }

  const admin = getSupabaseAdmin()
  const { error: delErr } = await admin.from('profile_favorite_songs').delete().eq('profile_id', userId)
  if (delErr) {
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  if (items.length > 0) {
    const { error: insErr } = await admin.from('profile_favorite_songs').insert(
      items.map((item) => ({
        profile_id: userId,
        catalog_song_id: item.catalogSongId,
        position: item.position,
      })),
    )
    if (insErr) {
      console.error('[favorite-songs] put', insErr)
      return NextResponse.json({ error: 'Could not save' }, { status: 500 })
    }
    for (const item of items) {
      const url = item.artworkUrl?.trim()
      if (!url) continue
      await admin
        .from('catalog_songs')
        .update({ artwork_url: url })
        .eq('id', item.catalogSongId)
        .is('artwork_url', null)
    }
  }

  return NextResponse.json({ ok: true })
}
