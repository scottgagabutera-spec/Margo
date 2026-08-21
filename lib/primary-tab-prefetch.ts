/**
 * Intention-warm cache for primary tabs.
 * Fetches data without mounting panes or enabling Realtime (Phase 1.5–2 fence).
 */
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/hooks/usePosts'
import type { Song } from '@/hooks/useSongs'
import { mapPostLinesRows } from '@/lib/post-lines'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'
import { warmProfile } from '@/lib/profile-warm'

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
  snippet_start_sec,
  snippet_end_sec,
  profiles:author_profile_id ( username, display_name, avatar_url ),
  post_stats ( resonate_count, echo_count, replay_count ),
  songs:song_id ( audio_url ),
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
    songs:song_id ( audio_url )
  )
`

function mapPostRow(row: any): Post {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
  const linkedSong = Array.isArray(row.songs) ? row.songs[0] : row.songs

  return {
    id: row.id,
    text: row.text ?? undefined,
    emotion: row.emotion ?? undefined,
    status: row.status ?? undefined,
    knowledge: (row.song_title || row.artist_name || row.artwork_url)
      ? {
          song: row.song_title ?? undefined,
          artist: row.artist_name ?? undefined,
          artwork: row.artwork_url ?? null,
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
    lines: mapPostLinesRows(row.post_lines),
  }
}

type CacheEntry<T> = {
  data: T | null
  loadedAt: number
  inflight: Promise<T> | null
}

const postsCache: CacheEntry<Post[]> = { data: null, loadedAt: 0, inflight: null }

export async function fetchFeedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .is('parent_post_id', null)
    .not('status', 'in', '("hidden","private")')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('fetchFeedPosts: failed', error)
    return []
  }
  return (data ?? []).map(mapPostRow)
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
    postsCache.data = rows
    postsCache.loadedAt = Date.now()
    postsCache.inflight = null
    return rows
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
  duration_sec, created_at,
  song_stats ( plays, resonate_count, lyric_uses )
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
  song_stats: { plays: number; resonate_count: number; lyric_uses: number }[] | null
}

export function transformSongRowLight(row: RawSongRow): Song {
  const stats = row.song_stats?.[0]
  return {
    id: row.id,
    title: row.title,
    artist: row.artist_display_name,
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
    lyricLines: [],
  }
}

const songsCache: CacheEntry<Song[]> = { data: null, loadedAt: 0, inflight: null }

export async function fetchSongsLight(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONGS_SELECT_LIGHT)
    .neq('status', 'hidden')
    .order('order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('fetchSongsLight: failed', error)
    return []
  }
  return ((data as unknown as RawSongRow[]) || []).map(transformSongRowLight)
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

export async function fetchLyricMoments(): Promise<LyricMomentRow[]> {
  const { data, error } = await supabase
    .from('lyric_lines')
    .select(`
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
        status
      )
    `)

  if (error) {
    console.error('fetchLyricMoments: failed', error)
    momentsAtomsCache.data = {}
    momentsAtomsCache.loadedAt = Date.now()
    return []
  }

  const out: LyricMomentRow[] = []
  const vibesBySongLine = new Map<string, string[]>()
  for (const row of data || []) {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
    if (!song || song.status === 'hidden') continue
    const vibes = (row.lyric_line_vibes || []).map((v: { vibe: string }) => v.vibe).filter(Boolean)
    if (vibes.length === 0) continue
    vibesBySongLine.set(`${song.id}_${row.line_index}`, vibes)
    out.push({
      lineIndex: row.line_index,
      text: row.text,
      startSec: Number(row.start_sec),
      endSec: Number(row.end_sec),
      songId: song.id,
      songTitle: song.title,
      artist: song.artist_display_name,
      artwork: song.artwork_url,
      audioUrl: song.audio_url,
      vibes,
    })
  }

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

  const p = fetchLyricMoments().then((rows) => {
    momentsCache.data = rows
    momentsCache.loadedAt = Date.now()
    momentsCache.inflight = null
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
  if (href === '/discover' || href.startsWith('/discover')) {
    void warmSongs()
    void warmLyricMoments()
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
