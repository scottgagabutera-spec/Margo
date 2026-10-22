export type FeedContentTab = 'lyrics' | 'shorts'

export function parseFeedContentTab(raw: string | null | undefined): FeedContentTab {
  const v = raw?.trim().toLowerCase()
  if (v === 'shorts') return 'shorts'
  return 'lyrics'
}

export function feedTabQueryValue(tab: FeedContentTab): string | null {
  return tab === 'shorts' ? 'shorts' : null
}

/** Merge tab into existing search params (preserves vibe, etc.). */
export function applyFeedContentTab(
  params: URLSearchParams,
  tab: FeedContentTab,
): URLSearchParams {
  const next = new URLSearchParams(params.toString())
  if (tab === 'shorts') next.set('tab', 'shorts')
  else next.delete('tab')
  return next
}
