const CARD_INTERVAL = 12
const MIN_LYRIC_GAP = 4
const MEMORY_EVERY = 6
const PEOPLE_EVERY = 15
const PEOPLE_EARLY = 5
const PEOPLE_FIRST_REGULAR = 14
const SHORT_FEED_CARDS = 8

function peopleOrdinal(lyricOrdinal: number, nonReplayTotal: number): boolean {
  if (nonReplayTotal > 0 && nonReplayTotal < PEOPLE_FIRST_REGULAR && lyricOrdinal === PEOPLE_EARLY) {
    return true
  }
  if (lyricOrdinal >= PEOPLE_FIRST_REGULAR && (lyricOrdinal - PEOPLE_FIRST_REGULAR) % PEOPLE_EVERY === 0) {
    return true
  }
  return false
}

/** Ordinals where a memory card must not be inserted (same pass as carousel or people). */
export function lyricOrdinalBlockedForMemoryCard(lyricOrdinal: number, nonReplayTotal: number): boolean {
  if (lyricOrdinal <= 0) return true
  if (lyricOrdinal % MEMORY_EVERY === 0) return true
  if ((lyricOrdinal + 1) % MEMORY_EVERY === 0) return true
  if (peopleOrdinal(lyricOrdinal, nonReplayTotal)) return true
  if (peopleOrdinal(lyricOrdinal + 1, nonReplayTotal)) return true
  return false
}

export type MemoryCardPlacement =
  | { placement: 'start'; slotIndex: number }
  | { placement: 'after'; lyricOrdinal: number; slotIndex: number }

export function planMemoryCardPlacements(nonReplayTotal: number, showMemoryCards: boolean): MemoryCardPlacement[] {
  if (!showMemoryCards) return []
  const out: MemoryCardPlacement[] = []
  let slotIndex = 0

  if (nonReplayTotal < SHORT_FEED_CARDS) {
    out.push({ placement: 'start', slotIndex: slotIndex++ })
    return out
  }

  let lastOrdinal = 0
  let target = CARD_INTERVAL
  while (target <= nonReplayTotal) {
    let o = target
    while (o <= nonReplayTotal) {
      const gapOk = out.length === 0 || o - lastOrdinal >= MIN_LYRIC_GAP
      if (gapOk && !lyricOrdinalBlockedForMemoryCard(o, nonReplayTotal)) break
      o += 1
    }
    if (o > nonReplayTotal) break
    out.push({ placement: 'after', lyricOrdinal: o, slotIndex: slotIndex++ })
    lastOrdinal = o
    target = o + CARD_INTERVAL
  }

  return out
}
