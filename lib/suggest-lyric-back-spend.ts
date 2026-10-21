import {
  ESTIMATED_SUGGEST_RANK_USD,
  getDailySuggestRankUsdCap,
} from '@/lib/suggest-lyric-back-config'

/** Best-effort daily spend guard (serverless, per instance). */
let dailySpendUsd = 0
let dailySpendDay = ''

export function canSpendOnSuggestRank(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dailySpendDay) {
    dailySpendDay = today
    dailySpendUsd = 0
  }
  return dailySpendUsd + ESTIMATED_SUGGEST_RANK_USD <= getDailySuggestRankUsdCap()
}

export function recordSuggestRankSpend(): void {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dailySpendDay) {
    dailySpendDay = today
    dailySpendUsd = 0
  }
  dailySpendUsd += ESTIMATED_SUGGEST_RANK_USD
}
