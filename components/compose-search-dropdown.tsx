'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MusicNoteIcon, PlayIcon } from '@/components/icons'
import { highlightSearchText } from '@/lib/search-highlight'
import { UI_FONT } from '@/lib/fonts'

export interface ComposeSearchHit {
  id: string
  title: string
  artist: string
  artwork: string
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
  audioUrl?: string | null
  /** Real external listen URL from search (iTunes trackViewUrl or Genius page) */
  externalListenUrl?: string | null
}

function sourceLabel(s: ComposeSearchHit['source']) {
  if (s === 'margo') return 'On Margo'
  if (s === 'genius') return 'Genius'
  return 'Apple Music'
}

interface ComposeSearchDropdownProps {
  open: boolean
  loading: boolean
  results: ComposeSearchHit[]
  highlightQuery?: string
  onSelect: (result: ComposeSearchHit) => void
  onClose: () => void
  /** Stage landing — no source badges, catalog play hint, stage empty copy. */
  variant?: 'compose' | 'stage' | 'panel'
  /** When variant is panel, anchor the listbox to this element (portaled, fixed). */
  anchorRef?: React.RefObject<HTMLElement | null>
}

const STAGE_PLAY_HINT = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'var(--gold-faint)',
  border: '1px solid var(--gold-border)',
} as const

const PANEL_SCRIM_Z = 240
const PANEL_LIST_Z = 241

function useAnchorRect(
  open: boolean,
  enabled: boolean,
  anchorRef?: React.RefObject<HTMLElement | null>,
) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (!open || !enabled || !anchorRef?.current) {
      setRect(null)
      return
    }
    const el = anchorRef.current
    const update = () => setRect(el.getBoundingClientRect())
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, enabled, anchorRef])

  return rect
}

