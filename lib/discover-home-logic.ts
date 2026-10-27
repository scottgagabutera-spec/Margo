import type { LyricMomentRow } from '@/lib/primary-tab-prefetch'
import type { Song } from '@/hooks/useSongs'

export const DISCOVER_HOME_SONGS_ROW_CAP = 12

export function capDiscoverHomeSongs(songs: Song[]): Song[] {
  return songs.slice(0, DISCOVER_HOME_SONGS_ROW_CAP)
}

/** Fingerprint for “same moments fetch” — stable shuffle until this changes. */
export function lyricMomentsStableKey(rows: LyricMomentRow[]): string {
  if (rows.length === 0) return 'empty'
  return rows.map(r => `${r.songId}:${r.lineIndex}`).sort().join('|')
}
