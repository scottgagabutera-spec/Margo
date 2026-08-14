import { createClient } from '@/lib/supabase/client'
import type { ArtistStatus } from '@/components/artist-badge'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'

const supabase = createClient()
const STALE_MS = 60_000

export interface WarmProfileRow {
  id: string
  username: string
  displayName: string
  isArtist: boolean
  artistStatus: ArtistStatus
  bio: string | null
  avatarUrl: string | null
  signatureLyric: string | null
  signatureSong: string | null
  signatureArtist: string | null
  isPrivate: boolean
  artistLinks: ArtistApplicationLinks
}

export interface WarmProfileBundle {
  profile: WarmProfileRow
  followerCount: number
  followingCount: number
  loadedAt: number
}

const cache = new Map<string, { data: WarmProfileBundle | null; inflight: Promise<WarmProfileBundle | null> | null }>()

function mapRow(data: Record<string, unknown>): WarmProfileRow {
  const links = data.artist_links
  return {
    id: data.id as string,
    username: data.username as string,
    displayName: data.display_name as string,
    isArtist: !!data.is_artist,
    artistStatus: (data.artist_status as ArtistStatus) ?? null,
    bio: (data.bio as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    signatureLyric: (data.signature_lyric as string | null) ?? null,
    signatureSong: (data.signature_song as string | null) ?? null,
    signatureArtist: (data.signature_artist as string | null) ?? null,
    isPrivate: !!data.is_private,
    artistLinks: (links && typeof links === 'object' ? links : {}) as ArtistApplicationLinks,
  }
}

export function peekProfileCache(username: string): WarmProfileBundle | null {
  const hit = cache.get(username.toLowerCase())
  if (!hit?.data) return null
  return hit.data
}

export async function fetchProfileBundle(username: string): Promise<WarmProfileBundle | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_artist, artist_status, bio, avatar_url, signature_lyric, signature_song, signature_artist, is_private, artist_links')
    .eq('username', username)
    .maybeSingle()

  if (error || !data) return null

  const [followers, following] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true })
      .eq('followee_id', data.id).eq('status', 'accepted'),
    supabase.from('follows').select('*', { count: 'exact', head: true })
      .eq('follower_id', data.id).eq('status', 'accepted'),
  ])

  return {
    profile: mapRow(data as Record<string, unknown>),
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    loadedAt: Date.now(),
  }
}

export function warmProfile(username: string, opts?: { force?: boolean }): Promise<WarmProfileBundle | null> {
  const key = username.toLowerCase()
  const force = opts?.force === true
  const existing = cache.get(key)
  const fresh = existing?.data && Date.now() - existing.data.loadedAt <= STALE_MS
  if (!force && fresh && existing?.data) return Promise.resolve(existing.data)
  if (!force && existing?.inflight) return existing.inflight

  const p = fetchProfileBundle(username).then((bundle) => {
    const slot = cache.get(key) || { data: bundle as WarmProfileBundle, inflight: null }
    slot.inflight = null
    if (bundle) slot.data = bundle
    cache.set(key, slot)
    return bundle
  }).catch((err) => {
    const slot = cache.get(key)
    if (slot) slot.inflight = null
    throw err
  })

  cache.set(key, { data: existing?.data ?? null, inflight: p })
  return p
}
