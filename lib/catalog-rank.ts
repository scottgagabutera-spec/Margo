/**
 * Catalog song rank badges (Discover home + /discover/songs).
 *
 * Trending and Top are earned, not decorative — Spotify/Apple pattern:
 * velocity (plays) vs cumulative use (lyric posts). Empty is better than
 * tagging every new upload.
 */
export function songEngagement(plays: number, resonates: number): number {
  return (plays || 0) + (resonates || 0) * 3
}

const MIN_TRENDING_SONG_ENGAGE = 20
const MIN_TOP_LYRIC_USES = 5

export function catalogRankIds(
  songs: { id: string; plays?: number; resonates?: number; lyricUses?: number }[],
  limit: number
): { trendingIds: Set<string>; topIds: Set<string> } {
  const trendingPool = [...songs]
    .filter((s) => songEngagement(s.plays || 0, s.resonates || 0) >= MIN_TRENDING_SONG_ENGAGE)
    .sort((a, b) => songEngagement(b.plays || 0, b.resonates || 0) - songEngagement(a.plays || 0, a.resonates || 0))

  const trendingIds = new Set(
    (trendingPool.length >= 2 ? trendingPool : [])
      .slice(0, limit)
      .map((s) => s.id)
  )

  const topPool = [...songs]
    .filter((s) => (s.lyricUses || 0) >= MIN_TOP_LYRIC_USES)
    .sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))

  const topIds = new Set(
    topPool.slice(0, limit).map((s) => s.id)
  )
  return { trendingIds, topIds }
}
