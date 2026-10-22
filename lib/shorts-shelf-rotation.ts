import type { LyricMoment } from '@/lib/lyric-moments-board'

export const SHORTS_MIN_ELIGIBLE_SONGS = 5
export const SHORTS_BATCH_SIZE = 20
export const SHORTS_MAX_PER_ARTIST = 2

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

/** Hourly order + artist cap + batch size. */
export function rotateShortsBatch(
  dailyClips: ShortsClipCandidate[],
  utcHour: number,
  options?: {
    batchSize?: number
    maxPerArtist?: number
  },
): ShortsClipCandidate[] {
  const batchSize = options?.batchSize ?? SHORTS_BATCH_SIZE
  const maxPerArtist = options?.maxPerArtist ?? SHORTS_MAX_PER_ARTIST
  const sorted = [...dailyClips].sort((a, b) => {
    const ha = stableHash32(`${a.songId}:${utcHour}`)
    const hb = stableHash32(`${b.songId}:${utcHour}`)
    return ha - hb
  })
  const out: ShortsClipCandidate[] = []
  const perArtist = new Map<string, number>()
  for (const clip of sorted) {
    if (out.length >= batchSize) break
    const artistKey = (clip.artist || '').trim().toLowerCase() || clip.songId
    const n = perArtist.get(artistKey) ?? 0
    if (n >= maxPerArtist) continue
    perArtist.set(artistKey, n + 1)
    out.push(clip)
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
