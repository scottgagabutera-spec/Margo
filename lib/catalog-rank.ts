/**
 * Catalog song rank badges (Discover home + /discover/songs).
 *
 * Trending and Top are earned, not decorative:
 * - Zero plays/resonates never gets Trending
 * - Zero lyric uses never gets Top
 * - At most `limit` of each, from the full loaded catalog (not the visible row slice)
 */
export function songEngagement(plays: number, resonates: number): number {
  return (plays || 0) + (resonates || 0) * 3
}

export function catalogRankIds(
  songs: { id: string; plays?: number; resonates?: number; lyricUses?: number }[],
  limit: number
): { trendingIds: Set<string>; topIds: Set<string> } {
  const trendingIds = new Set(
    [...songs]
      .filter((s) => songEngagement(s.plays || 0, s.resonates || 0) > 0)
      .sort((a, b) => songEngagement(b.plays || 0, b.resonates || 0) - songEngagement(a.plays || 0, a.resonates || 0))
      .slice(0, limit)
      .map((s) => s.id)
  )
  const topIds = new Set(
    [...songs]
      .filter((s) => (s.lyricUses || 0) > 0)
      .sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
      .slice(0, limit)
      .map((s) => s.id)
  )
  return { trendingIds, topIds }
}
