import type { SupabaseClient } from '@supabase/supabase-js'
import { stripHandlePrefix } from '@/lib/artist-identity'
import {
  lyricLineToCatalogDoc,
  postToLyricDoc,
  profileToArtistDoc,
  profileToUserDoc,
  songToSearchDoc,
} from '@/lib/meilisearch/documents'
import type {
  MargoSearchCategoryResults,
  MargoSearchDocType,
  MargoSearchHit,
  RelatedSongHit,
} from '@/lib/meilisearch/types'

const POST_SELECT =
  'id, text, emotion, status, song_title, artist_name, artwork_url, song_id, author_profile_id, legacy_author_label, created_at, profiles:author_profile_id(username, display_name, avatar_url), post_lines(position, text)'

const SONG_SELECT = 'id, title, artist_display_name, artwork_url, owner_profile_id, status'

const PROFILE_SELECT = 'id, username, display_name, avatar_url, is_artist'

function sanitizeIlike(query: string): string {
  return stripHandlePrefix((query || '').replace(/[%_"'\\]/g, '')).trim()
}

function wants(types: MargoSearchDocType[], type: MargoSearchDocType) {
  return types.includes(type)
}

function rows<T>(label: string, res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) console.error('[search-pg]', label, res.error.message)
  return res.data || []
}

function emptyResults(): MargoSearchCategoryResults {
  return { users: [], lyrics: [], artists: [], catalogLines: [], songs: [] }
}

function dedupe<T extends { id: string }>(docs: T[], limit: number): T[] {
  return [...new Map(docs.map((d) => [d.id, d])).values()].slice(0, limit)
}

function visiblePosts(supabase: SupabaseClient) {
  return supabase
    .from('posts')
    .select(POST_SELECT)
    .is('parent_post_id', null)
    .not('status', 'in', '("hidden","private","sent")')
}

export type SearchPostgresOptions = {
  types: MargoSearchDocType[]
  limitPerType?: number
  playlistId?: string | null
  libraryUserId?: string | null
  restrictToLibrary?: boolean
  restrictToPlaylist?: boolean
  lyricsRequireSong?: boolean
}

/**
 * Direct Supabase search. Songs match title/artist only (never lyric lines).
 * Preview and production share this path so scoping stays honest.
 */
export async function searchPostgresFallback(
  supabase: SupabaseClient,
  query: string,
  typesOrOpts: MargoSearchDocType[] | SearchPostgresOptions,
  limitPerTypeArg = 8,
): Promise<{ results: MargoSearchCategoryResults; processingTimeMs: number }> {
  const opts: SearchPostgresOptions = Array.isArray(typesOrOpts)
    ? { types: typesOrOpts, limitPerType: limitPerTypeArg }
    : typesOrOpts
  const started = Date.now()
  const types = opts.types
  const limitPerType = opts.limitPerType ?? 8
  const q = sanitizeIlike(query)
  if (q.length < 2) {
    return { results: emptyResults(), processingTimeMs: 0 }
  }
  const pattern = `%${q}%`
  const qLower = q.toLowerCase()

  const needPeople = wants(types, 'user')
  const needArtists = wants(types, 'artist')
  const needLyrics = wants(types, 'lyric')
  const needLines = wants(types, 'catalog_line')
  const needSongs = wants(types, 'song')

  const [usersByName, usersByDisplay, artistsByName, artistsByDisplay] = await Promise.all([
    needPeople
      ? supabase.from('profiles').select(PROFILE_SELECT).ilike('username', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needPeople
      ? supabase.from('profiles').select(PROFILE_SELECT).ilike('display_name', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needArtists
      ? supabase.from('profiles').select(PROFILE_SELECT).eq('is_artist', true).ilike('username', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needArtists
      ? supabase.from('profiles').select(PROFILE_SELECT).eq('is_artist', true).ilike('display_name', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])

  const users = dedupe(
    [...rows('users.username', usersByName), ...rows('users.display', usersByDisplay)]
      .map((row) => profileToUserDoc(row as never))
      .filter((d): d is NonNullable<typeof d> => !!d),
    limitPerType,
  )

  const artists = dedupe(
    [...rows('artists.username', artistsByName), ...rows('artists.display', artistsByDisplay)]
      .map((row) => profileToArtistDoc(row as never))
      .filter((d): d is NonNullable<typeof d> => !!d),
    limitPerType,
  )

  if (artists.length > 0) {
    const ownerIds = artists.map((a) => a.profileId).filter(Boolean) as string[]
    const relatedRes = await supabase
      .from('songs')
      .select(SONG_SELECT)
      .eq('status', 'live')
      .in('owner_profile_id', ownerIds)
      .limit(40)
    const grouped = new Map<string, RelatedSongHit[]>()
    for (const row of rows('artist.songs', relatedRes)) {
      const song = row as { id: string; title: string; artwork_url: string | null; owner_profile_id: string }
      const list = grouped.get(song.owner_profile_id) || []
      if (list.length >= 3) continue
      list.push({ id: song.id, title: song.title, artworkUrl: song.artwork_url })
      grouped.set(song.owner_profile_id, list)
    }
    for (const artist of artists) {
      if (!artist.profileId) continue
      artist.relatedSongs = grouped.get(artist.profileId) || []
    }
  }

  let songs: MargoSearchHit[] = []
  if (needSongs) {
    songs = await searchSongs(supabase, {
      pattern,
      qLower,
      limitPerType,
      playlistId: opts.playlistId,
      libraryUserId: opts.libraryUserId,
      restrictToLibrary: !!opts.restrictToLibrary,
      restrictToPlaylist: !!opts.restrictToPlaylist,
    })
  }

  let lyrics: MargoSearchHit[] = []
  if (needLyrics) {
    lyrics = await searchPosts(supabase, {
      pattern,
      limitPerType,
      requireSong: !!opts.lyricsRequireSong,
      authorIds: [
        ...users.map((u) => u.profileId),
        ...artists.map((a) => a.profileId),
      ].filter(Boolean) as string[],
    })
  }

  let catalogLines: MargoSearchHit[] = []
  if (needLines) {
    const linesRes = await supabase
      .from('lyric_lines')
      .select('song_id, line_index, text, songs!inner(title, artist_display_name, artwork_url, status)')
      .eq('songs.status', 'live')
      .ilike('text', pattern)
      .limit(limitPerType)
    catalogLines = rows('catalog.lines', linesRes)
      .map((row) => lyricLineToCatalogDoc(row as never))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .slice(0, limitPerType)
  }

  return {
    results: {
      users,
      lyrics,
      artists,
      catalogLines,
      songs,
    },
    processingTimeMs: Date.now() - started,
  }
}

async function searchSongs(
  supabase: SupabaseClient,
  opts: {
    pattern: string
    qLower: string
    limitPerType: number
    playlistId?: string | null
    libraryUserId?: string | null
    restrictToLibrary?: boolean
    restrictToPlaylist?: boolean
  },
): Promise<MargoSearchHit[]> {
  if (opts.restrictToPlaylist) {
    if (!opts.playlistId) return []
    return searchPlaylistSongs(supabase, opts.playlistId, opts.qLower, opts.limitPerType)
  }
  if (opts.restrictToLibrary) {
    if (!opts.libraryUserId) return []
    return searchLibrarySongs(supabase, opts.libraryUserId, opts.qLower, opts.limitPerType)
  }

  const [byTitle, byArtist] = await Promise.all([
    supabase.from('songs').select(SONG_SELECT).eq('status', 'live').ilike('title', opts.pattern).limit(opts.limitPerType),
    supabase.from('songs').select(SONG_SELECT).eq('status', 'live').ilike('artist_display_name', opts.pattern).limit(opts.limitPerType),
  ])
  return dedupe(
    [...rows('songs.title', byTitle), ...rows('songs.artist', byArtist)].map((row) =>
      songToSearchDoc(row as never),
    ),
    opts.limitPerType,
  )
}

async function searchPlaylistSongs(
  supabase: SupabaseClient,
  playlistId: string,
  qLower: string,
  limit: number,
): Promise<MargoSearchHit[]> {
  const { data, error } = await supabase
    .from('queues')
    .select(`
      id,
      queue_items (
        song_id,
        songs (id, title, artist_display_name, artwork_url, owner_profile_id, status),
        lyric_lines (text)
      )
    `)
    .eq('id', playlistId)
    .maybeSingle()
  if (error) {
    console.error('[search-pg] playlist', error.message)
    return []
  }
  const items = (data?.queue_items as Array<{
    song_id: string
    songs: Record<string, unknown> | Record<string, unknown>[] | null
    lyric_lines: { text?: string | null } | { text?: string | null }[] | null
  }> | null) || []

  const hits: MargoSearchHit[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const song = (Array.isArray(item.songs) ? item.songs[0] : item.songs) as {
      id?: string
      title?: string
      artist_display_name?: string
      artwork_url?: string | null
      owner_profile_id?: string
      status?: string
    } | null
    const line = Array.isArray(item.lyric_lines) ? item.lyric_lines[0] : item.lyric_lines
    if (!song?.id || seen.has(song.id)) continue
    const hay = `${song.title || ''} ${song.artist_display_name || ''} ${line?.text || ''}`.toLowerCase()
    if (!hay.includes(qLower)) continue
    seen.add(song.id)
    hits.push(songToSearchDoc({
      id: song.id,
      title: song.title || '',
      artist_display_name: song.artist_display_name,
      artwork_url: song.artwork_url,
      owner_profile_id: song.owner_profile_id,
    }))
    if (hits.length >= limit) break
  }
  return hits
}

async function searchLibrarySongs(
  supabase: SupabaseClient,
  userId: string,
  qLower: string,
  limit: number,
): Promise<MargoSearchHit[]> {
  const [liked, later] = await Promise.all([
    supabase.from('liked_songs').select('song_id, songs(id, title, artist_display_name, artwork_url, owner_profile_id, status)').eq('user_id', userId),
    supabase.from('listen_later_songs').select('song_id, songs(id, title, artist_display_name, artwork_url, owner_profile_id, status)').eq('user_id', userId),
  ])
  const hits: MargoSearchHit[] = []
  const seen = new Set<string>()
  for (const row of [...rows('library.liked', liked), ...rows('library.later', later)]) {
    const rec = row as { songs: Record<string, unknown> | Record<string, unknown>[] | null }
    const song = (Array.isArray(rec.songs) ? rec.songs[0] : rec.songs) as {
      id?: string
      title?: string
      artist_display_name?: string
      artwork_url?: string | null
      owner_profile_id?: string
      status?: string
    } | null
    if (!song?.id || seen.has(song.id)) continue
    const hay = `${song.title || ''} ${song.artist_display_name || ''}`.toLowerCase()
    if (!hay.includes(qLower)) continue
    seen.add(song.id)
    hits.push(songToSearchDoc({
      id: song.id,
      title: song.title || '',
      artist_display_name: song.artist_display_name,
      artwork_url: song.artwork_url,
      owner_profile_id: song.owner_profile_id,
    }))
    if (hits.length >= limit) break
  }
  return hits
}

async function searchPosts(
  supabase: SupabaseClient,
  opts: {
    pattern: string
    limitPerType: number
    requireSong: boolean
    authorIds: string[]
  },
): Promise<MargoSearchHit[]> {
  let textQuery = visiblePosts(supabase).ilike('text', opts.pattern).limit(opts.limitPerType)
  let songQuery = visiblePosts(supabase).ilike('song_title', opts.pattern).limit(opts.limitPerType)
  let artistQuery = visiblePosts(supabase).ilike('artist_name', opts.pattern).limit(opts.limitPerType)
  if (opts.requireSong) {
    textQuery = textQuery.not('song_id', 'is', null)
    songQuery = songQuery.not('song_id', 'is', null)
    artistQuery = artistQuery.not('song_id', 'is', null)
  }

  const lineQuery = supabase.from('post_lines').select('post_id').ilike('text', opts.pattern).limit(opts.limitPerType)

  const [byText, bySong, byArtist, lineHits] = await Promise.all([
    textQuery,
    songQuery,
    artistQuery,
    lineQuery,
  ])

  const extraPostIds = [...new Set(rows('post_lines', lineHits).map((row) => row.post_id))].filter(Boolean)
  let extraQuery = extraPostIds.length > 0
    ? visiblePosts(supabase).in('id', extraPostIds.slice(0, opts.limitPerType))
    : null
  if (extraQuery && opts.requireSong) extraQuery = extraQuery.not('song_id', 'is', null)

  const authorQuery = opts.authorIds.length > 0
    ? (opts.requireSong
      ? visiblePosts(supabase).in('author_profile_id', opts.authorIds).not('song_id', 'is', null).limit(opts.limitPerType)
      : visiblePosts(supabase).in('author_profile_id', opts.authorIds).limit(opts.limitPerType))
    : null

  const [extraPosts, authorPosts] = await Promise.all([
    extraQuery || Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    authorQuery || Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])

  return dedupe(
    [
      ...rows('lyrics.text', byText),
      ...rows('lyrics.song', bySong),
      ...rows('lyrics.artist', byArtist),
      ...rows('lyrics.lines', extraPosts),
      ...rows('lyrics.author', authorPosts),
    ]
      .map((row) => postToLyricDoc(row as never))
      .filter((d): d is NonNullable<typeof d> => !!d),
    opts.limitPerType,
  )
}
