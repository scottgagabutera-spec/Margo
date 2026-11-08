export type FeedContentTab = 'lyrics' | 'memories' | 'shorts' | 'echoes'

export function parseFeedContentTab(raw: string | null | undefined): FeedContentTab {
  const v = raw?.trim().toLowerCase()
  if (v === 'shorts') return 'shorts'
  if (v === 'memories') return 'memories'
  if (v === 'echoes') return 'echoes'
  return 'lyrics'
}

export function feedTabQueryValue(tab: FeedContentTab): string | null {
  if (tab === 'shorts') return 'shorts'
  if (tab === 'memories') return 'memories'
  if (tab === 'echoes') return 'echoes'
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
  else if (tab === 'echoes') next.set('tab', 'echoes')
  else next.delete('tab')
  return next
}
