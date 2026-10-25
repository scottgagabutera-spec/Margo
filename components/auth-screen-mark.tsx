'use client'

import MargoLogo from '@/components/MargoLogo'

/** One small brand mark — same placement on every auth screen. */
export function AuthScreenMark() {
  return (
    <div className="margo-auth-layout__mark" data-margo-auth-logo="1">
      <MargoLogo tier="symbol" size={24} rings={false} glow={false} />
    </div>
  )
}
