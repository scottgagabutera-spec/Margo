import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'

type FavoriteRow = {
  catalogArtistId: string
  position: number
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId')?.trim()
  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: links, error } = await admin
    .from('profile_favorite_artists')
    .select('position, catalog_artist_id')
    .eq('profile_id', profileId)
    .order('position', { ascending: true })

  if (error || !links?.length) {
    if (error) console.error('[favorite-artists] get', error)
    return NextResponse.json({ favorites: [] })
  }

  const artistIds = links.map((r) => r.catalog_artist_id as string)
  const { data: artists } = await admin
    .from('catalog_artists')
    .select('id, name, artwork_r2_key, margo_profile_id')
    .in('id', artistIds)

  const artistMap = new Map((artists || []).map((a) => [a.id as string, a]))
  const profileIds = [...new Set((artists || []).map((a) => a.margo_profile_id).filter(Boolean))] as string[]
  const profileUsernames = new Map<string, { username: string; is_admin: boolean; avatarUrl: string | null }>()
  if (profileIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, is_admin, avatar_url, is_artist')
      .in('id', profileIds)
    for (const p of profs || []) {
      if (!p.is_artist) continue
      profileUsernames.set(p.id as string, {
        username: p.username as string,
        is_admin: !!p.is_admin,
        avatarUrl: ((p.avatar_url as string | null)?.trim() || null),
      })
    }
  }

  const favorites = links.map((row) => {
    const ca = artistMap.get(row.catalog_artist_id as string)
    if (!ca) return null
    const prof = ca.margo_profile_id ? profileUsernames.get(ca.margo_profile_id as string) : undefined
    const username = prof && !prof.is_admin ? prof.username : null
    const r2Art = ca.artwork_r2_key ? publicCatalogMediaUrl(ca.artwork_r2_key as string) : null
    return {
      position: row.position as number,
      id: ca.id as string,
      name: ca.name as string,
      artworkUrl: r2Art ?? (username ? prof?.avatarUrl ?? null : null),
      onMargo: !!username,
      margoUsername: username,
    }
  }).filter(Boolean)

  return NextResponse.json({ favorites })
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
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
  const seenArtist = new Set<string>()
  for (const item of items) {
    if (typeof item.position !== 'number' || item.position < 0 || item.position > 9) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
    }
    if (seenPos.has(item.position) || seenArtist.has(item.catalogArtistId)) {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 400 })
    }
    seenPos.add(item.position)
    seenArtist.add(item.catalogArtistId)
  }

  const admin = getSupabaseAdmin()
  const { error: delErr } = await admin.from('profile_favorite_artists').delete().eq('profile_id', userId)
  if (delErr) {
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  if (items.length > 0) {
    const { error: insErr } = await admin.from('profile_favorite_artists').insert(
      items.map((item) => ({
        profile_id: userId,
        catalog_artist_id: item.catalogArtistId,
        position: item.position,
      })),
    )
    if (insErr) {
      console.error('[favorite-artists] put', insErr)
      return NextResponse.json({ error: 'Could not save' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
