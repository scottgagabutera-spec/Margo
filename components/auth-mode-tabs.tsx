'use client'

import type { AuthMode } from '@/components/auth-form'
import { UI_FONT } from '@/lib/fonts'

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
        gap: '6px',
        padding: '3px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
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
              height: '36px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: UI_FONT,
              fontSize: '0.76rem',
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--text-on-gold, var(--bg))' : 'var(--text-secondary)',
              background: active ? 'var(--gold)' : 'transparent',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        )
      })}
    </div>
  )
}
