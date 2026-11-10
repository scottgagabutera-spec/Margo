/**
 * Intention-warm cache for primary tabs.
 * Fetches data without mounting panes or enabling Realtime (Phase 1.5–2 fence).
 */
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/hooks/usePosts'
import type { Song } from '@/hooks/useSongs'
import { mapPostLinesRows } from '@/lib/post-lines'
import { resolveCatalogArtworkUrl } from '@/lib/post-artwork'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'
import { warmProfile } from '@/lib/profile-warm'
import { embedProfile, resolvePublicArtistCredit } from '@/lib/artist-identity'
import { parseAtmosphere, SONG_POST_EMBED, type AtmosphereId } from '@/lib/atmosphere'
import { isMomentsCurationClientEnabled } from '@/lib/moments/curation-config'
import { applyPostContentRemoved } from '@/lib/post-content-removed'
import type { CuratedMomentStored } from '@/lib/moments/curated-types'
import { bindFeedPostsCache, evictFeedPostFromCache, filterOutDeletedPosts } from '@/lib/feed-post-evict'
import { DISCOVER_HOME_BATCH } from '@/lib/discover-home-batch'

const supabase = createClient()

export const PRIMARY_TAB_STALE_MS = 60_000

/** Vibed line used by Discover Moments / Mixtapes / vibe filters. */
export type LyricMomentRow = {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
  songId: string
  songTitle: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  vibes: string[]
  atmosphere?: AtmosphereId
}

// ── Posts (Feed / Discover resonance) ────────────────────────────────

const POST_SELECT = `
  id,
  text,
  emotion,
  status,
  song_id,
  song_title,
  artist_name,
  artwork_url,
  youtube_video_id,
  youtube_title,
  youtube_thumbnail,
  youtube_channel,
  youtube_url,
  legacy_author_label,
  author_profile_id,
  created_at,
  content_removed_at,
  snippet_start_sec,
  snippet_end_sec,
  profiles:author_profile_id ( username, display_name, avatar_url ),
  post_stats ( resonate_count, echo_count, replay_count ),
  songs:song_id ( ${SONG_POST_EMBED} ),
  post_lines (
    id,
    position,
    text,
    song_id,
    song_title,
    artist_name,
    artwork_url,
    snippet_start_sec,
    snippet_end_sec,
    source,
    songs:song_id ( ${SONG_POST_EMBED} )
  )
`

function mapPostRow(row: any): Post {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
  const linkedSong = Array.isArray(row.songs) ? row.songs[0] : row.songs

  return applyPostContentRemoved({
    id: row.id,
    text: row.text ?? undefined,
    emotion: row.emotion ?? undefined,
    status: row.status ?? undefined,
    knowledge: (row.song_title || row.artist_name || row.artwork_url || linkedSong?.artwork_url || row.song_id)
      ? {
          song: row.song_title ?? linkedSong?.title ?? undefined,
          artist: row.artist_name ?? linkedSong?.artist_display_name ?? undefined,
          artwork: resolveCatalogArtworkUrl(row.artwork_url, linkedSong),
        }
      : undefined,
    youtubeMeta: row.youtube_video_id
      ? {
          videoId: row.youtube_video_id,
          title: row.youtube_title,
          thumbnail: row.youtube_thumbnail,
          thumbnailSm: row.youtube_thumbnail,
          channel: row.youtube_channel,
          youtubeUrl: row.youtube_url,
          embedUrl: `https://www.youtube.com/embed/${row.youtube_video_id}`,
        }
      : null,
    username: profile?.username ?? row.legacy_author_label ?? null,
    authorUid: row.author_profile_id ?? null,
    authorAvatarUrl: profile?.avatar_url ?? null,
    authorDisplayName: profile?.display_name ?? null,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
    resonates: stats?.resonate_count ?? 0,
    replies: stats?.echo_count ?? 0,
    replays: stats?.replay_count ?? 0,
    songId: row.song_id ?? null,
    audioUrl: linkedSong?.audio_url ?? null,
    snippetStart: row.snippet_start_sec ?? null,
    snippetEnd: row.snippet_end_sec ?? null,
    isAiGenerated: linkedSong?.is_ai_generated ?? false,
    atmosphere: parseAtmosphere(linkedSong?.atmosphere),
    catalogArtworkUrl: resolveCatalogArtworkUrl(row.artwork_url, linkedSong),
    lines: mapPostLinesRows(row.post_lines, resolveCatalogArtworkUrl(row.artwork_url, linkedSong)),
    contentRemovedAt: row.content_removed_at ?? null,
  })
}

