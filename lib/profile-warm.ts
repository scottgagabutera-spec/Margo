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
  signatureSongId: string | null
  isPrivate: boolean
  followListsPrivate: boolean
  artistLinks: ArtistApplicationLinks
  coverUrl: string | null
  whoCanMessage: 'everyone' | 'followers' | 'no_one'
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
    signatureSongId: (data.signature_song_id as string | null) ?? null,
    isPrivate: !!data.is_private,
    followListsPrivate: !!data.follow_lists_private,
    artistLinks: (links && typeof links === 'object' ? links : {}) as ArtistApplicationLinks,
    coverUrl: (data.cover_url as string | null) ?? null,
    whoCanMessage: (data.who_can_message as WarmProfileRow['whoCanMessage']) || 'everyone',
  }
}

export function peekProfileCache(username: string): WarmProfileBundle | null {
  const hit = cache.get(username.toLowerCase())
  if (!hit?.data) return null
  return hit.data
}

function bundleFromPeekPayload(payload: Record<string, unknown>): WarmProfileBundle | null {
  if (!payload.ok) return null
  const p = payload.profile as Record<string, unknown> | undefined
  if (!p?.id || !p.username) return null
  return {
    profile: mapRow({
      id: p.id,
      username: p.username,
      display_name: p.displayName ?? p.display_name,
      is_artist: p.isArtist ?? p.is_artist,
      artist_status: p.artistStatus ?? p.artist_status,
      bio: p.bio,
      avatar_url: p.avatarUrl ?? p.avatar_url,
      cover_url: p.coverUrl ?? p.cover_url,
      signature_lyric: p.signatureLyric ?? p.signature_lyric,
      signature_song: p.signatureSong ?? p.signature_song,
      signature_artist: p.signatureArtist ?? p.signature_artist,
      signature_song_id: p.signatureSongId ?? p.signature_song_id,
      is_private: p.isPrivate ?? p.is_private,
      follow_lists_private: p.followListsPrivate ?? p.follow_lists_private,
      artist_links: p.artistLinks ?? p.artist_links,
      who_can_message: p.whoCanMessage ?? p.who_can_message,
    }),
    followerCount: Math.max(0, Number(payload.followerCount) || 0),
    followingCount: Math.max(0, Number(payload.followingCount) || 0),
    loadedAt: Date.now(),
  }
}

export async function fetchProfilePeek(username: string): Promise<WarmProfileBundle | null> {
  const { data, error } = await supabase.rpc('profile_peek_for_username', {
    p_username: username,
  })
  if (error || !data || typeof data !== 'object') return null
  return bundleFromPeekPayload(data as Record<string, unknown>)
}

export async function fetchProfileBundle(username: string): Promise<WarmProfileBundle | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_artist, artist_status, bio, avatar_url, cover_url, signature_lyric, signature_song, signature_artist, signature_song_id, is_private, follow_lists_private, who_can_message, artist_links, followers_count, following_count')
    .eq('username', username)
    .maybeSingle()

  if (!error && data) {
    return {
      profile: mapRow(data as Record<string, unknown>),
      followerCount: Math.max(0, Number(data.followers_count) || 0),
      followingCount: Math.max(0, Number(data.following_count) || 0),
      loadedAt: Date.now(),
    }
  }

  return fetchProfilePeek(username)
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
