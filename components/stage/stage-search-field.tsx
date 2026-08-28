'use client'

import { useId, useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

interface StageSearchFieldProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  loading?: boolean
}

/**
 * Stage search field — single-voice placeholder, gold border on focus only.
 */
export function StageSearchField({
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  loading = false,
}: StageSearchFieldProps) {
  const [focused, setFocused] = useState(false)
  const inputId = useId()

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <span
        style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: loading ? '32px' : '24px',
          height: '24px',
          gap: loading ? '3px' : 0,
        }}
      >
        {loading ? (
          [0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--gold)',
                animation: 'margo-bounce-dot 1s ease-in-out infinite',
                animationDelay: `${i * 140}ms`,
              }}
            />
          ))
        ) : (
          <SearchIcon size={16} color={focused ? 'var(--text-muted)' : 'var(--text-disabled)'} />
        )}
      </span>
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        placeholder="Search by lyric, song or artist…"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onBlur={() => {
          setFocused(false)
          onBlur?.()
        }}
        className="stage-search-input"
        aria-busy={loading}
        style={{
          width: '100%',
          height: 'var(--stage-search-h, 48px)',
          padding: '0 44px 0 16px',
          background: 'var(--surface-2)',
          border: '1px solid ' + (focused ? 'var(--gold-border)' : 'var(--border)'),
          borderRadius: '12px',
          color: 'var(--text)',
          fontSize: '1rem',
          fontWeight: 400,
          fontFamily: UI_FONT,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
        }}
      />
      <style>{`
        .stage-search-input::placeholder { color: var(--text-muted); }
        .stage-search-input::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  )
}
