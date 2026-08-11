'use client'

import { warmPrimaryTab } from '@/lib/primary-tab-prefetch'

/**
 * Intention handlers for primary-tab Links.
 * Warms the shared data cache only — does not mount panes or flip isTabActive.
 */
export function primaryTabWarmProps(href: string) {
  const warm = () => warmPrimaryTab(href)
  return {
    onPointerEnter: warm,
    onPointerDown: warm,
  }
}
