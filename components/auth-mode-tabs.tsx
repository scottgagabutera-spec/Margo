'use client'

import type { AuthMode } from '@/components/auth-form'
import { TYPE, UI_FONT } from '@/lib/fonts'

interface AuthModeTabsProps {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
  className?: string
}

export function AuthModeTabs({ mode, onChange, className }: AuthModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px',
        padding: '4px',
        borderRadius: '14px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {(['signin', 'signup'] as const).map((tab) => {
        const active = mode === tab
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            style={{
              minHeight: 'var(--margo-touch-min)',
              height: 'var(--margo-touch-min)',
              borderRadius: '11px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: UI_FONT,
              fontSize: TYPE.secondary,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.02em',
              color: active ? 'var(--text-on-gold, var(--bg))' : 'var(--text-secondary)',
              background: active ? 'var(--gold)' : 'transparent',
              transition: 'background 150ms ease, color 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        )
      })}
    </div>
  )
}
