import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ESTIMATED_SUGGEST_RANK_USD,
  getDailySuggestRankUsdCap,
} from '@/lib/suggest-lyric-back-config'

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function canSpendOnSuggestRank(
  supabase: SupabaseClient,
): Promise<boolean> {
  const cap = getDailySuggestRankUsdCap()
  const spendDate = todayUtcDate()

  const { data, error } = await supabase
    .from('suggest_lyric_back_daily_spend')
    .select('spend_usd')
    .eq('spend_date', spendDate)
    .maybeSingle()

  if (error) {
    console.error('suggestLyricBack: daily spend read failed', error)
    return false
  }

  const spent = Number(data?.spend_usd ?? 0)
  return spent + ESTIMATED_SUGGEST_RANK_USD <= cap
}

export async function recordSuggestRankSpend(
  supabase: SupabaseClient,
): Promise<void> {
  const spendDate = todayUtcDate()
  const { data, error } = await supabase
    .from('suggest_lyric_back_daily_spend')
    .select('spend_usd')
    .eq('spend_date', spendDate)
    .maybeSingle()

  if (error) {
    console.error('suggestLyricBack: daily spend read for record failed', error)
    return
  }

  const next = Number(data?.spend_usd ?? 0) + ESTIMATED_SUGGEST_RANK_USD
  const { error: upsertErr } = await supabase
    .from('suggest_lyric_back_daily_spend')
    .upsert({
      spend_date: spendDate,
      spend_usd: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'spend_date' })

  if (upsertErr) {
    console.error('suggestLyricBack: daily spend write failed', upsertErr)
  }
}
