'use client'

import { useId, useState } from 'react'
import { CloseIcon, SearchIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

interface MargoSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Optional class for focus styles / tests */
  className?: string
  ariaLabel?: string
  loading?: boolean
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
  /** Left search icon (compose/landing/lyric-back) vs clear-only pill (feed). */
  icon?: 'left' | 'none'
  /** Keep typed text above dropdown scrims (Stage / Compose search). */
  stackAboveOverlay?: boolean
  id?: string
  autoFocus?: boolean
}

/** Must exceed ComposeSearchDropdown scrim (54) and listbox (55). */
const SEARCH_ABOVE_OVERLAY_Z = 56

/**
 * Shared pill search field — Feed / Discover / Compose / Stage / Lyric Back.
 * UI_FONT, CSS variables only (MARGO_BRAND §14–15).
 */
export function MargoSearchInput({
  value,
  onChange,
  placeholder,
  className = 'margo-search',
  ariaLabel,
  loading = false,
  disabled = false,
  onFocus,
  onBlur,
  icon = 'left',
  stackAboveOverlay = false,
  id: idProp,
  autoFocus = false,
}: MargoSearchInputProps) {
  const autoId = useId()
  const inputId = idProp ?? autoId
  const [focused, setFocused] = useState(false)
  const showLeftIcon = icon === 'left'

  return (
    <div style={{ position: 'relative', width: '100%', zIndex: stackAboveOverlay ? SEARCH_ABOVE_OVERLAY_Z : undefined }}>
      {showLeftIcon ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: loading ? '32px' : '20px',
            height: '20px',
            gap: loading ? '3px' : 0,
          }}
        >
          {loading ? (
            [0, 1, 2].map((i) => (
              <span
                key={i}
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
      ) : null}
      <input
        id={inputId}
        className={className}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onBlur={() => {
          setFocused(false)
          onBlur?.()
        }}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        aria-busy={loading}
        style={{
          width: '100%',
          height: 'var(--margo-touch-min)',
          padding: showLeftIcon ? '0 44px 0 40px' : '0 44px 0 16px',
          background: 'var(--surface-2)',
          border: `1px solid ${focused ? 'var(--gold-border)' : 'var(--border-hi)'}`,
          borderRadius: '50px',
          color: 'var(--text)',
          fontFamily: UI_FONT,
          fontSize: '0.82rem',
          fontWeight: focused || value.length > 0 ? 500 : 400,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {value && !loading ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 'var(--margo-touch-min)',
            height: 'var(--margo-touch-min)',
            borderRadius: '50%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <CloseIcon size={14} color="var(--text-secondary)" />
        </button>
      ) : null}
      <style>{`
        .${className}::placeholder { color: var(--text-muted); }
        .${className}::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  )
}
