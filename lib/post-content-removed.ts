/**
 * Lyric Back shells: content erased in DB (content_removed_at); clients must not
 * surface lyric, track, snippet, or author identity.
 */

export type ContentRemovedRow = {
  content_removed_at?: string | null
}

export function isPostContentRemoved(row: ContentRemovedRow | null | undefined): boolean {
  return Boolean(row?.content_removed_at)
}

export type EchoLike = {
  lyric?: string
  song?: string
  artist?: string
  emotion?: string
  username?: string
  displayName?: string
  authorUid?: string
  authorAvatarUrl?: string | null
  songId?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  audioUrl?: string | null
  artwork?: string | null
  externalListenUrl?: string | null
  contentRemovedAt?: string | null
}

export function applyEchoContentRemoved<T extends EchoLike>(echo: T): T {
  if (!echo.contentRemovedAt) return echo
  return {
    ...echo,
    lyric: '',
    song: '',
    artist: '',
    emotion: '',
    username: '',
    displayName: undefined,
    authorUid: undefined,
    authorAvatarUrl: null,
    songId: null,
    snippetStart: null,
    snippetEnd: null,
    audioUrl: null,
    artwork: null,
    externalListenUrl: null,
  }
}

export type PostLike = {
  text?: string
  emotion?: string
  username?: string | null
  authorUid?: string | null
  authorAvatarUrl?: string | null
  authorDisplayName?: string | null
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  lines?: Array<{ text?: string; song_title?: string; artist_name?: string }>
  contentRemovedAt?: string | null
}

export function applyPostContentRemoved<T extends PostLike>(post: T): T {
  if (!post.contentRemovedAt) return post
  return {
    ...post,
    text: undefined,
    emotion: undefined,
    username: null,
    authorUid: null,
    authorAvatarUrl: null,
    authorDisplayName: null,
    knowledge: undefined,
    songId: null,
    audioUrl: null,
    snippetStart: null,
    snippetEnd: null,
    lines: post.lines?.map((line) => ({
      ...line,
      text: '',
      song_title: '',
      artist_name: '',
    })),
  }
}

/** DB columns that must be null on a shelled Lyric Back row. */
export const SHELL_CLEARED_POST_COLUMNS = [
  'text',
  'emotion',
  'song_id',
  'song_title',
  'artist_name',
  'artwork_url',
  'snippet_start_sec',
  'snippet_end_sec',
  'external_listen_url',
  'legacy_author_label',
] as const

export function assertShellRowDbClean(row: Record<string, unknown>): void {
  for (const col of SHELL_CLEARED_POST_COLUMNS) {
    const val = row[col]
    if (col === 'text') {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        throw new Error(`shell row still has text: ${String(val)}`)
      }
      continue
    }
    if (val !== null && val !== undefined && val !== '') {
      throw new Error(`shell row still has ${col}: ${String(val)}`)
    }
  }
  if (!row.content_removed_at) {
    throw new Error('shell row missing content_removed_at')
  }
}
