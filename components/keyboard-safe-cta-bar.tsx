'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

const font = 'var(--font-lora), serif'

interface KeyboardSafeCtaBarProps {
  children: ReactNode
  /**
   * When true (keyboard open / tab bar hidden), sit on --margo-keyboard-inset.
   * When false, clear tab bar + mini-player via --margo-page-bottom.
   */
  keyboardOpen?: boolean
  /** Tighter padding/gap for multi-row compose footers. */
  dense?: boolean
  /** Opaque bar surface (e.g. DM composer). Default keeps Compose fade gradient. */
  solidBackground?: boolean
  zIndex?: number
  /** Inner content max width — defaults to 640px (Compose). */
  contentMaxWidth?: number | string
}

/**
 * Pins primary actions above the on-screen keyboard using
 * --margo-keyboard-inset from useVisualViewport.
 * Reusable for Compose and future form flows.
 *
 * When the keyboard is closed, pad by --margo-page-bottom (tab bar +
 * mini-player) so Continue / primary actions stay above the player
 * overlay instead of sitting in the same band (player z-index is higher).
 * When the keyboard is open the tab bar is already height 0 and this bar
 * sits on the keyboard inset, so extra chrome padding is omitted.
 *
 * Publishes its own rendered height as --margo-cta-bar-h (same
 * ResizeObserver-publish pattern as --margo-tabbar-h / --margo-miniplayer-h)
 * so other fixed chrome — e.g. Compose's floating mini-player pill — can
 * stack above it without a guessed pixel offset.
 */
export function KeyboardSafeCtaBar({
  children,
  keyboardOpen = false,
  dense = false,
  solidBackground = false,
  zIndex = 55,
  contentMaxWidth = 640,
}: KeyboardSafeCtaBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const setH = () => {
      document.documentElement.style.setProperty('--margo-cta-bar-h', `${el.offsetHeight}px`)
    }
    setH()
    const ro = new ResizeObserver(setH)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty('--margo-cta-bar-h', '0px')
    }
  }, [])

  const style: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'var(--margo-keyboard-inset, 0px)',
    zIndex,
    paddingTop: dense ? '8px' : '12px',
    paddingLeft: '24px',
    paddingRight: '24px',
    paddingBottom: keyboardOpen
      ? (dense ? '8px' : '12px')
      : `calc(${dense ? '8px' : '12px'} + var(--margo-page-bottom, var(--margo-tabbar-h, 0px)))`,
    background: solidBackground
      ? 'var(--bg)'
      : 'linear-gradient(to top, var(--bg) 55%, transparent)',
    pointerEvents: 'none',
  }

  return (
    <div ref={rootRef} style={style}>
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: typeof contentMaxWidth === 'number' ? `${contentMaxWidth}px` : contentMaxWidth,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: dense ? '8px' : '10px',
          fontFamily: font,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export const keyboardSafePrimaryBtnStyle: CSSProperties = {
  minHeight: 'var(--margo-touch-min)',
  padding: '0 28px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  borderRadius: '50px',
  fontFamily: 'var(--font-lora), serif',
  fontWeight: 700,
  fontSize: '0.6rem',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
}

export const keyboardSafeSecondaryBtnStyle: CSSProperties = {
  ...keyboardSafePrimaryBtnStyle,
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-hi)',
  boxShadow: 'none',
  fontWeight: 600,
}

/** Compact tertiary actions in a sticky compose footer (Export, Change song, etc.). */
export const keyboardSafeCompactActionStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: '36px',
  padding: '0 8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  background: 'transparent',
  color: 'var(--text-secondary)',
  borderRadius: '50px',
  border: '1px solid var(--border)',
  fontFamily: 'var(--font-lora), serif',
  fontWeight: 600,
  fontSize: '0.56rem',
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

/** Split row for two secondary primaries (Post / Private). */
export const keyboardSafeSplitSecondaryStyle: CSSProperties = {
  ...keyboardSafeSecondaryBtnStyle,
  flex: 1,
  minHeight: '40px',
  fontSize: '0.58rem',
}
