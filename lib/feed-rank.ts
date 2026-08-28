/**
 * Feed earned badges — Twitter/TikTok velocity vs Spotify Top.
 *
 * New = recency only (quiet). Not an engagement rank.
 * Trending = velocity: mixed signals, high floor, not brand-new.
 * Top = lifetime: strictly higher than Trending. Established posts only.
 *
 * Floors are absolute, not "top N of whatever is on screen".
 * If nobody meets the bar, there is no badge.
 */

export const NEW_WINDOW_HOURS = 24
export const RANK_BADGE_COUNT = 3
export const MIN_TRENDING_ENGAGE = 120
export const MIN_TRENDING_AGE_HOURS = 12
export const MIN_TRENDING_SIGNAL_KINDS = 3
export const MIN_TOP_ENGAGE = 360
export const MIN_TOP_SIGNAL_KINDS = 3

export type RankStats = {
  views?: number
  resonateCount?: number
  echoCount?: number
  replayCount?: number
}

export function postEngagement(stats: RankStats | undefined): number {
  const s = stats || {}
  return (s.views || 0)
    + ((s.resonateCount || 0) * 4)
    + ((s.echoCount || 0) * 5)
    + ((s.replayCount || 0) * 6)
}

/** Distinct engagement kinds — blocks single-signal inflation. */
export function engagementSignalKinds(stats: RankStats | undefined): number {
  const s = stats || {}
  let n = 0
  if ((s.views || 0) >= 40) n += 1
  if ((s.resonateCount || 0) >= 8) n += 1
  if ((s.echoCount || 0) >= 4) n += 1
  if ((s.replayCount || 0) >= 6) n += 1
  return n
}

export function postAgeHours(timestamp: number | undefined, now = Date.now()): number {
  if (!timestamp) return 999
  return (now - timestamp) / 3600000
}

export function trendingScore(engage: number, ageHours: number): number {
  return engage / Math.pow(ageHours + 2, 1.4)
}

export function feedRankIds<T extends { id: string; timestamp?: number }>(
  posts: T[],
  statsById: Record<string, RankStats | undefined>,
): { newIds: Set<string>; trendingIds: Set<string>; topIds: Set<string> } {
  const newIds = new Set(
    posts.filter((p) => postAgeHours(p.timestamp) < NEW_WINDOW_HOURS).map((p) => p.id),
  )

  const topIds = new Set(
    [...posts]
      .filter((p) => !newIds.has(p.id))
      .filter((p) => postEngagement(statsById[p.id]) >= MIN_TOP_ENGAGE)
      .filter((p) => engagementSignalKinds(statsById[p.id]) >= MIN_TOP_SIGNAL_KINDS)
      .sort((a, b) => postEngagement(statsById[b.id]) - postEngagement(statsById[a.id]))
      .slice(0, RANK_BADGE_COUNT)
      .map((p) => p.id),
  )

  const trendingIds = new Set(
    [...posts]
      .filter((p) => !newIds.has(p.id) && !topIds.has(p.id))
      .filter((p) => postAgeHours(p.timestamp) >= MIN_TRENDING_AGE_HOURS)
      .filter((p) => postEngagement(statsById[p.id]) >= MIN_TRENDING_ENGAGE)
      .filter((p) => engagementSignalKinds(statsById[p.id]) >= MIN_TRENDING_SIGNAL_KINDS)
      .sort((a, b) => (
        trendingScore(postEngagement(statsById[b.id]), postAgeHours(b.timestamp))
        - trendingScore(postEngagement(statsById[a.id]), postAgeHours(a.timestamp))
      ))
      .slice(0, RANK_BADGE_COUNT)
      .map((p) => p.id),
  )

  return { newIds, trendingIds, topIds }
}

export function feedSortScore(
  post: { id: string; timestamp?: number },
  sort: string,
  statsById: Record<string, RankStats | undefined>,
): number {
  const age = postAgeHours(post.timestamp)
  const engage = postEngagement(statsById[post.id])
  if (sort === 'NEW') return Math.exp(-age / 18) * 1000 + engage * 0.05
  if (sort === 'TRENDING') return trendingScore(engage, age)
  if (sort === 'TOP') return engage
  return 0
}