type CacheEntry<T> = {
  data: T | null
  loadedAt: number
  inflight: Promise<T> | null
}

const postsCache: CacheEntry<Post[]> = { data: null, loadedAt: 0, inflight: null }
bindFeedPostsCache(postsCache)
export { evictFeedPostFromCache }

export const FEED_PAGE_SIZE = 200
export const FEED_OLDER_PAGE_SIZE = 40

export async function fetchFeedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .is('parent_post_id', null)
    .is('content_removed_at', null)
    .not('status', 'in', '("hidden","private","sent")')
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

  if (error) {
    console.error('fetchFeedPosts: failed', error)
    return []
  }
  return filterOutDeletedPosts((data ?? []).map(mapPostRow))
}

/** Older page for feed “ocean” — cursor is ISO timestamp strictly before the oldest visible post. */
export async function fetchFeedPostsOlder(beforeCreatedAtIso: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .is('parent_post_id', null)
    .is('content_removed_at', null)
    .not('status', 'in', '("hidden","private","sent")')
    .lt('created_at', beforeCreatedAtIso)
    .order('created_at', { ascending: false })
    .limit(FEED_OLDER_PAGE_SIZE)

  if (error) {
    console.error('fetchFeedPostsOlder: failed', error)
    return []
  }
  return filterOutDeletedPosts((data ?? []).map(mapPostRow))
}

export function peekFeedPostsCache(): { data: Post[]; loadedAt: number } | null {
  if (!postsCache.data || postsCache.data.length === 0) return null
  return { data: postsCache.data, loadedAt: postsCache.loadedAt }
}

/** Deduped fetch; safe to call from hover/touch before the tab mounts. */
export function warmFeedPosts(opts?: { force?: boolean }): Promise<Post[]> {
  const force = opts?.force === true
  const fresh =
    postsCache.data &&
    Date.now() - postsCache.loadedAt <= PRIMARY_TAB_STALE_MS
  if (!force && fresh && postsCache.data) {
    return Promise.resolve(postsCache.data)
  }
  if (!force && postsCache.inflight) return postsCache.inflight

  const p = fetchFeedPosts().then((rows) => {
    if (rows.length === 0 && postsCache.data && postsCache.data.length > 0) {
      postsCache.inflight = null
      return postsCache.data
    }
    const filtered = filterOutDeletedPosts(rows)
    postsCache.data = filtered
    postsCache.loadedAt = Date.now()
    postsCache.inflight = null
    return filtered
  }).catch((err) => {
    postsCache.inflight = null
    throw err
  })
  postsCache.inflight = p
  return p
}

// ── Songs catalog (light — no lyric_lines) ───────────────────────────

const SONGS_SELECT_LIGHT = `
  id, title, artist_display_name, artwork_url, audio_url, description,
  status, coming_soon_label, order, youtube_url, spotify_url,
  apple_music_url, soundcloud_url, audiomack_url, boomplay_url,
  duration_sec, created_at, is_ai_generated, atmosphere,
  song_stats ( plays, resonate_count, lyric_uses ),
  profiles!owner_profile_id ( username, display_name )
`

interface RawSongRow {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  audio_url: string | null
  description: string | null
  status: string
  coming_soon_label: string | null
  order: number | null
  youtube_url: string | null
  spotify_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  audiomack_url: string | null
  boomplay_url: string | null
  duration_sec: number | null
  created_at: string
  is_ai_generated: boolean
  atmosphere: string | null
  song_stats: { plays: number; resonate_count: number; lyric_uses: number }[] | null
  profiles?: { username?: string | null; display_name?: string | null } | { username?: string | null; display_name?: string | null }[] | null
}

