'use client'

import { MargoLogo, type MargoLogoSize } from '@/components/margo-logo'

const SIZE_MAP: Record<'tab' | 'sm', MargoLogoSize> = {
  tab: 'xs',
  sm: 'sm',
}

/** Official Margo logo tile for system tips and notifications. */
export function MargoSystemAvatar({ size = 'tab' }: { size?: 'tab' | 'sm' }) {
  return <MargoLogo size={SIZE_MAP[size]} variant="plate" />
}
