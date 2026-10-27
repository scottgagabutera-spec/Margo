'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'

type Props = {
  children: ReactNode
  /** Extra px reserved above tab bar / keyboard (CTA bar height). */
  bottomReservePx?: number
  style?: CSSProperties
  className?: string
}

/**
 * Design A: scroll region starts at measured header bottom; never scrolls under the band.
 */
export function ComposeViewportRegion({
  children,
  bottomReservePx = 0,
  style,
  className = 'margo-compose-region margo-compose-overlay',
}: Props) {
  const { keyboardOpen } = useKeyboardSafeChrome(true)
  const bottom = keyboardOpen
    ? `calc(var(--margo-keyboard-inset, 0px) + ${bottomReservePx}px)`
    : `calc(var(--margo-tabbar-h, 80px) + var(--margo-cta-bar-h, 0px) + ${bottomReservePx}px)`

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 'var(--margo-header-bottom, var(--margo-header-h, var(--nav-height, 72px)))',
        bottom,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        className="margo-compose-region__scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 8,
          paddingBottom: 8,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  )
}