export function transformSongRowLight(row: RawSongRow): Song {
  const stats = row.song_stats?.[0]
  const profile = embedProfile(row.profiles)
  return {
    id: row.id,
    title: row.title,
    artist: resolvePublicArtistCredit({
      artistDisplayName: row.artist_display_name,
      ownerDisplayName: profile.display_name,
      ownerUsername: profile.username,
    }),
    artwork: row.artwork_url,
    audioUrl: row.audio_url,
    description: row.description,
    status: row.status,
    comingSoonLabel: row.coming_soon_label,
    order: row.order,
    youtubeUrl: row.youtube_url,
    spotifyUrl: row.spotify_url,
    appleMusicUrl: row.apple_music_url,
    soundcloudUrl: row.soundcloud_url,
    audiomackUrl: row.audiomack_url,
    boomplayUrl: row.boomplay_url,
    durationSec: row.duration_sec,
    plays: stats?.plays ?? 0,
    resonates: stats?.resonate_count ?? 0,
    lyricUses: stats?.lyric_uses ?? 0,
    createdAt: row.created_at,
    isAiGenerated: row.is_ai_generated ?? false,
    atmosphere: parseAtmosphere(row.atmosphere),
    lyricLines: [],
  }
}

const songsCache: CacheEntry<Song[]> = { data: null, loadedAt: 0, inflight: null }

type DiscoverSongsCache = CacheEntry<Song[]> & {
  nextOffset: number
  hasMore: boolean
}

const songsDiscoverCache: DiscoverSongsCache = {
  data: null,
  loadedAt: 0,
  inflight: null,
  nextOffset: 0,
  hasMore: true,
}

export async function fetchSongsLight(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_SELECT_LIGHT)
    .is('deleted_at', null)
    .not('status', 'eq', 'hidden')
    .not('status', 'eq', 'archived')
    .order('order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('fetchSongsLight: failed', error)
    return []
  }
  return ((data as unknown as RawSongRow[]) || []).map(transformSongRowLight)
}

export async function fetchSongsLightBatch(offset: number, limit: number): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_SELECT_LIGHT)
    .is('deleted_at', null)
    .not('status', 'eq', 'hidden')
    .not('status', 'eq', 'archived')
    .order('order', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('fetchSongsLightBatch: failed', error)
    return []
  }
  return ((data as unknown as RawSongRow[]) || []).map(transformSongRowLight)
}

export function peekSongsDiscoverCache(): { data: Song[]; loadedAt: number; hasMore: boolean } | null {
  if (!songsDiscoverCache.data) return null
  return {
    data: songsDiscoverCache.data,
    loadedAt: songsDiscoverCache.loadedAt,
    hasMore: songsDiscoverCache.hasMore,
  }
}

export function warmSongsDiscoverHome(opts?: { force?: boolean }): Promise<Song[]> {
  const force = opts?.force === true
  const fresh =
    songsDiscoverCache.data &&
    Date.now() - songsDiscoverCache.loadedAt <= PRIMARY_TAB_STALE_MS
  if (!force && fresh && songsDiscoverCache.data) {
    return Promise.resolve(songsDiscoverCache.data)
  }
  if (!force && songsDiscoverCache.inflight) return songsDiscoverCache.inflight

  const p = fetchSongsLightBatch(0, DISCOVER_HOME_BATCH).then((rows) => {
    songsDiscoverCache.data = rows
    songsDiscoverCache.nextOffset = rows.length
    songsDiscoverCache.hasMore = rows.length >= DISCOVER_HOME_BATCH
    songsDiscoverCache.loadedAt = Date.now()
    songsDiscoverCache.inflight = null
    return rows
  }).catch((err) => {
    songsDiscoverCache.inflight = null
    throw err
  })
  songsDiscoverCache.inflight = p
  return p
}

export function loadMoreSongsDiscoverHome(): Promise<Song[]> {
  if (!songsDiscoverCache.hasMore && songsDiscoverCache.data) {
    return Promise.resolve(songsDiscoverCache.data)
  }
  if (songsDiscoverCache.inflight) return songsDiscoverCache.inflight
  const offset = songsDiscoverCache.nextOffset
  const p = fetchSongsLightBatch(offset, DISCOVER_HOME_BATCH).then((rows) => {
    const prev = songsDiscoverCache.data || []
    songsDiscoverCache.hasMore = rows.length >= DISCOVER_HOME_BATCH
    songsDiscoverCache.data = [...prev, ...rows]
    songsDiscoverCache.nextOffset += rows.length
    songsDiscoverCache.loadedAt = Date.now()
    songsDiscoverCache.inflight = null
    return songsDiscoverCache.data
  }).catch((err) => {
    songsDiscoverCache.inflight = null
    throw err
  })
  songsDiscoverCache.inflight = p
  return p
}

