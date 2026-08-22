import type { MargoSearchDocument } from './types'
import { buildMomentSearchText } from './moment-search-text.mjs'

export function profileToUserDoc(row: {
  id: string
  username: string | null
  display_name: string | null
  avatar_url?: string | null
  is_artist?: boolean | null
}): MargoSearchDocument | null {
  if (!row.username) return null
  return {
    id: `user:${row.id}`,
    type: 'user',
    title: row.display_name || row.username,
    subtitle: `@${row.username}`,
    username: row.username,
    profileId: row.id,
    artworkUrl: row.avatar_url ?? null,
    createdAt: Date.now(),
  }
}

export function profileToArtistDoc(
  row: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url?: string | null
    is_artist?: boolean | null
  },
  songCount = 0,
  totalPlays = 0,
): MargoSearchDocument | null {
  if (!row.is_artist || !row.username) return null
  return {
    id: `artist:${row.id}`,
    type: 'artist',
    title: row.display_name || row.username,
    subtitle: `@${row.username}`,
    username: row.username,
    profileId: row.id,
    artworkUrl: row.avatar_url ?? null,
    plays: totalPlays,
    resonateCount: songCount,
    createdAt: Date.now(),
  }
}

export function postToLyricDoc(row: {
  id: string
  text?: string | null
  emotion?: string | null
  song_title?: string | null
  artist_name?: string | null
  artwork_url?: string | null
  song_id?: string | null
  legacy_author_label?: string | null
  created_at?: string | null
  resonate_count?: number | null
  profiles?: { username?: string | null; display_name?: string | null } | { username?: string | null; display_name?: string | null }[] | null
  /** Multi-line Moments — when present, all lines become searchable
   * instead of only the position-0 mirror (posts.text only ever reflects
   * line 1). Order matters; join without an explicit order-by, so this
   * sorts by position itself rather than trusting query order. */
  post_lines?: { position?: number | null; text?: string | null }[] | null
}): MargoSearchDocument | null {
  const text = buildMomentSearchText(row.text, row.post_lines)
  if (!text) return null
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const username = profile?.username || row.legacy_author_label || null
  return {
    id: `post:${row.id}`,
    type: 'lyric',
    text,
    title: text.slice(0, 120),
    subtitle: [row.song_title, row.artist_name].filter(Boolean).join(' · ') || undefined,
    emotion: row.emotion || undefined,
    username: username || undefined,
    songId: row.song_id || undefined,
    postId: row.id,
    artworkUrl: row.artwork_url ?? null,
    resonateCount: row.resonate_count ?? 0,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

export function lyricLineToCatalogDoc(
  row: {
    song_id: string
    line_index: number
    text: string
    songs?: {
      title?: string | null
      artist_display_name?: string | null
      artwork_url?: string | null
      song_stats?: { plays?: number | null } | { plays?: number | null }[] | null
    } | {
      title?: string | null
      artist_display_name?: string | null
      artwork_url?: string | null
      song_stats?: { plays?: number | null } | { plays?: number | null }[] | null
    }[] | null
  },
): MargoSearchDocument | null {
  const text = (row.text || '').trim()
  if (!text) return null
  const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
  const stats = song?.song_stats
  const playsRow = Array.isArray(stats) ? stats[0] : stats
  return {
    id: `line:${row.song_id}:${row.line_index}`,
    type: 'catalog_line',
    text,
    title: text.slice(0, 120),
    subtitle: [song?.title, song?.artist_display_name].filter(Boolean).join(' · ') || undefined,
    songId: row.song_id,
    artworkUrl: song?.artwork_url ?? null,
    plays: playsRow?.plays ?? 0,
    createdAt: Date.now(),
  }
}

export function categorizeHits(
  hits: Array<Record<string, unknown>>,
  limitPerType: number,
) {
  const users: MargoSearchDocument[] = []
  const lyrics: MargoSearchDocument[] = []
  const artists: MargoSearchDocument[] = []
  const catalogLines: MargoSearchDocument[] = []

  for (const hit of hits) {
    const doc = hit as unknown as MargoSearchDocument & { _formatted?: Partial<MargoSearchDocument> }
    const type = doc.type
    if (type === 'user' && users.length < limitPerType) users.push(doc)
    else if (type === 'lyric' && lyrics.length < limitPerType) lyrics.push(doc)
    else if (type === 'artist' && artists.length < limitPerType) artists.push(doc)
    else if (type === 'catalog_line' && catalogLines.length < limitPerType) catalogLines.push(doc)
  }

  return { users, lyrics, artists, catalogLines }
}
