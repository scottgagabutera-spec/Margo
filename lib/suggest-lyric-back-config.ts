/** Server-side flag for on-demand Lyric Back ranking (until PR 5a precompute). */
export function isSuggestLyricBackRankEnabled(): boolean {
  return process.env.SUGGEST_LYRIC_BACK_RANK_ENABLED !== 'false'
}

/** Approximate USD per gpt-4o-mini full-catalog rank (see audit). */
export const ESTIMATED_SUGGEST_RANK_USD = 0.0015

export function getDailySuggestRankUsdCap(): number {
  const raw = process.env.SUGGEST_LYRIC_BACK_DAILY_USD_CAP
  if (!raw) return 3
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 3
}
