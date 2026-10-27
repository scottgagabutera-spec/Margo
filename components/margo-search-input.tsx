'use client'

import { useId, useState, useEffect, useRef } from 'react'
import { CloseIcon, SearchIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import {
  MARGO_SEARCH_HINT_CHAR_MS,
  MARGO_SEARCH_HINT_PAUSE_MS,
  margoSearchStaticPlaceholder,
} from '@/lib/margo-search-hints'

interface MargoSearchInputProps {
  value: string
  onChange: (value: string) => void
  /** Animated typewriter line (same wording as scope placeholder). */
  hintText: string
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
}

/** Must exceed ComposeSearchDropdown scrim (54) and listbox (55). */
const SEARCH_ABOVE_OVERLAY_Z = 56

/**
 * Shared pill search field — Stage landing reference styling via globals.css.
 */
export function MargoSearchInput({
  value,
  onChange,
  hintText,
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
}: MargoSearchInputProps) {
  const autoId = useId()
  const inputId = idProp ?? autoId
  const [focused, setFocused] = useState(false)
  const [typedLen, setTypedLen] = useState(0)
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
    if (!hintText || value.length > 0 || focused) return
    if (reducedMotion) {
      setTypedLen(hintText.length)
      return
    }
    setTypedLen(0)
    let len = 0
    let pauseTimer = 0
    const tick = () => {
      len += 1
      if (len > hintText.length) {
        len = 0
        setTypedLen(0)
        pauseTimer = window.setTimeout(tick, MARGO_SEARCH_HINT_PAUSE_MS)
        return
      }
      setTypedLen(len)
      pauseTimer = window.setTimeout(tick, MARGO_SEARCH_HINT_CHAR_MS)
    }
    pauseTimer = window.setTimeout(tick, MARGO_SEARCH_HINT_CHAR_MS)
    return () => {
      if (pauseTimer) window.clearTimeout(pauseTimer)
    }
  }, [hintText, focused, reducedMotion, value.length])

  const showCatalogOverlay = hintText.length > 0 && value.length === 0 && !focused
  const staticPlaceholder = margoSearchStaticPlaceholder(hintText)
  const resolvedPlaceholder = reducedMotion || focused ? staticPlaceholder : ' '
  const resolvedAria = ariaLabel || hintText

  const inputClass = compact ? 'margo-search margo-search--lb-panel' : className
  const wrapClass = [
    'margo-search-wrap',
    compact ? 'margo-search-wrap--lb' : 'margo-search-wrap--standard',
    hintText ? 'margo-search-wrap--catalog-hints' : '',
    showCatalogOverlay ? 'margo-search-wrap--hint-visible' : '',
    focused && hintText ? 'margo-search-wrap--hint-focus' : '',
    value.length > 0 ? 'margo-search-wrap--has-value' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={wrapClass}
      style={{ zIndex: stackAboveOverlay ? SEARCH_ABOVE_OVERLAY_Z : undefined }}
    >
      {showLeftIcon ? (
        <span
          aria-hidden
          className={[
            'margo-search-wrap__icon',
            loading ? 'margo-search-wrap__icon--loading' : '',
          ].filter(Boolean).join(' ')}
          style={compact || loading ? undefined : undefined}
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
        <span className="margo-search-hint" aria-hidden data-margo-search-hint>
          <span className="margo-search-hint__done">
            {hintText.slice(0, typedLen)}
          </span>
          <span className="margo-search-hint__caret" />
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
        data-margo-search-input
        style={compact ? {
          fontFamily: UI_FONT,
          fontWeight: focused || value.length > 0 ? 500 : 400,
          opacity: disabled ? 0.6 : 1,
        } : {
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {value && !loading ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="margo-search-wrap__clear"
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
