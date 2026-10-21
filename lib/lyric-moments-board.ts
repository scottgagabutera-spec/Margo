import { buildCatalogLyricUnits } from '@/lib/catalog-lyric-unit'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'
import type { LyricMomentRow } from '@/lib/primary-tab-prefetch'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { CuratedMomentStored } from '@/lib/moments/curated-types'
import { lyricMomentsFromCurated } from '@/lib/moments/curated-discover'

const MIN_MOMENT_WORDS = 4
const SHORT_LINE_WORDS = 3

export type LyricMoment = {
  line: string
  start: number
  end: number
  lineId: number
  songId: string
  songTitle: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  vibes: string[]
  atmosphere?: AtmosphereId
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Same board assembly Discover uses for the Moments row / mixtapes. */
export function buildLyricMomentsFromRows(
  momentRows: LyricMomentRow[],
  songAtomsBySongId: Record<string, CatalogLyricAtom[]>,
  options?: {
    shuffle?: boolean
    curatedBySongId?: Record<string, CuratedMomentStored[]>
  },
): LyricMoment[] {
  const moments: LyricMoment[] = []
  const seenRanges = new Set<string>()
  const songsUsingCurated = new Set<string>()

  const curatedBySongId = options?.curatedBySongId
  if (curatedBySongId) {
    for (const [songId, stored] of Object.entries(curatedBySongId)) {
      if (!stored?.length) continue
      const metaRow = momentRows.find((r) => r.songId === songId)
      if (!metaRow) continue
      songsUsingCurated.add(songId)
      for (const m of lyricMomentsFromCurated(songId, {
        songTitle: metaRow.songTitle,
        artist: metaRow.artist,
        artwork: metaRow.artwork,
        audioUrl: metaRow.audioUrl,
        atmosphere: metaRow.atmosphere,
      }, stored)) {
        const rangeKey = `${m.songId}_${m.start}_${m.end}`
        if (seenRanges.has(rangeKey)) continue
        seenRanges.add(rangeKey)
        moments.push(m)
      }
    }
  }

  momentRows.forEach((row) => {
    if (songsUsingCurated.has(row.songId)) return
    if (!row.vibes || row.vibes.length === 0) return

    const atoms = songAtomsBySongId[row.songId]
    const built = atoms?.length
      ? buildCatalogLyricUnits(atoms, row.lineIndex)
      : buildCatalogLyricUnits(
          [{
            lineIndex: row.lineIndex,
            text: row.text,
            startSec: row.startSec,
            endSec: row.endSec,
            vibes: row.vibes,
          }],
          row.lineIndex,
        )
    if (!built) return

    const unit =
      wordCount(built.single.text) <= SHORT_LINE_WORDS
        ? built.window
        : built.single

    if (wordCount(unit.text) < MIN_MOMENT_WORDS) return

    const rangeKey = `${row.songId}_${unit.startLineIndex}_${unit.endLineIndex}`
    if (seenRanges.has(rangeKey)) return
    seenRanges.add(rangeKey)

    moments.push({
      line: unit.text,
      lineId: unit.centerLineIndex,
      start: unit.startSec,
      end: unit.endSec,
      songId: row.songId,
      songTitle: row.songTitle,
      artist: row.artist,
      artwork: row.artwork,
      audioUrl: row.audioUrl,
      vibes: unit.vibes.length > 0 ? unit.vibes : row.vibes,
      atmosphere: row.atmosphere,
    })
  })

  if (options?.shuffle !== false) {
    for (let i = moments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moments[i], moments[j]] = [moments[j], moments[i]]
    }
  }

  return moments
}

export function momentPlayingKey(moment: LyricMoment): string {
  return `${moment.songId}_${moment.lineId}`
}
