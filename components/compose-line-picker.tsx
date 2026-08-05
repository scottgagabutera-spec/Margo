'use client'
import { ArrowLeftIcon } from '@/components/icons'

export interface ComposeLyricLine {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
}

const font = 'var(--font-lora), serif'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface ComposeLinePickerProps {
  lines: ComposeLyricLine[]
  loading: boolean
  songTitle: string
  artistName: string
  onPick: (line: ComposeLyricLine) => void
  onSkip?: () => void
  onBack: () => void
}

/**
 * Tap-to-pick a real lyric_lines row for a Margo catalog song.
 * Timing comes straight from the row — no fuzzy match.
 */
export function ComposeLinePicker({
  lines,
  loading,
  songTitle,
  artistName,
  onPick,
  onSkip,
  onBack,
}: ComposeLinePickerProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: font, fontSize: '0.82rem',
          color: 'var(--text-secondary)', letterSpacing: '0.5px',
          marginBottom: '32px', padding: '0 12px', minHeight: 'var(--margo-touch-min)',
          display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box',
        }}
      ><ArrowLeftIcon size={16} color="currentColor" /> Back</button>

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>
          Pick the line
        </h1>
        <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '4px' }}>
          Tap the lyric that matches the moment
        </p>
        <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)' }}>
          {artistName} · {songTitle}
        </p>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', fontFamily: font, color: 'var(--gold)', fontSize: '0.82rem' }}>
          Loading lyrics…
        </p>
      )}

      {!loading && lines.length === 0 && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.9rem', marginBottom: '20px' }}>
            No synced lyrics for this song yet.
          </p>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              style={{
                minHeight: 'var(--margo-touch-min)', padding: '0 24px',
                display: 'inline-flex', alignItems: 'center',
                background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px',
                fontFamily: font, fontWeight: 700, fontSize: '0.6rem',
                letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              }}
            >Continue without a snippet</button>
          )}
        </div>
      )}

      {!loading && lines.length > 0 && (
        <div
          style={{
            maxHeight: 'min(52vh, 420px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            background: 'var(--surface)',
          }}
        >
          {lines.map((line) => (
            <button
              key={line.lineIndex}
              type="button"
              onClick={() => onPick(line)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-faint)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span
                style={{
                  fontFamily: font,
                  fontSize: '0.6rem',
                  color: 'var(--gold)',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                  paddingTop: '4px',
                  minWidth: '36px',
                }}
              >
                {formatTime(line.startSec)}
              </span>
              <span
                style={{
                  fontFamily: font,
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--text)',
                  lineHeight: 1.45,
                }}
              >
                {line.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
