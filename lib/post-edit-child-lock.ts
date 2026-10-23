/** Client + server helpers: lock song/line edits when active Lyric Backs exist. */

export const POST_EDIT_CHILD_LOCK_MESSAGE =
  'Song and lyric are locked while Lyric Backs are on this post. Remove them or edit the vibe only.'

export type LyricBackWriteSnapshot = {
  text: string
  songId: string | null
  songTitle: string
  artistName: string
  snippetStartSec: number | null
  snippetEndSec: number | null
}

export type MomentLineSnapshot = {
  text: string
  songId: string | null
  songTitle: string
  artistName: string
  snippetStart: number | null
  snippetEnd: number | null
}

export function lyricBackSongOrLineChanged(
  before: LyricBackWriteSnapshot,
  after: LyricBackWriteSnapshot,
): boolean {
  return (
    before.text.trim() !== after.text.trim()
    || (before.songId ?? null) !== (after.songId ?? null)
    || before.songTitle.trim() !== after.songTitle.trim()
    || before.artistName.trim() !== after.artistName.trim()
    || (before.snippetStartSec ?? null) !== (after.snippetStartSec ?? null)
    || (before.snippetEndSec ?? null) !== (after.snippetEndSec ?? null)
  )
}

export function momentPrimaryLineChanged(
  before: MomentLineSnapshot,
  after: MomentLineSnapshot,
): boolean {
  return (
    before.text.trim() !== after.text.trim()
    || (before.songId ?? null) !== (after.songId ?? null)
    || before.songTitle.trim() !== after.songTitle.trim()
    || before.artistName.trim() !== after.artistName.trim()
    || (before.snippetStart ?? null) !== (after.snippetStart ?? null)
    || (before.snippetEnd ?? null) !== (after.snippetEnd ?? null)
  )
}