export function peekSongsCache(): { data: Song[]; loadedAt: number } | null {
  if (!songsCache.data) return null
  return { data: songsCache.data, loadedAt: songsCache.loadedAt }
}

export function warmSongs(opts?: { force?: boolean }): Promise<Song[]> {
  const force = opts?.force === true
  const fresh =
    songsCache.data &&
    Date.now() - songsCache.loadedAt <= PRIMARY_TAB_STALE_MS
  if (!force && fresh && songsCache.data) {
    return Promise.resolve(songsCache.data)
  }
  if (songsCache.inflight) return songsCache.inflight

  const p = fetchSongsLight().then((rows) => {
    songsCache.data = rows
    songsCache.loadedAt = Date.now()
    songsCache.inflight = null
    return rows
  }).catch((err) => {
    songsCache.inflight = null
    throw err
  })
  songsCache.inflight = p
  return p
}

// ── Vibed lyric moments (Discover phase 2) ───────────────────────────

const momentsCache: CacheEntry<LyricMomentRow[]> = { data: null, loadedAt: 0, inflight: null }
/** Full catalog lines for songs that have ≥1 vibed moment (window expansion). */
const momentsAtomsCache: CacheEntry<Record<string, CatalogLyricAtom[]>> = {
  data: null,
  loadedAt: 0,
  inflight: null,
}

const curatedMomentsCache: CacheEntry<Record<string, CuratedMomentStored[]>> = {
  data: null,
  loadedAt: 0,
  inflight: null,
}

async function fetchCuratedMomentsBySong(): Promise<Record<string, CuratedMomentStored[]>> {
  if (!isMomentsCurationClientEnabled()) return {}
  const { data, error } = await supabase
    .from('song_curated_moments')
    .select('song_id, moments')
  if (error) {
    console.warn('fetchCuratedMomentsBySong: failed (table missing or RLS)', error.message)
    return {}
  }
  const out: Record<string, CuratedMomentStored[]> = {}
  for (const row of data || []) {
    const moments = row.moments as CuratedMomentStored[]
    if (Array.isArray(moments) && moments.length > 0) {
      out[row.song_id as string] = moments
    }
  }
  return out
}

async function fetchSongAtomsForMoments(
  songIds: string[],
  vibesBySongLine: Map<string, string[]>,
): Promise<Record<string, CatalogLyricAtom[]>> {
  const out: Record<string, CatalogLyricAtom[]> = {}
  if (songIds.length === 0) return out

  const { data, error } = await supabase
    .from('lyric_lines')
    .select('song_id, line_index, text, start_sec, end_sec')
    .in('song_id', songIds)

  if (error) {
    console.error('fetchSongAtomsForMoments: failed', error)
    return out
  }

  for (const row of data || []) {
    const songId = row.song_id as string
    const lineIndex = row.line_index as number
    const vibeKey = `${songId}_${lineIndex}`
    const atom: CatalogLyricAtom = {
      lineIndex,
      text: row.text,
      startSec: Number(row.start_sec),
      endSec: Number(row.end_sec),
      vibes: vibesBySongLine.get(vibeKey) || [],
    }
    if (!out[songId]) out[songId] = []
    out[songId].push(atom)
  }

  for (const id of Object.keys(out)) {
    out[id].sort((a, b) => a.lineIndex - b.lineIndex)
  }
  return out
}

const LYRIC_MOMENT_LINE_SELECT = `
  line_index,
  text,
  start_sec,
  end_sec,
  song_id,
  lyric_line_vibes!inner ( vibe ),
  songs!inner (
    id,
    title,
    artist_display_name,
    artwork_url,
    audio_url,
    status,
    atmosphere
  )
`

