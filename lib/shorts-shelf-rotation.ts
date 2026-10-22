import type { LyricMoment } from '@/lib/lyric-moments-board'

export const SHORTS_MIN_ELIGIBLE_SONGS = 5
export const SHORTS_BATCH_SIZE = 20

/** Stable unsigned 32-bit hash for rotation keys. */
export function stableHash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function utcHourSlot(date: Date): number {
  return Math.floor(date.getTime() / 3_600_000)
}

export type ShortsClipCandidate = LyricMoment

export function artistKeyForClip(clip: ShortsClipCandidate): string {
  return (clip.artist || '').trim().toLowerCase() || clip.songId
}

/** One moment per song for the UTC day. */
export function pickDailyMomentForSong(
  songId: string,
  moments: ShortsClipCandidate[],
  utcDay: string,
): ShortsClipCandidate | null {
  if (moments.length === 0) return null
  const idx = stableHash32(`${songId}:${utcDay}`) % moments.length
  return moments[idx] ?? null
}

export function groupMomentsBySong(moments: ShortsClipCandidate[]): Map<string, ShortsClipCandidate[]> {
  const map = new Map<string, ShortsClipCandidate[]>()
  for (const m of moments) {
    const list = map.get(m.songId) ?? []
    list.push(m)
    map.set(m.songId, list)
  }
  return map
}

/** Daily clip per eligible song (caller filters eligibility). */
export function buildDailyClipsPerSong(
  moments: ShortsClipCandidate[],
  utcDay: string,
): ShortsClipCandidate[] {
  const bySong = groupMomentsBySong(moments)
  const out: ShortsClipCandidate[] = []
  for (const [songId, list] of bySong) {
    const pick = pickDailyMomentForSong(songId, list, utcDay)
    if (pick) out.push(pick)
  }
  return out
}

export function meetsShortsMinimum(eligibleSongCount: number, min = SHORTS_MIN_ELIGIBLE_SONGS): boolean {
  return eligibleSongCount >= min
}

export function computeMaxPerArtist(artistCount: number, batchSize = SHORTS_BATCH_SIZE): number {
  if (artistCount <= 0) return 1
  if (artistCount === 1) return batchSize
  return Math.min(2, Math.max(1, Math.ceil(batchSize / artistCount)))
}

/**
 * Round-robin by artist: one song per artist per round, hourly rotation offset.
 */
export function rotateShortsBatch(
  dailyClips: ShortsClipCandidate[],
  utcHour: number,
  options?: { batchSize?: number },
): ShortsClipCandidate[] {
  const batchSize = options?.batchSize ?? SHORTS_BATCH_SIZE
  const byArtist = new Map<string, ShortsClipCandidate[]>()
  for (const clip of dailyClips) {
    const key = artistKeyForClip(clip)
    const list = byArtist.get(key) ?? []
    list.push(clip)
    byArtist.set(key, list)
  }
  for (const [key, list] of byArtist) {
    list.sort((a, b) => stableHash32(a.songId) - stableHash32(b.songId))
    byArtist.set(key, list)
  }

  const artists = [...byArtist.keys()].sort()
  const artistCount = artists.length
  if (artistCount === 0) return []

  const maxPerArtist = computeMaxPerArtist(artistCount, batchSize)
  const start = stableHash32(String(utcHour)) % artistCount
  const out: ShortsClipCandidate[] = []
  const indexByArtist = new Map<string, number>()

  for (let round = 0; round < maxPerArtist && out.length < batchSize; round++) {
    for (let step = 0; step < artistCount && out.length < batchSize; step++) {
      const artist = artists[(start + step) % artistCount]
      const list = byArtist.get(artist)!
      const idx = indexByArtist.get(artist) ?? 0
      if (idx >= list.length) continue
      out.push(list[idx])
      indexByArtist.set(artist, idx + 1)
    }
  }
  return out
}

export function buildShortsShelfClips(
  moments: ShortsClipCandidate[],
  now: Date,
): { eligibleSongCount: number; clips: ShortsClipCandidate[]; meetsMinimum: boolean } {
  const daily = buildDailyClipsPerSong(moments, utcDayKey(now))
  const eligibleSongCount = daily.length
  const meetsMinimum = meetsShortsMinimum(eligibleSongCount)
  const clips = meetsMinimum
    ? rotateShortsBatch(daily, utcHourSlot(now))
    : []
  return { eligibleSongCount, clips, meetsMinimum }
}
