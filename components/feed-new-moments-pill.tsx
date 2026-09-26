'use client'

import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

interface FeedNewMomentsPillProps {
  visible: boolean
  onReveal: () => void
}

/**
 * Soft centered signal when new Moments arrived — no count, no auto-merge until tap.
 */
export function FeedNewMomentsPill({ visible, onReveal }: FeedNewMomentsPillProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 72px) + 10px)',
        left: 0,
        right: 0,
        zIndex: 45,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={onReveal}
        role="status"
        aria-live="polite"
        aria-label="Show new moments"
        style={{
          pointerEvents: 'auto',
          minHeight: '36px',
          padding: '0 16px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '50px',
          fontFamily: font,
          fontWeight: 600,
          fontSize: TYPE.label,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 2px 16px color-mix(in srgb, var(--bg) 70%, transparent)',
          animation: 'fadeInUp 280ms var(--ease-out) both',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        New moments
      </button>
    </div>
  )
}
