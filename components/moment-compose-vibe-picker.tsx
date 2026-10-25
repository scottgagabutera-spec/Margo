'use client'

import { useState } from 'react'
import { UI_FONT } from '@/lib/fonts'
import { MOMENT_VIBE_PICKER_OPTIONS } from '@/lib/moment/vibe'
import type { StageCardTheme } from '@/lib/moment/stage-theme'

export type MomentComposeVibePickerProps = {
  vibeLabel: string
  onVibeSelect: (label: string) => void
  suggestedVibeLabel?: string | null
  /** Stage card uses theme tokens; feed/LB inline uses CSS vars. */
  variant?: 'stage' | 'inline'
  theme?: StageCardTheme
  compact?: boolean
  /** Lyric Back panel send row — tight 5-column grid below the tag. */
  density?: 'default' | 'panel'
  disabled?: boolean
}

/**
 * Same picker as main compose / landing Stage preview: one tag, tap opens 17-vibe grid.
 */
export function MomentComposeVibePicker({
  vibeLabel,
  onVibeSelect,
  suggestedVibeLabel = null,
  variant = 'inline',
  theme,
  compact = false,
  density = 'default',
  disabled = false,
}: MomentComposeVibePickerProps) {
  const [open, setOpen] = useState(false)
  const options = MOMENT_VIBE_PICKER_OPTIONS
  const canPick = !disabled && options.length > 0

  if (variant === 'stage' && theme) {
    return (
      <div style={{ marginTop: compact ? 0 : '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: '22px' }}>
          <button
            type="button"
            aria-label={canPick ? `Vibe: ${vibeLabel}. Tap to change.` : `Vibe: ${vibeLabel}`}
            onClick={canPick ? () => setOpen((v) => !v) : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: canPick ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              fontFamily: UI_FONT,
              fontSize: '0.56rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: theme.inkMuted,
            }}
            >
              Vibe
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: '22px',
              padding: '0 10px',
              borderRadius: '50px',
              border: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.18)' : 'rgba(255,255,255,0.2)'}`,
              background: theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.08)' : 'rgba(255,255,255,0.1)',
              fontFamily: UI_FONT,
              fontSize: '0.56rem',
              fontWeight: 700,
              color: theme.ink,
            }}
            >
              {vibeLabel}
            </span>
          </button>
        </div>
        {open && canPick ? (
          <VibeGrid
            options={options}
            vibeLabel={vibeLabel}
            suggestedVibeLabel={suggestedVibeLabel}
            onPick={(label) => {
              onVibeSelect(label)
              setOpen(false)
            }}
            variant="stage"
            theme={theme}
          />
        ) : null}
      </div>
    )
  }

  const panelDensity = density === 'panel'

  return (
    <div
      className={[
        'margo-moment-vibe-picker',
        compact ? 'margo-moment-vibe-picker--compact' : '',
        panelDensity ? 'margo-moment-vibe-picker--panel' : '',
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={`margo-moment-vibe-picker__tag${panelDensity ? ' margo-moment-vibe-picker__tag--panel' : ''}`}
        data-no-card-nav
        aria-expanded={open}
        aria-label={`Vibe: ${vibeLabel}. Tap to change.`}
        disabled={!canPick}
        onClick={() => canPick && setOpen((v) => !v)}
      >
        <span className="margo-moment-vibe-picker__label">Vibe</span>
        <span className={`margo-moment-vibe-picker__chip${panelDensity ? ' margo-moment-vibe-picker__chip--on' : ''}`}>
          {vibeLabel}
        </span>
      </button>
      {open && canPick ? (
        <VibeGrid
          options={options}
          vibeLabel={vibeLabel}
          suggestedVibeLabel={suggestedVibeLabel}
          onPick={(label) => {
            onVibeSelect(label)
            setOpen(false)
          }}
          variant="inline"
          density={density}
        />
      ) : null}
    </div>
  )
}

function VibeGrid({
  options,
  vibeLabel,
  suggestedVibeLabel,
  onPick,
  variant,
  theme,
  density = 'default',
}: {
  options: string[]
  vibeLabel: string
  suggestedVibeLabel?: string | null
  onPick: (label: string) => void
  variant: 'stage' | 'inline'
  theme?: StageCardTheme
  density?: 'default' | 'panel'
}) {
  if (variant === 'stage' && theme) {
    return (
      <div
        role="listbox"
        aria-label="Choose a vibe"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
          marginTop: '14px',
          width: '100%',
          paddingBottom: '2px',
          borderTop: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.1)'}`,
          paddingTop: '14px',
        }}
      >
        {options.map((option) => {
          const selected = option === vibeLabel
          const suggested = option === suggestedVibeLabel && !selected
          return (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onPick(option)}
              style={{
                position: 'relative',
                minHeight: 'var(--margo-touch-min)',
                padding: '0 8px',
                borderRadius: '50px',
                border: selected
                  ? `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.35)' : 'rgba(255,255,255,0.35)'}`
                  : `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.16)' : 'rgba(255,255,255,0.16)'}`,
                background: selected
                  ? (theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.14)' : 'rgba(255,255,255,0.14)')
                  : (theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.06)' : 'rgba(255,255,255,0.06)'),
                color: theme.ink,
                fontFamily: UI_FONT,
                fontSize: '0.58rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {option}
              {suggested ? (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: theme.ink,
                    border: `1.5px solid ${theme.bg}`,
                  }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    )
  }

  const panelGrid = density === 'panel'

  return (
    <div
      className={
        'margo-moment-vibe-picker__grid'
        + (panelGrid ? ' margo-moment-vibe-picker__grid--panel' : '')
      }
      role="listbox"
      aria-label="Choose a vibe"
    >
      {options.map((option) => {
        const selected = option === vibeLabel
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            className={`margo-moment-vibe-picker__option${selected ? ' margo-moment-vibe-picker__option--on' : ''}${panelGrid ? ' margo-moment-vibe-picker__option--panel' : ''}`}
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
