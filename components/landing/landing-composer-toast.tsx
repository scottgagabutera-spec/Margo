'use client'

import { Check } from 'lucide-react'
import { UI_FONT } from '@/lib/fonts'

export function LandingComposerToast({
  message,
  tier,
}: {
  message: string
  tier: 'phone' | 'tablet' | 'desktop'
}) {
  const bottom = tier === 'phone' ? 28 : 40
  return (
    <div
      className="margo-landing-composer-toast"
      role="status"
      aria-live="polite"
      style={{
        bottom: `calc(${bottom}px + var(--margo-page-bottom, var(--margo-tabbar-h, 80px)) + var(--margo-safe-bottom, 0px))`,
        fontFamily: UI_FONT,
      }}
    >
      <Check size={16} strokeWidth={2} aria-hidden />
      <span>{message}</span>
    </div>
  )
}
