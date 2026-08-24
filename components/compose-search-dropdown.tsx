'use client'

import { MusicNoteIcon, PlayIcon } from '@/components/icons'
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
  onSelect: (result: ComposeSearchHit) => void
  onClose: () => void
  /** Stage landing — no source badges, catalog play hint, stage empty copy. */
  variant?: 'compose' | 'stage'
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

/**
 * Inline song-search dropdown — anchored under the search field.
 * Keyboard-safe maxHeight (dvh + --margo-vv-height), contained scroll,
 * outside-tap dismiss.
 */
export function ComposeSearchDropdown({
  open,
  loading,
  results,
  onSelect,
  onClose,
  variant = 'compose',
}: ComposeSearchDropdownProps) {
  if (!open) return null
  const isStage = variant === 'stage'
  const displayResults = isStage ? results.slice(0, 8) : results

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
          background: isStage ? 'var(--surface-elevated)' : 'var(--surface)',
          border: `1px solid ${isStage ? 'var(--border-hi)' : 'var(--border)'}`,
          borderRadius: isStage ? '14px' : '16px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          maxHeight: 'min(52dvh, calc(var(--margo-vv-height, 100dvh) * 0.42), 420px, calc(var(--margo-vv-height, 100dvh) - var(--margo-page-bottom) - 160px))',
          boxShadow: isStage
            ? '0 0 0 1px rgba(0,0,0,0.4), 0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)'
            : '0 12px 32px rgba(0,0,0,0.28)',
        }}
      >
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '20px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--gold)', opacity: 0.5,
                  animation: 'bounce 1s infinite', animationDelay: `${i * 150}ms`,
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
                  {result.title}
                </p>
                <p style={{
                  fontFamily: UI_FONT,
                  color: 'var(--text-secondary)',
                  fontSize: isStage ? '0.78rem' : '0.82rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {result.artist}
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
      </div>
    </>
  )
}
