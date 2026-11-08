import { trackEvent } from '@/lib/analytics/track'

const seenImpressions = new Set<string>()

export function trackFeedBlockImpression(blockName: string, planKey: string): void {
  const id = `${blockName}:${planKey}`
  if (seenImpressions.has(id)) return
  seenImpressions.add(id)
  trackEvent('feed_block_impression', { block: blockName, plan_key: planKey })
}

export function trackFeedBlockTap(blockName: string, planKey: string): void {
  trackEvent('feed_block_tap', { block: blockName, plan_key: planKey })
}
