import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadProfileFavoriteArtists } from '@/lib/profile/load-favorite-artists'
import {
  favoriteArtworkFromSettings,
  mergeFavoriteArtworkSettings,
} from '@/lib/profile/favorite-artist-artwork-settings'
import { replaceProfileFavoriteArtists } from '@/lib/favorites/replace-favorites-rpc'

type FavoriteRow = {
  catalogArtistId: string
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
  const profileId = request.nextUrl.searchParams.get('profileId')?.trim()
  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  }

  const favorites = await loadProfileFavoriteArtists(profileId)
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
  const rpcRows = items.map((item) => ({
    catalogArtistId: item.catalogArtistId,
    position: item.position,
  }))
  const replaced = await replaceProfileFavoriteArtists(userId, rpcRows)
  if (!replaced.ok) {
    if (replaced.rpcMissing) {
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
          console.error('[favorite-artists] put legacy', insErr)
          return NextResponse.json({ error: 'Could not save' }, { status: 500 })
        }
      }
    } else {
      return NextResponse.json({ error: 'Could not save' }, { status: 500 })
    }
  }

  const artworkPatch: Record<string, string> = {}
  for (const item of items) {
    const url = item.artworkUrl?.trim()
    if (url) artworkPatch[item.catalogArtistId] = url
  }
  if (Object.keys(artworkPatch).length > 0) {
    const { data: prof } = await admin.from('profiles').select('settings').eq('id', userId).maybeSingle()
    const nextSettings = mergeFavoriteArtworkSettings(
      (prof?.settings as Record<string, unknown> | null) ?? null,
      artworkPatch,
    )
    await admin.from('profiles').update({ settings: nextSettings }).eq('id', userId)
  }

  return NextResponse.json({ ok: true })
}
