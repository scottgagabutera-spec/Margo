'use client'

import { useId, useState, useEffect, useRef } from 'react'
import { CloseIcon, SearchIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import {
  MARGO_CATALOG_SEARCH_ARIA_LABEL,
  MARGO_CATALOG_SEARCH_HINT_WORDS,
  MARGO_CATALOG_SEARCH_STATIC_PLACEHOLDER,
  nextCatalogSearchHintIndex,
} from '@/lib/margo-search-hints'

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
  /** Lyric Back panel: 36px field, CSS-owned type size (14px / 16px on iOS WebKit). */
  compact?: boolean
  /** Premium cycling “Search with song / lyric / artist” when empty. */
  catalogHints?: boolean
}

/** Must exceed ComposeSearchDropdown scrim (54) and listbox (55). */
const SEARCH_ABOVE_OVERLAY_Z = 56

const HINT_CYCLE_MS = 3200

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
  compact = false,
  catalogHints = false,
}: MargoSearchInputProps) {
  const autoId = useId()
  const inputId = idProp ?? autoId
  const [focused, setFocused] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const showLeftIcon = icon === 'left'

  useEffect(() => {
    if (!autoFocus) return
    inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!catalogHints || value.length > 0 || focused || reducedMotion) return
    const t = window.setInterval(() => {
      setHintIndex((i) => nextCatalogSearchHintIndex(i))
    }, HINT_CYCLE_MS)
    return () => window.clearInterval(t)
  }, [catalogHints, focused, reducedMotion, value.length])

  const showCatalogOverlay = catalogHints && value.length === 0 && !focused
  const resolvedPlaceholder = catalogHints
    ? (reducedMotion || focused ? MARGO_CATALOG_SEARCH_STATIC_PLACEHOLDER : ' ')
    : placeholder
  const resolvedAria = ariaLabel || (catalogHints ? MARGO_CATALOG_SEARCH_ARIA_LABEL : placeholder)

  const inputClass = compact ? 'margo-search margo-search--lb-panel' : className
  const wrapClass = [
    compact ? 'margo-search-wrap margo-search-wrap--lb' : '',
    catalogHints ? 'margo-search-wrap--catalog-hints' : '',
    showCatalogOverlay ? 'margo-search-wrap--hint-visible' : '',
    focused && catalogHints ? 'margo-search-wrap--hint-focus' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={wrapClass || undefined}
      style={{ position: 'relative', width: '100%', zIndex: stackAboveOverlay ? SEARCH_ABOVE_OVERLAY_Z : undefined }}
    >
      {showLeftIcon ? (
        <span
          aria-hidden
          className={compact ? 'margo-search-wrap__icon' : undefined}
          style={compact ? undefined : {
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
      {showCatalogOverlay ? (
        <span className="margo-search-hint" aria-hidden>
          <span className="margo-search-hint__lead">Search with </span>
          {MARGO_CATALOG_SEARCH_HINT_WORDS.map((word, i) => (
            <span
              key={word}
              className={
                'margo-search-hint__word'
                + (i === hintIndex ? ' margo-search-hint__word--on' : '')
              }
            >
              {word}
              {i < MARGO_CATALOG_SEARCH_HINT_WORDS.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
      ) : null}
      <input
        id={inputId}
        ref={inputRef}
        className={inputClass}
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
        placeholder={resolvedPlaceholder}
        aria-label={resolvedAria}
        aria-busy={loading}
        style={compact ? {
          width: '100%',
          color: 'var(--text)',
          fontFamily: UI_FONT,
          fontWeight: focused || value.length > 0 ? 500 : 400,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          outline: 'none',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
        } : {
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
          className={compact ? 'margo-search-wrap__clear' : undefined}
          style={compact ? undefined : {
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
        .margo-search::placeholder, .margo-search--lb-panel::placeholder { color: var(--text-muted); }
        .margo-search::-webkit-search-cancel-button, .margo-search--lb-panel::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  )
}
