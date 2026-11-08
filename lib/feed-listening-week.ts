import type { MemoryPublic } from './memory/types.ts'
import { inferListeningPeriodType } from './memory/listening-infer.ts'
import { weekRangeContaining } from './memory/listening-period.ts'

export type ListeningWeekRow = {
  memoryId: string
  ownerProfileId: string
  ownerUsername: string
  ownerAvatarUrl: string | null
  songTitle: string
  artistName: string
  artworkUrl: string | null
  songId: string | null
  audioUrl: string | null
  isLyricOnly: boolean
}

function overlapsWeek(memory: MemoryPublic, startIso: string, endIso: string): boolean {
  if (!memory.dateStart) return false
  const end = memory.dateEnd || memory.dateStart
  return memory.dateStart <= endIso && end >= startIso
}

export function buildListeningWeekRows(input: {
  memories: MemoryPublic[]
  followingIds: Set<string>
  max?: number
  refDate?: Date
}): ListeningWeekRow[] {
  const { startIso, endIso } = weekRangeContaining(input.refDate ?? new Date())
  const candidates = input.memories.filter((m) => {
    if (
      inferListeningPeriodType({
        dateGranularity: m.dateGranularity,
        dateStart: m.dateStart,
        dateEnd: m.dateEnd,
        songCount: m.songCount,
        photoCount: m.photos.length,
      }) !== 'week'
    ) {
      return false
    }
    return overlapsWeek(m, startIso, endIso)
  })

  const byOwner = new Map<string, ListeningWeekRow>()
  const sorted = [...candidates].sort((a, b) => {
    const af = input.followingIds.has(a.ownerProfileId) ? 0 : 1
    const bf = input.followingIds.has(b.ownerProfileId) ? 0 : 1
    if (af !== bf) return af - bf
    return b.createdAt.localeCompare(a.createdAt)
  })

  for (const m of sorted) {
    if (byOwner.has(m.ownerProfileId)) continue
    const song = m.songs[0]
    if (!song) continue
    byOwner.set(m.ownerProfileId, {
      memoryId: m.id,
      ownerProfileId: m.ownerProfileId,
      ownerUsername: m.ownerUsername,
      ownerAvatarUrl: m.ownerAvatarUrl,
      songTitle: song.songTitle,
      artistName: song.artistName,
      artworkUrl: song.artworkUrl,
      songId: song.songId,
      audioUrl: song.audioUrl,
      isLyricOnly: song.isLyricOnly,
    })
    if (byOwner.size >= (input.max ?? 5)) break
  }

  return [...byOwner.values()]
}
