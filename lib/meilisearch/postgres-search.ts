import type { SupabaseClient } from '@supabase/supabase-js'
import { stripHandlePrefix } from '@/lib/artist-identity'
import {
  lyricLineToCatalogDoc,
  postToLyricDoc,
  profileToArtistDoc,
  profileToUserDoc,
} from '@/lib/meilisearch/documents'
import type { MargoSearchCategoryResults, MargoSearchDocType } from '@/lib/meilisearch/types'

const POST_SELECT =
  'id, text, emotion, song_title, artist_name, artwork_url, song_id, legacy_author_label, created_at, resonate_count, profiles(username, display_name), post_lines(position, text)'

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

/**
 * Direct Supabase search when Meilisearch is not configured (preview
 * deployments without MEILISEARCH_* keys). Same result shape as Meili.
 */
export async function searchPostgresFallback(
  supabase: SupabaseClient,
  query: string,
  types: MargoSearchDocType[],
  limitPerType = 8,
): Promise<{ results: MargoSearchCategoryResults; processingTimeMs: number }> {
  const started = Date.now()
  const q = sanitizeIlike(query)
  const empty: MargoSearchCategoryResults = {
    users: [],
    lyrics: [],
    artists: [],
    catalogLines: [],
  }
  if (q.length < 2) {
    return { results: empty, processingTimeMs: 0 }
  }
  const pattern = `%${q}%`

  const profileSelect = 'id, username, display_name, avatar_url, is_artist'
  const needPeople = wants(types, 'user')
  const needArtists = wants(types, 'artist')
  const needLyrics = wants(types, 'lyric')
  const needLines = wants(types, 'catalog_line')

  const [
    usersByName,
    usersByDisplay,
    artistsByName,
    artistsByDisplay,
    lyricsByText,
    lyricsBySong,
    lineHits,
    linesByText,
    songsByTitle,
    songsByArtist,
  ] = await Promise.all([
    needPeople
      ? supabase.from('profiles').select(profileSelect).ilike('username', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needPeople
      ? supabase.from('profiles').select(profileSelect).ilike('display_name', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needArtists
      ? supabase.from('profiles').select(profileSelect).eq('is_artist', true).ilike('username', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needArtists
      ? supabase.from('profiles').select(profileSelect).eq('is_artist', true).ilike('display_name', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needLyrics
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'active').is('parent_post_id', null).ilike('text', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needLyrics
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'active').is('parent_post_id', null).ilike('song_title', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needLyrics
      ? supabase.from('post_lines').select('post_id').ilike('text', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
    needLines
      ? supabase
        .from('lyric_lines')
        .select('song_id, line_index, text, songs!inner(title, artist_display_name, artwork_url, status)')
        .eq('songs.status', 'live')
        .ilike('text', pattern)
        .limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needLines
      ? supabase.from('songs').select('id, title, artist_display_name, artwork_url, status').eq('status', 'live').ilike('title', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    needLines
      ? supabase.from('songs').select('id, title, artist_display_name, artwork_url, status').eq('status', 'live').ilike('artist_display_name', pattern).limit(limitPerType)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])

  const extraPostIds = [...new Set(rows('post_lines', lineHits).map((row) => row.post_id))]
    .filter(Boolean)
    .slice(0, limitPerType)

  const extraPosts = extraPostIds.length > 0
    ? await supabase.from('posts').select(POST_SELECT).eq('status', 'active').is('parent_post_id', null).in('id', extraPostIds)
    : { data: [] as Record<string, unknown>[], error: null }

  const users = [...rows('users.username', usersByName), ...rows('users.display', usersByDisplay)]
    .map((row) => profileToUserDoc(row as never))
    .filter((d): d is NonNullable<typeof d> => !!d)
  const usersDeduped = [...new Map(users.map((d) => [d.id, d])).values()].slice(0, limitPerType)

  const artists = [...rows('artists.username', artistsByName), ...rows('artists.display', artistsByDisplay)]
    .map((row) => profileToArtistDoc(row as never))
    .filter((d): d is NonNullable<typeof d> => !!d)
  const artistsDeduped = [...new Map(artists.map((d) => [d.id, d])).values()].slice(0, limitPerType)

  const lyrics = [
    ...rows('lyrics.text', lyricsByText),
    ...rows('lyrics.song', lyricsBySong),
    ...rows('lyrics.lines', extraPosts),
  ]
    .map((row) => postToLyricDoc(row as never))
    .filter((d): d is NonNullable<typeof d> => !!d)
  const lyricsDeduped = [...new Map(lyrics.map((d) => [d.id, d])).values()].slice(0, limitPerType)

  const lineDocs = rows('catalog.lines', linesByText)
    .map((row) => lyricLineToCatalogDoc(row as never))
    .filter((d): d is NonNullable<typeof d> => !!d)

  const seenSongs = new Set(lineDocs.map((d) => d.songId).filter(Boolean))
  for (const row of [...rows('catalog.title', songsByTitle), ...rows('catalog.artist', songsByArtist)]) {
    const song = row as {
      id: string
      title: string
      artist_display_name: string
      artwork_url: string | null
    }
    if (seenSongs.has(song.id)) continue
    seenSongs.add(song.id)
    lineDocs.push({
      id: `song:${song.id}`,
      type: 'catalog_line',
      text: song.title,
      title: song.title,
      subtitle: song.artist_display_name || undefined,
      songId: song.id,
      artworkUrl: song.artwork_url,
    })
  }

  return {
    results: {
      users: usersDeduped,
      lyrics: lyricsDeduped,
      artists: artistsDeduped,
      catalogLines: lineDocs.slice(0, limitPerType),
    },
    processingTimeMs: Date.now() - started,
  }
}
