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
}

/**
 * Stage search field — label inside the field, gold focus treatment.
 */
export function StageSearchField({
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
}: StageSearchFieldProps) {
  const [focused, setFocused] = useState(false)
  const inputId = useId()
  const hasValue = value.length > 0
  const showFloatingLabel = !hasValue

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {showFloatingLabel && (
      <label
        htmlFor={inputId}
        style={{
          position: 'absolute',
          left: '20px',
          top: '10px',
          fontFamily: UI_FONT,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: focused ? 'var(--gold)' : 'var(--text-secondary)',
          letterSpacing: '0.3px',
          pointerEvents: 'none',
          transition: 'opacity 150ms ease, color 150ms ease',
          opacity: focused ? 1 : 0.85,
          zIndex: 1,
        }}
      >
        What do you want to say?
      </label>
      )}
      <span
        style={{
          position: 'absolute',
          right: '18px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: 'flex',
          opacity: 0.45,
        }}
      >
        <SearchIcon size={18} color="var(--text-muted)" />
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
        placeholder="Song, artist, or line…"
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
        style={{
          width: '100%',
          height: 'var(--stage-search-h, 56px)',
          padding: showFloatingLabel ? '26px 48px 10px 20px' : '0 48px 0 20px',
          background: focused ? 'var(--gold-faint)' : 'var(--surface-2)',
          border: '1px solid ' + (focused ? 'var(--gold-border)' : 'var(--border)'),
          borderRadius: '16px',
          color: 'var(--text)',
          fontSize: '1rem',
          fontFamily: UI_FONT,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'background 150ms ease, border-color 150ms ease, padding 150ms ease',
        }}
      />
      <style>{`
        @media (min-width: 640px) {
          :root { --stage-search-h: 64px; }
        }
        .stage-search-input::placeholder { color: var(--text-disabled); }
        .stage-search-input::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  )
}