function mapLyricMomentRows(
  data: Record<string, unknown>[] | null,
): { out: LyricMomentRow[]; vibesBySongLine: Map<string, string[]> } {
  const out: LyricMomentRow[] = []
  const vibesBySongLine = new Map<string, string[]>()
  for (const row of data || []) {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
    if (!song || (song as { status?: string }).status === 'hidden') continue
    const vibes = ((row.lyric_line_vibes as { vibe: string }[]) || [])
      .map((v) => v.vibe)
      .filter(Boolean)
    if (vibes.length === 0) continue
    const songRec = song as {
      id: string
      title: string
      artist_display_name: string
      artwork_url: string | null
      audio_url: string | null
      atmosphere: string | null
    }
    vibesBySongLine.set(`${songRec.id}_${row.line_index}`, vibes)
    out.push({
      lineIndex: row.line_index as number,
      text: row.text as string,
      startSec: Number(row.start_sec),
      endSec: Number(row.end_sec),
      songId: songRec.id,
      songTitle: songRec.title,
      artist: songRec.artist_display_name,
      artwork: songRec.artwork_url,
      audioUrl: songRec.audio_url,
      vibes,
      atmosphere: parseAtmosphere(songRec.atmosphere),
    })
  }
  return { out, vibesBySongLine }
}

async function mergeMomentSongAtoms(
  songIds: string[],
  vibesBySongLine: Map<string, string[]>,
) {
  if (songIds.length === 0) return
  const batch = await fetchSongAtomsForMoments(songIds, vibesBySongLine)
  momentsAtomsCache.data = { ...(momentsAtomsCache.data || {}), ...batch }
  momentsAtomsCache.loadedAt = Date.now()
}

type DiscoverMomentsCache = CacheEntry<LyricMomentRow[]> & {
  nextOffset: number
  hasMore: boolean
}

const momentsDiscoverCache: DiscoverMomentsCache = {
  data: null,
  loadedAt: 0,
  inflight: null,
  nextOffset: 0,
  hasMore: true,
}

export async function fetchLyricMomentsPage(offset: number, limit: number): Promise<LyricMomentRow[]> {
  const { data, error } = await supabase
    .from('lyric_lines')
    .select(LYRIC_MOMENT_LINE_SELECT)
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('fetchLyricMomentsPage: failed', error)
    return []
  }

  const { out, vibesBySongLine } = mapLyricMomentRows((data as Record<string, unknown>[]) || null)
  const songIds = [...new Set(out.map((r) => r.songId))]
  await mergeMomentSongAtoms(songIds, vibesBySongLine)
  return out
}

export function peekMomentsDiscoverCache(): {
  data: LyricMomentRow[]
  loadedAt: number
  hasMore: boolean
} | null {
  if (!momentsDiscoverCache.data) return null
  return {
    data: momentsDiscoverCache.data,
    loadedAt: momentsDiscoverCache.loadedAt,
    hasMore: momentsDiscoverCache.hasMore,
  }
}

export function warmLyricMomentsDiscoverHome(opts?: { force?: boolean }): Promise<LyricMomentRow[]> {
  const force = opts?.force === true
  const fresh =
    momentsDiscoverCache.data &&
    Date.now() - momentsDiscoverCache.loadedAt <= PRIMARY_TAB_STALE_MS
  if (!force && fresh && momentsDiscoverCache.data) {
    return Promise.resolve(momentsDiscoverCache.data)
  }
  if (!force && momentsDiscoverCache.inflight) return momentsDiscoverCache.inflight

  const p = fetchLyricMomentsPage(0, DISCOVER_HOME_BATCH).then((rows) => {
    momentsDiscoverCache.data = rows
    momentsDiscoverCache.nextOffset = DISCOVER_HOME_BATCH
    momentsDiscoverCache.hasMore = rows.length >= DISCOVER_HOME_BATCH
    momentsDiscoverCache.loadedAt = Date.now()
    momentsDiscoverCache.inflight = null
    return rows
  }).catch((err) => {
    momentsDiscoverCache.inflight = null
    throw err
  })
  momentsDiscoverCache.inflight = p
  return p
}

