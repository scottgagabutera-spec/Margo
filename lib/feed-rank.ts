/**
 * Feed earned badges.
 *
 * What the data actually is (not what the labels wish it were):
 * - views: feed impressions at ~50% visibility. Client sessionStorage
 *   only; RPC increment_post_view is not unique per user/device.
 *   These are not song plays (plays require 30s karaoke, session PK).
 * - resonates: unique (post_id, actor_id)
 * - lyric backs / echoes: count of visible child posts (not unique authors)
 * - replays: unique (post_id, replayer_id)
 *
 * There are no time-bucketed counters, so Trending velocity is
 * costlyEngage / (ageHours + 2)^1.4 — a decayed lifetime mix, not
 * "engagement in the last N hours."
 *
 * Eligibility uses costly unique-ish actions only. Views never unlock
 * a badge. One tap cannot qualify. If nobody meets the bar, no badge.
 *
 * New = recency only, and only if Trending/Top were not earned.
 * Trending = mixed recent momentum (2 of 3 costly kinds).
 * Top = all 3 costly kinds, higher floor, at least 24h old.
 */

export const NEW_WINDOW_HOURS = 24
export const RANK_BADGE_COUNT = 3

/** Distinct people who resonated. */
export const MIN_KIND_RESONATES = 8
/** Visible Lyric Backs. */
export const MIN_KIND_ECHOES = 4
/** Distinct people who replayed. */
export const MIN_KIND_REPLAYS = 6

/**
 * 2-kind floor at the kind gates: 8×4 + 6×6 = 68.
 * 80 means a little more than the gates — two verbs, not a near-miss.
 */
export const MIN_TRENDING_ENGAGE = 80
export const MIN_TRENDING_SIGNAL_KINDS = 2

/**
 * 3-kind floor at the kind gates: 8×4 + 4×5 + 6×6 = 88.
 * 200 is 2.5× Trending and more than 2× that 3-kind minimum.
 */
export const MIN_TOP_ENGAGE = 200
export const MIN_TOP_SIGNAL_KINDS = 3
export const MIN_TOP_AGE_HOURS = 24

export type RankStats = {
  views?: number
  resonateCount?: number
  echoCount?: number
  replayCount?: number
}

/** Costly mix only. Views are impressions and are not eligibility. */
export function postEngagement(stats: RankStats | undefined): number {
  const s = stats || {}
  return ((s.resonateCount || 0) * 4)
    + ((s.echoCount || 0) * 5)
    + ((s.replayCount || 0) * 6)
}

/** Distinct costly kinds — views are not a kind. */
export function engagementSignalKinds(stats: RankStats | undefined): number {
  const s = stats || {}
  let n = 0
  if ((s.resonateCount || 0) >= MIN_KIND_RESONATES) n += 1
  if ((s.echoCount || 0) >= MIN_KIND_ECHOES) n += 1
  if ((s.replayCount || 0) >= MIN_KIND_REPLAYS) n += 1
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
  const topIds = new Set(
    [...posts]
      .filter((p) => postAgeHours(p.timestamp) >= MIN_TOP_AGE_HOURS)
      .filter((p) => postEngagement(statsById[p.id]) >= MIN_TOP_ENGAGE)
      .filter((p) => engagementSignalKinds(statsById[p.id]) >= MIN_TOP_SIGNAL_KINDS)
      .sort((a, b) => postEngagement(statsById[b.id]) - postEngagement(statsById[a.id]))
      .slice(0, RANK_BADGE_COUNT)
      .map((p) => p.id),
  )

  const trendingIds = new Set(
    [...posts]
      .filter((p) => !topIds.has(p.id))
      .filter((p) => postEngagement(statsById[p.id]) >= MIN_TRENDING_ENGAGE)
      .filter((p) => engagementSignalKinds(statsById[p.id]) >= MIN_TRENDING_SIGNAL_KINDS)
      .sort((a, b) => (
        trendingScore(postEngagement(statsById[b.id]), postAgeHours(b.timestamp))
        - trendingScore(postEngagement(statsById[a.id]), postAgeHours(a.timestamp))
      ))
      .slice(0, RANK_BADGE_COUNT)
      .map((p) => p.id),
  )

  const newIds = new Set(
    posts
      .filter((p) => postAgeHours(p.timestamp) < NEW_WINDOW_HOURS)
      .filter((p) => !trendingIds.has(p.id) && !topIds.has(p.id))
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
