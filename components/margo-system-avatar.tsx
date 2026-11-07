'use client'

import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'

/** Official Margo mark in the portrait frame (welcome + tips). */
export function MargoSystemAvatar({ size = 'tab' }: { size?: 'tab' | 'sm' }) {
  return (
    <MargoPortraitAvatar
      size={size}
      brandMark
      fallbackInitial="M"
      separationRingColor="var(--bg)"
    />
  )
}
