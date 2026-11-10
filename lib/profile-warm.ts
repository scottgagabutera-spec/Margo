import { createClient } from '@/lib/supabase/client'
import { dispatchProfileSurfaceReady } from '@/lib/profile/surface-ready'
import type { ArtistStatus } from '@/components/artist-badge'
import type { ArtistApplicationLinks } from '@/lib/artist-music-group'
import type { ProfileFavoriteArtist } from '@/components/profile-favorite-artists-row'
import type { MemoryPublic } from '@/lib/memory/types'

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
  postsCount: number
  /** Present when peek RPC includes the viewer's follow row (authenticated). */
  viewerFollowStatus?: 'pending' | 'accepted' | null
  favoriteArtists?: ProfileFavoriteArtist[]
  memories?: MemoryPublic[]
  memoriesIsOwner?: boolean
  surfaceLoadedAt?: number
  loadedAt: number
}

const cache = new Map<string, { data: WarmProfileBundle | null; inflight: Promise<WarmProfileBundle | null> | null }>()
const surfaceInflight = new Map<string, Promise<void>>()

export const PROFILE_SURFACE_STALE_MS = STALE_MS

export function clearProfileWarmCache() {
  cache.clear()
  surfaceInflight.clear()
}

export function profileHasRenderableCache(username: string): boolean {
  const hit = peekProfileCache(username)
  return !!hit?.profile
}

function surfaceIsFresh(bundle: WarmProfileBundle | null | undefined): boolean {
  return !!(
    bundle?.surfaceLoadedAt
    && Date.now() - bundle.surfaceLoadedAt <= STALE_MS
  )
}

function mergeSurfaceIntoBundle(
  bundle: WarmProfileBundle,
  surface: NonNullable<Awaited<ReturnType<typeof fetchProfileSurfaceExtras>>>,
) {
  bundle.favoriteArtists = surface.favoriteArtists
  bundle.memories = surface.memories
  bundle.memoriesIsOwner = surface.memoriesIsOwner
  bundle.surfaceLoadedAt = Date.now()
  if (surface.viewerFollowStatus !== undefined) {
    bundle.viewerFollowStatus = surface.viewerFollowStatus
  }
}

export function prependProfileMemory(username: string, memory: MemoryPublic) {
  const peek = peekProfileSurface(username)
  const prev = peek?.memories ?? []
  patchProfileSurface(username, { memories: [memory, ...prev.filter((m) => m.id !== memory.id)] })
}

export function removeProfileMemory(username: string, memoryId: string) {
  const peek = peekProfileSurface(username)
  const prev = peek?.memories ?? []
  patchProfileSurface(username, { memories: prev.filter((m) => m.id !== memoryId) })
}

export async function revalidateProfileSurface(username: string): Promise<boolean> {
  const surface = await fetchProfileSurfaceExtras(username)
  if (!surface) return false
  const key = username.toLowerCase()
  const slot = cache.get(key)
  if (slot?.data) mergeSurfaceIntoBundle(slot.data, surface)
  else {
    patchProfileSurface(username, {
      favoriteArtists: surface.favoriteArtists,
      memories: surface.memories,
      memoriesIsOwner: surface.memoriesIsOwner,
    })
  }
  dispatchProfileSurfaceReady(username)
  return true
}

export function refreshProfileSurfaceIfStale(username: string): Promise<void> {
  const key = username.toLowerCase()
  const existing = surfaceInflight.get(key)
  if (existing) return existing

  const hit = cache.get(key)?.data
  if (!hit?.surfaceLoadedAt) {
    return Promise.resolve()
  }
  if (surfaceIsFresh(hit)) return Promise.resolve()

  const p = revalidateProfileSurface(username)
    .then(() => undefined)
    .finally(() => {
      surfaceInflight.delete(key)
    })
  surfaceInflight.set(key, p)
  return p
}

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

export function peekProfileSurface(username: string): {
  favoriteArtists: ProfileFavoriteArtist[]
  memories: MemoryPublic[]
  memoriesIsOwner: boolean
} | null {
  const hit = peekProfileCache(username)
  if (!hit?.surfaceLoadedAt) return null
  return {
    favoriteArtists: hit.favoriteArtists || [],
    memories: hit.memories || [],
    memoriesIsOwner: !!hit.memoriesIsOwner,
  }
}

export function patchProfileSurface(
  username: string,
  patch: Partial<{
    favoriteArtists: ProfileFavoriteArtist[]
    memories: MemoryPublic[]
    memoriesIsOwner: boolean
  }>,
) {
  const key = username.toLowerCase()
  const hit = cache.get(key)
  if (!hit?.data) return
  if (patch.favoriteArtists) hit.data.favoriteArtists = patch.favoriteArtists
  if (patch.memories) hit.data.memories = patch.memories
  if (patch.memoriesIsOwner !== undefined) hit.data.memoriesIsOwner = patch.memoriesIsOwner
  hit.data.surfaceLoadedAt = hit.data.surfaceLoadedAt ?? Date.now()
}