function ResultsList({
  loading,
  displayResults,
  highlightQuery,
  isStage,
  onSelect,
}: {
  loading: boolean
  displayResults: ComposeSearchHit[]
  highlightQuery: string
  isStage: boolean
  onSelect: (result: ComposeSearchHit) => void
}) {
  return (
    <>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '20px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'var(--gold)', opacity: 0.5,
                animation: 'margo-bounce-dot 1s ease-in-out infinite', animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
      {!loading && displayResults.length === 0 && (
        <p style={{ textAlign: 'center', padding: '18px', fontFamily: UI_FONT, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No songs found
        </p>
      )}
      {displayResults.map((result, index) => {
        const isHosted = result.source === 'margo'
        const showPlayHint = isStage && isHosted && !!result.audioUrl
        const isLast = index === displayResults.length - 1
        return (
          <button
            key={result.source + '-' + result.id}
            type="button"
            role="option"
            className={'compose-search-row' + (isStage ? ' compose-search-row--stage' : '')}
            onClick={() => onSelect(result)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: isStage ? '12px' : '16px',
              padding: isStage ? '12px 14px' : '14px 16px',
              minHeight: 'var(--margo-touch-min)',
              background: 'none',
              border: 'none',
              borderBottom: !isStage && !isLast ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
              boxSizing: 'border-box',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {result.artwork ? (
              <img
                src={result.artwork}
                alt=""
                style={{
                  width: isStage ? '44px' : '48px',
                  height: isStage ? '44px' : '48px',
                  borderRadius: isStage ? '6px' : '8px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  background: 'var(--surface-2)',
                }}
              />
            ) : (
              <div
                style={{
                  width: isStage ? '44px' : '48px',
                  height: isStage ? '44px' : '48px',
                  borderRadius: isStage ? '6px' : '8px',
                  flexShrink: 0,
                  background: 'var(--surface-2)',
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: UI_FONT,
                color: 'var(--text)',
                fontSize: isStage ? '0.9rem' : '0.95rem',
                fontWeight: 600,
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {highlightSearchText(result.title, highlightQuery)}
              </p>
              <p style={{
                fontFamily: UI_FONT,
                color: 'var(--text-secondary)',
                fontSize: isStage ? '0.78rem' : '0.82rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {highlightSearchText(result.artist, highlightQuery)}
              </p>
            </div>
            {isStage ? (
              showPlayHint ? (
                <span style={STAGE_PLAY_HINT} aria-hidden>
                  <PlayIcon size={14} color="var(--gold)" />
                </span>
              ) : null
            ) : (
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '50px',
                  fontFamily: UI_FONT,
                  color: isHosted ? 'var(--gold)' : 'var(--text-muted)',
                  background: isHosted ? 'var(--gold-faint)' : 'transparent',
                  border: `1px solid ${isHosted ? 'var(--gold-border)' : 'var(--border)'}`,
                }}
              >
                {isHosted && <MusicNoteIcon size={10} color="var(--gold)" />}
                {sourceLabel(result.source)}
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

/**
 * Inline song-search dropdown — anchored under the search field.
 * Panel variant portals a fixed listbox so feed cards never clip results.
 */
export function ComposeSearchDropdown({
  open,
  loading,
  results,
  highlightQuery = '',
  onSelect,
  onClose,
  variant = 'compose',
  anchorRef,
}: ComposeSearchDropdownProps) {
  const [mounted, setMounted] = useState(false)
  const isStage = variant === 'stage'
  const isPanel = variant === 'panel'
  const displayResults = isStage ? results.slice(0, 8) : results
  const anchorRect = useAnchorRect(open, isPanel, anchorRef)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open) return null

  const listboxStyle: React.CSSProperties = {
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
    WebkitOverflowScrolling: 'touch',
    background: isStage ? 'var(--surface-elevated)' : 'var(--surface)',
    border: `1px solid ${isStage ? 'var(--border-hi)' : 'var(--border)'}`,
    borderRadius: isStage ? '14px' : '16px',
    boxShadow: isStage
      ? '0 0 0 1px rgba(0,0,0,0.4), 0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)'
      : '0 12px 32px rgba(0,0,0,0.45)',
  }

  if (isPanel && mounted && anchorRect) {
    const gap = 6
    const vv = typeof window !== 'undefined' ? window.innerHeight : 640
    const pageBottomRaw = typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--margo-page-bottom')
      : ''
    const pageBottom = Number.parseFloat(pageBottomRaw) || 88
    const spaceBelow = vv - anchorRect.bottom - pageBottom - gap
    const spaceAbove = anchorRect.top - gap - 12
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.min(
      420,
      Math.max(160, openUp ? spaceAbove : spaceBelow),
    )
    const top = openUp
      ? Math.max(12, anchorRect.top - gap - maxHeight)
      : anchorRect.bottom + gap

    const portalNode = (
      <>
        <button
          type="button"
          aria-label="Dismiss search"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: PANEL_SCRIM_Z,
            border: 'none',
            padding: 0,
            margin: 0,
            background: 'rgba(0,0,0,0.35)',
            cursor: 'default',
          }}
        />
        <div
          role="listbox"
          aria-label="Song search results"
          style={{
            ...listboxStyle,
            position: 'fixed',
            zIndex: PANEL_LIST_Z,
            left: anchorRect.left,
            width: anchorRect.width,
            top,
            maxHeight,
          }}
        >
          <ResultsList
            loading={loading}
            displayResults={displayResults}
            highlightQuery={highlightQuery}
            isStage={isStage}
            onSelect={onSelect}
          />
        </div>
      </>
    )
    return createPortal(portalNode, document.body)
  }

  return (
    <>
      <style>{`
        .compose-search-row { transition: background 120ms ease; }
        .compose-search-row:active { background: rgba(255,255,255,0.06); }
        .compose-search-row--stage:not(:last-child) {
          border-bottom: 1px solid var(--border);
        }
      `}</style>
      <button
        type="button"
        aria-label="Dismiss search"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 54,
          border: 'none',
          padding: 0,
          margin: 0,
          background: isStage ? 'var(--stage-scrim)' : 'transparent',
          cursor: 'default',
        }}
      />
      <div
        role="listbox"
        aria-label="Song search results"
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          zIndex: 55,
          maxHeight: 'min(52dvh, calc(var(--margo-vv-height, 100dvh) * 0.42), 420px, calc(var(--margo-vv-height, 100dvh) - var(--margo-page-bottom) - 160px))',
          ...listboxStyle,
        }}
      >
        <ResultsList
          loading={loading}
          displayResults={displayResults}
          highlightQuery={highlightQuery}
          isStage={isStage}
          onSelect={onSelect}
        />
      </div>
    </>
  )
}
