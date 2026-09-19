'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { UI_FONT } from '@/lib/fonts'

interface MomentVibeRowProps {
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  vibeOptions: string[]
  onVibeSelect: (label: string) => void
  style?: CSSProperties
}

/**
 * Vibe chrome lives under the Moment canvas — never inside the 9:16 clip.
 * Opening the picker expands downward so it cannot cover play or lyric.
 */
export function MomentVibeRow({
  vibeLabel,
  suggestedVibeLabel,
  vibeOptions,
  onVibeSelect,
  style,
}: MomentVibeRowProps) {
  const [open, setOpen] = useState(false)
  const label = vibeLabel || 'Vibe'

  return (
    <div
      style={{
        width: '100%',
        marginTop: '12px',
        ...style,
      }}
    >
      <button
        type="button"
        aria-label={vibeLabel ? `Vibe: ${vibeLabel}. Tap to change.` : 'Choose a vibe'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          minHeight: 'var(--margo-touch-min)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '0 14px',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.56rem',
            fontWeight: 600,
            letterSpacing: '0.55px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Vibe
        </span>
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: vibeLabel ? 'var(--text)' : 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Choose a vibe"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '10px',
          }}
        >
          {vibeOptions.map((option) => {
            const selected = option === vibeLabel
            const suggested = option === suggestedVibeLabel && !selected
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onVibeSelect(option)
                  setOpen(false)
                }}
                style={{
                  position: 'relative',
                  minHeight: 'var(--margo-touch-min)',
                  padding: '0 8px',
                  borderRadius: '50px',
                  border: selected
                    ? '1px solid var(--gold-border)'
                    : '1px solid var(--border-hi)',
                  background: selected ? 'var(--gold-faint)' : 'var(--surface-3)',
                  color: selected ? 'var(--gold)' : 'var(--text-secondary)',
                  fontFamily: UI_FONT,
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {option}
                {suggested ? (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '8px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--gold)',
                    }}
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
