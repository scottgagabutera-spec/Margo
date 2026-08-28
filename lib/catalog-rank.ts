/**
 * Catalog song rank badges (Discover home + /discover/songs).
 *
 * Absolute floors, not relative "everyone in this row".
 * Plays are qualified karaoke listens (30s / 50%, session PK) — not snippets.
 * Trending = plays + 3× unique song resonates, floor 80.
 * Top = lyric uses, floor 25.
 */
export function songEngagement(plays: number, resonates: number): number {
  return (plays || 0) + (resonates || 0) * 3
}

const MIN_TRENDING_SONG_ENGAGE = 80
const MIN_TOP_LYRIC_USES = 25

export function catalogRankIds(
  songs: { id: string; plays?: number; resonates?: number; lyricUses?: number }[],
  limit: number
): { trendingIds: Set<string>; topIds: Set<string> } {
  const topIds = new Set(
    [...songs]
      .filter((s) => (s.lyricUses || 0) >= MIN_TOP_LYRIC_USES)
      .sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
      .slice(0, limit)
      .map((s) => s.id)
  )

  const trendingIds = new Set(
    [...songs]
      .filter((s) => !topIds.has(s.id))
      .filter((s) => songEngagement(s.plays || 0, s.resonates || 0) >= MIN_TRENDING_SONG_ENGAGE)
      .sort((a, b) => songEngagement(b.plays || 0, b.resonates || 0) - songEngagement(a.plays || 0, a.resonates || 0))
      .slice(0, limit)
      .map((s) => s.id)
  )
  return { trendingIds, topIds }
}
