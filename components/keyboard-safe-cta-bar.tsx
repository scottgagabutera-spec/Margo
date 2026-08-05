'use client'

import type { CSSProperties, ReactNode } from 'react'

const font = 'var(--font-lora), serif'

interface KeyboardSafeCtaBarProps {
  children: ReactNode
  /**
   * When true (keyboard open / tab bar hidden), sit on --margo-keyboard-inset.
   * When false, clear the mobile tab bar via --margo-tabbar-h.
   */
  keyboardOpen?: boolean
}

/**
 * Pins primary actions above the on-screen keyboard using
 * --margo-keyboard-inset from useVisualViewport.
 * Reusable for Compose and future form flows.
 */
export function KeyboardSafeCtaBar({ children, keyboardOpen = false }: KeyboardSafeCtaBarProps) {
  const style: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'var(--margo-keyboard-inset, 0px)',
    zIndex: 55,
    paddingTop: '12px',
    paddingLeft: '24px',
    paddingRight: '24px',
    paddingBottom: keyboardOpen
      ? '12px'
      : 'calc(12px + var(--margo-tabbar-h, 0px))',
    background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
    pointerEvents: 'none',
    transition: 'bottom 120ms var(--ease-out), padding-bottom 120ms var(--ease-out)',
  }

  return (
    <div style={style}>
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: '640px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
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
