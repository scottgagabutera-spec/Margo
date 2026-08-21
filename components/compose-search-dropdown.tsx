'use client'

import { MusicNoteIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

export interface ComposeSearchHit {
  id: string
  title: string
  artist: string
  artwork: string
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
  audioUrl?: string | null
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
}

/**
 * Inline song-search dropdown — anchored under the search field.
 * Keyboard-safe maxHeight (dvh + --margo-vv-height), contained scroll,
 * transparent outside-tap dismiss (no scrim).
 */
export function ComposeSearchDropdown({
  open,
  loading,
  results,
  onSelect,
  onClose,
}: ComposeSearchDropdownProps) {
  if (!open) return null

  return (
    <>
      <style>{`
        .compose-search-row { transition: background 120ms ease; }
        .compose-search-row:active { background: rgba(255,255,255,0.04); }
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
          background: 'transparent',
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
          marginTop: '8px',
          /* Above mobile tab bar (z 50) so results aren't painted under it */
          zIndex: 55,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          /* Cap height so the list ends above tab bar + mini-player */
          maxHeight: 'min(52dvh, calc(var(--margo-vv-height, 100dvh) * 0.42), 420px, calc(var(--margo-vv-height, 100dvh) - var(--margo-page-bottom) - 160px))',
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
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
        {!loading && results.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px', fontFamily: UI_FONT, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No songs found
          </p>
        )}
        {results.map((result) => {
          const isHosted = result.source === 'margo'
          return (
            <button
              key={result.source + '-' + result.id}
              type="button"
              role="option"
              className="compose-search-row"
              onClick={() => onSelect(result)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 16px',
                minHeight: 'var(--margo-touch-min)',
                background: 'none',
                border: 'none',
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
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, background: 'var(--surface-2)' }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: UI_FONT, color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.title}
                </p>
                <p style={{ fontFamily: UI_FONT, color: 'var(--text-secondary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.artist}
                </p>
              </div>
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
            </button>
          )
        })}
      </div>
    </>
  )
}
