/**
 * Assert Feed rank floors against the actual costly-action model.
 * Run: node --experimental-strip-types scripts/verify-feed-rank.mts
 */
import {
  feedRankIds,
  postEngagement,
  engagementSignalKinds,
  MIN_TRENDING_ENGAGE,
  MIN_TOP_ENGAGE,
} from '../lib/feed-rank.ts'

const now = Date.now()
const hour = 3600000

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  }
}

const viewsOnly = { views: 5000, resonateCount: 0, echoCount: 0, replayCount: 0 }
assert(postEngagement(viewsOnly) === 0, 'impressions must not count as engagement')
assert(engagementSignalKinds(viewsOnly) === 0, 'impressions must not count as a signal kind')

const oneReplay = { views: 200, resonateCount: 0, echoCount: 0, replayCount: 1 }
assert(postEngagement(oneReplay) === 6, 'one replay is +6')
assert(engagementSignalKinds(oneReplay) === 0, 'one replay is not a kind')

const twoKindsFloor = { resonateCount: 8, echoCount: 0, replayCount: 6 }
assert(engagementSignalKinds(twoKindsFloor) === 2, '8 resonates + 6 replays = 2 kinds')
assert(postEngagement(twoKindsFloor) === 68, '8×4 + 6×6 = 68')
assert(postEngagement(twoKindsFloor) < MIN_TRENDING_ENGAGE, 'kind gates alone must not meet Trending 80')

const trendingOk = { resonateCount: 11, echoCount: 0, replayCount: 6 }
assert(postEngagement(trendingOk) === 80, '11×4 + 6×6 = 80')
assert(engagementSignalKinds(trendingOk) === 2, 'still 2 kinds')

const threeKindsMin = { resonateCount: 8, echoCount: 4, replayCount: 6 }
assert(engagementSignalKinds(threeKindsMin) === 3, 'all three kinds')
assert(postEngagement(threeKindsMin) === 88, '8×4 + 4×5 + 6×6 = 88')
assert(postEngagement(threeKindsMin) < MIN_TOP_ENGAGE, '3-kind minimum must not meet Top 200')

const topPass = { resonateCount: 23, echoCount: 8, replayCount: 12 }
assert(postEngagement(topPass) === 204, '23×4 + 8×5 + 12×6 = 204')

const fresh = now - 3 * hour
const dayOld = now - 30 * hour
const weekOld = now - 8 * 24 * hour

const posts = [
  { id: 'new-quiet', timestamp: fresh },
  { id: 'new-hot', timestamp: fresh },
  { id: 'trend', timestamp: dayOld },
  { id: 'top', timestamp: weekOld },
  { id: 'views-only', timestamp: dayOld },
  { id: 'one-tap', timestamp: dayOld },
]

const stats = {
  'new-quiet': { views: 12 },
  'new-hot': trendingOk,
  'trend': trendingOk,
  'top': topPass,
  'views-only': viewsOnly,
  'one-tap': oneReplay,
}

const { newIds, trendingIds, topIds } = feedRankIds(posts, stats)

assert(newIds.has('new-quiet'), 'young post with no costly mix is New')
assert(!newIds.has('new-hot'), 'young post that earned Trending is not also New')
assert(trendingIds.has('new-hot'), 'Trending can apply inside 24h (velocity)')
assert(trendingIds.has('trend'), 'day-old mixed post is Trending')
assert(topIds.has('top'), 'week-old 3-kind high mix is Top')
assert(!trendingIds.has('top'), 'Top is not also Trending')
assert(!trendingIds.has('views-only'), 'impressions-only never trends')
assert(!topIds.has('views-only'), 'impressions-only is never Top')
assert(!trendingIds.has('one-tap'), 'one replay never trends')
assert(!newIds.has('trend'), 'day-old is not New')

const tooNewForTop = feedRankIds(
  [{ id: 'spike', timestamp: fresh }],
  { spike: topPass },
)
assert(tooNewForTop.trendingIds.has('spike'), 'huge spike in first 24h is Trending, not Top')
assert(!tooNewForTop.topIds.has('spike'), 'Top requires 24h of age')

if (process.exitCode) {
  console.error('feed-rank verify failed')
  process.exit(1)
}
console.log('feed-rank verify ok')
