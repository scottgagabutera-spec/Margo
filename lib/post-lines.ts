/**
 * One segment of a multi-line moment. Prefer this over inventing a second
 * top-level post. Position 0 mirrors posts.text / song_id / snippets.
 */
export type PostLineSource = 'catalog' | 'external' | 'freeform'

export interface PostLine {
  id?: string
  position: number
  text: string
  songId?: string | null
  songTitle?: string | null
  artistName?: string | null
  artworkUrl?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  source?: PostLineSource
}

export const POST_LINES_MAX = 3

/** Maps a raw `post_lines` join (as returned by a Supabase select) into the
 * PostLine[] shape resolveMomentLines expects. Canonical mapper — shared by
 * every query that joins post_lines (usePost.ts, primary-tab-prefetch.ts,
 * useOwnPrivatePosts.ts, useProfileReplays.ts) rather than each keeping its
 * own copy of the same ~20 lines. */
export function mapPostLinesRows(raw: any[] | null | undefined): PostLine[] | undefined {
  if (!raw || raw.length === 0) return undefined
  return [...raw]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row) => {
      const linked = Array.isArray(row.songs) ? row.songs[0] : row.songs
      return {
        id: row.id,
        position: row.position ?? 0,
        text: row.text ?? '',
        songId: row.song_id ?? null,
        songTitle: row.song_title ?? null,
        artistName: row.artist_name ?? null,
        artworkUrl: row.artwork_url ?? null,
        audioUrl: linked?.audio_url ?? null,
        snippetStart: row.snippet_start_sec ?? null,
        snippetEnd: row.snippet_end_sec ?? null,
        source: (row.source as PostLineSource) || 'external',
      }
    })
}

/** Prefer joined lines; otherwise synthesize position-0 from the post mirror. */
export function resolveMomentLines(post: {
  text?: string
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  lines?: PostLine[]
}): PostLine[] {
  if (post.lines && post.lines.length > 0) {
    return [...post.lines].sort((a, b) => a.position - b.position)
  }
  if (!post.text) return []
  return [
    {
      position: 0,
      text: post.text,
      songId: post.songId ?? null,
      songTitle: post.knowledge?.song ?? null,
      artistName: post.knowledge?.artist ?? null,
      artworkUrl: post.knowledge?.artwork ?? null,
      audioUrl: post.audioUrl ?? null,
      snippetStart: post.snippetStart ?? null,
      snippetEnd: post.snippetEnd ?? null,
      source: post.songId ? 'catalog' : 'external',
    },
  ]
}