export function loadMoreLyricMomentsDiscoverHome(): Promise<LyricMomentRow[]> {
  if (!momentsDiscoverCache.hasMore && momentsDiscoverCache.data) {
    return Promise.resolve(momentsDiscoverCache.data)
  }
  if (momentsDiscoverCache.inflight) return momentsDiscoverCache.inflight
  const offset = momentsDiscoverCache.nextOffset
  const p = fetchLyricMomentsPage(offset, DISCOVER_HOME_BATCH).then((rows) => {
    const prev = momentsDiscoverCache.data || []
    momentsDiscoverCache.hasMore = rows.length >= DISCOVER_HOME_BATCH
    momentsDiscoverCache.data = [...prev, ...rows]
    momentsDiscoverCache.nextOffset += DISCOVER_HOME_BATCH
    momentsDiscoverCache.loadedAt = Date.now()
    momentsDiscoverCache.inflight = null
    return momentsDiscoverCache.data
  }).catch((err) => {
    momentsDiscoverCache.inflight = null
    throw err
  })
  momentsDiscoverCache.inflight = p
  return p
}

export async function fetchLyricMoments(): Promise<LyricMomentRow[]> {
  const { data, error } = await supabase.from('lyric_lines').select(LYRIC_MOMENT_LINE_SELECT)

  if (error) {
    console.error('fetchLyricMoments: failed', error)
    momentsAtomsCache.data = {}
    momentsAtomsCache.loadedAt = Date.now()
    return []
  }

  const { out, vibesBySongLine } = mapLyricMomentRows((data as Record<string, unknown>[]) || null)
  const songIds = [...new Set(out.map((r) => r.songId))]
  momentsAtomsCache.data = await fetchSongAtomsForMoments(songIds, vibesBySongLine)
  momentsAtomsCache.loadedAt = Date.now()
  return out
}

export function peekMomentsCache(): { data: LyricMomentRow[]; loadedAt: number } | null {
  if (!momentsCache.data) return null
  return { data: momentsCache.data, loadedAt: momentsCache.loadedAt }
}

export function peekMomentsSongAtoms(): Record<string, CatalogLyricAtom[]> | null {
  if (!momentsAtomsCache.data) return null
  return momentsAtomsCache.data
}

export function peekCuratedMomentsBySong(): Record<string, CuratedMomentStored[]> | null {
  if (!curatedMomentsCache.data) return null
  return curatedMomentsCache.data
}

export function warmLyricMoments(opts?: { force?: boolean }): Promise<LyricMomentRow[]> {
  const force = opts?.force === true
  const fresh =
    momentsCache.data &&
    momentsAtomsCache.data &&
    Date.now() - momentsCache.loadedAt <= PRIMARY_TAB_STALE_MS
  if (!force && fresh && momentsCache.data) {
    return Promise.resolve(momentsCache.data)
  }
  if (momentsCache.inflight) return momentsCache.inflight

  const p = fetchLyricMoments().then(async (rows) => {
    momentsCache.data = rows
    momentsCache.loadedAt = Date.now()
    momentsCache.inflight = null
    if (isMomentsCurationClientEnabled()) {
      curatedMomentsCache.inflight = fetchCuratedMomentsBySong()
        .then((curated) => {
          curatedMomentsCache.data = curated
          curatedMomentsCache.loadedAt = Date.now()
          curatedMomentsCache.inflight = null
          return curated
        })
        .catch(() => {
          curatedMomentsCache.data = {}
          curatedMomentsCache.inflight = null
          return {}
        })
      await curatedMomentsCache.inflight
    }
    return rows
  }).catch((err) => {
    momentsCache.inflight = null
    throw err
  })
  momentsCache.inflight = p
  return p
}

/** Map tab path → warm fetches (no Realtime, no pane mount). */
export function warmPrimaryTab(href: string): void {
  if (href === '/feed') {
    void warmFeedPosts()
    return
  }
  if (href === '/discover') {
    void warmSongsDiscoverHome()
    void warmLyricMomentsDiscoverHome()
    void warmFeedPosts()
    return
  }
  if (href.startsWith('/discover')) {
    void warmFeedPosts()
    return
  }
  if (href === '/you') {
    void warmFeedPosts()
    return
  }
  const profileMatch = href.match(/^\/profile\/([^/?#]+)$/)
  if (profileMatch) {
    void warmProfile(decodeURIComponent(profileMatch[1]))
    void warmFeedPosts()
  }
  // Notifications list is owned by NotificationsProvider (auth-gated); no public warm.
}
