'use client'

const font = 'var(--font-lora), serif'

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

interface ComposeSearchSheetProps {
  open: boolean
  loading: boolean
  results: ComposeSearchHit[]
  onSelect: (result: ComposeSearchHit) => void
  onClose: () => void
}

/**
 * Bottom sheet for Compose song search — sized against the visual
 * viewport so results stay above the keyboard (iOS Safari + Android).
 */
export function ComposeSearchSheet({
  open,
  loading,
  results,
  onSelect,
  onClose,
}: ComposeSearchSheetProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Song search results"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        aria-label="Dismiss search"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'transparent',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'var(--margo-keyboard-inset, 0px)',
          maxHeight: 'min(58dvh, calc(var(--margo-vv-height, 100dvh) * 0.58))',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -8px 28px rgba(0,0,0,0.22)',
          transition: 'bottom 120ms var(--ease-out)',
          pointerEvents: 'auto',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--border-hi)',
            margin: '10px auto 6px',
            flexShrink: 0,
          }}
        />
        <p
          style={{
            fontFamily: font,
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            textAlign: 'center',
            margin: '0 0 8px',
          }}
        >
          Results
        </p>
        <div
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            minHeight: 0,
            paddingBottom: '12px',
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px', fontFamily: font, color: 'var(--gold)', fontSize: '0.82rem' }}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <p style={{ textAlign: 'center', padding: '20px', fontFamily: font, color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              No songs found
            </p>
          )}
          {results.map((result) => (
            <button
              key={result.source + '-' + result.id}
              type="button"
              onClick={() => onSelect(result)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                minHeight: 'var(--margo-touch-min)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              {result.artwork && (
                <img
                  src={result.artwork}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: font, color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.title}
                </p>
                <p style={{ fontFamily: font, color: 'var(--text-secondary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.artist}
                </p>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '50px',
                  fontFamily: font,
                  color: result.source === 'margo' ? 'var(--gold)' : 'var(--text-muted)',
                  border: result.source === 'margo' ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                }}
              >
                {sourceLabel(result.source)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