async function fetchProfileSurfaceExtras(username: string): Promise<{
  favoriteArtists: ProfileFavoriteArtist[]
  memories: MemoryPublic[]
  memoriesIsOwner: boolean
  viewerFollowStatus?: 'pending' | 'accepted' | null
} | null> {
  try {
    const res = await fetch(`/api/profile/surface?username=${encodeURIComponent(username)}`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      favoriteArtists?: ProfileFavoriteArtist[]
      memories?: MemoryPublic[]
      memoriesIsOwner?: boolean
      viewerFollowStatus?: 'pending' | 'accepted' | null
    }
    return {
      favoriteArtists: data.favoriteArtists || [],
      memories: data.memories || [],
      memoriesIsOwner: !!data.memoriesIsOwner,
      viewerFollowStatus: data.viewerFollowStatus,
    }
  } catch {
    return null
  }
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
    postsCount: Math.max(0, Number(payload.postsCount) || 0),
    viewerFollowStatus: normalizeViewerFollowStatus(payload.viewerFollowStatus),
    loadedAt: Date.now(),
  }
}

function normalizeViewerFollowStatus(raw: unknown): 'pending' | 'accepted' | null | undefined {
  if (raw === 'pending' || raw === 'accepted') return raw
  if (raw === null) return null
  return undefined
}

async function isConsumerVisibleUsernameClient(username: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile/is-public?username=${encodeURIComponent(username)}`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return false
    const body = await res.json().catch(() => ({}))
    return body?.visible === true
  } catch {
    return false
  }
}

export async function fetchProfilePeek(username: string): Promise<WarmProfileBundle | null> {
  if (!(await isConsumerVisibleUsernameClient(username))) return null
  const { data, error } = await supabase.rpc('profile_peek_for_username', {
    p_username: username,
  })
  if (error || !data || typeof data !== 'object') return null
  return bundleFromPeekPayload(data as Record<string, unknown>)
}

export async function fetchProfileBundle(username: string): Promise<WarmProfileBundle | null> {
  if (!(await isConsumerVisibleUsernameClient(username))) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_artist, artist_status, bio, avatar_url, cover_url, signature_lyric, signature_song, signature_artist, signature_song_id, is_private, follow_lists_private, who_can_message, artist_links, followers_count, following_count, posts_count')
    .eq('username', username)
    .maybeSingle()

  if (!error && data) {
    return {
      profile: mapRow(data as Record<string, unknown>),
      followerCount: Math.max(0, Number(data.followers_count) || 0),
      followingCount: Math.max(0, Number(data.following_count) || 0),
      postsCount: Math.max(0, Number(data.posts_count) || 0),
      loadedAt: Date.now(),
    }
  }

  return fetchProfilePeek(username)
}

export function warmProfile(username: string, opts?: { force?: boolean }): Promise<WarmProfileBundle | null> {
  const key = username.toLowerCase()
  const force = opts?.force === true
  const existing = cache.get(key)
  const bundleFresh = existing?.data && Date.now() - existing.data.loadedAt <= STALE_MS

  if (!force && existing?.data && bundleFresh) {
    if (surfaceIsFresh(existing.data)) {
      return Promise.resolve(existing.data)
    }
    void refreshProfileSurfaceIfStale(username)
    return Promise.resolve(existing.data)
  }

  if (!force && existing?.inflight) return existing.inflight

  const p = fetchProfileBundle(username).then((bundle) => {
    const slot = cache.get(key) || { data: bundle as WarmProfileBundle | null, inflight: null }
    slot.inflight = null
    if (bundle) {
      const prior = slot.data
      slot.data = {
        ...bundle,
        favoriteArtists: prior?.favoriteArtists,
        memories: prior?.memories,
        memoriesIsOwner: prior?.memoriesIsOwner,
        surfaceLoadedAt: prior?.surfaceLoadedAt,
        viewerFollowStatus: prior?.viewerFollowStatus ?? bundle.viewerFollowStatus,
      }
      cache.set(key, slot)
      if (surfaceIsFresh(slot.data)) {
        return slot.data
      }
      void fetchProfileSurfaceExtras(username).then((surface) => {
        if (!surface) return
        const current = cache.get(key)
        if (!current?.data) return
        mergeSurfaceIntoBundle(current.data, surface)
        cache.set(key, current)
        dispatchProfileSurfaceReady(username)
      })
    } else {
      cache.set(key, slot)
    }
    return slot.data ?? bundle
  }).catch((err) => {
    const slot = cache.get(key)
    if (slot) slot.inflight = null
    throw err
  })

  cache.set(key, { data: existing?.data ?? null, inflight: p })
  return p
}
