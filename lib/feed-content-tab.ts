export type FeedContentTab = 'lyrics' | 'memories' | 'shorts'

export function parseFeedContentTab(raw: string | null | undefined): FeedContentTab {
  const v = raw?.trim().toLowerCase()
  if (v === 'shorts') return 'shorts'
  if (v === 'memories') return 'memories'
  return 'lyrics'
}

export function feedTabQueryValue(tab: FeedContentTab): string | null {
  if (tab === 'shorts') return 'shorts'
  if (tab === 'memories') return 'memories'
  return null
}

/** Merge tab into existing search params (preserves vibe, etc.). */
export function applyFeedContentTab(
  params: URLSearchParams,
  tab: FeedContentTab,
): URLSearchParams {
  const next = new URLSearchParams(params.toString())
  if (tab === 'shorts') next.set('tab', 'shorts')
  else if (tab === 'memories') next.set('tab', 'memories')
  else next.delete('tab')
  return next
}
