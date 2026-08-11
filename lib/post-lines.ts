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
