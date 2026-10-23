/** Optimistic UI patch after a successful Lyric Back edit (PATCH). */
export type LyricBackEditSavedPatch = {
  lyric: string
  song: string
  artist: string
  emotion: string
  songId: string | null
  snippetStart: number | null
  snippetEnd: number | null
  artwork: string | null
  externalListenUrl: string | null
  audioUrl: string | null
}
