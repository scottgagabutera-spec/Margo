'use client'

import type { CSSProperties } from 'react'
import { UI_FONT } from '@/lib/fonts'
import {
  cycleLivingAtmosphere,
  exportAtmosphereHint,
  exportAtmosphereLabel,
  type AtmosphereId,
} from '@/lib/atmosphere'
import {
  EXPORT_SHAPE_CYCLE,
  EXPORT_SHAPE_HINTS,
  EXPORT_SHAPE_LABELS,
} from '@/lib/moment-export/export-shapes'
import type { MomentShapeId } from '@/lib/moment/types'
import {
  cycleStageCardTheme,
  getStageCardTheme,
  type StageCardThemeId,
} from '@/lib/moment/stage-theme'

interface MomentExportCustomizeBarProps {
  cardThemeId: StageCardThemeId
  onThemeChange: (id: StageCardThemeId) => void
  exportAtmosphereId: AtmosphereId
  onExportAtmosphereChange: (id: AtmosphereId) => void
  shapeId: MomentShapeId
  onShapeChange: (id: MomentShapeId) => void
  style?: CSSProperties
}

function columnLabelStyle(): CSSProperties {
  return {
    fontFamily: UI_FONT,
    fontSize: '0.56rem',
    fontWeight: 600,
    letterSpacing: '0.55px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    lineHeight: 1,
    marginBottom: '10px',
    display: 'block',
    textAlign: 'center',
  }
}

function captionStyle(): CSSProperties {
  return {
    fontFamily: UI_FONT,
    fontSize: '0.58rem',
    fontWeight: 600,
    letterSpacing: '0.2px',
    color: 'var(--text-secondary)',
    lineHeight: 1.2,
    marginTop: '8px',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}

function modeColumnStyle(active: boolean): CSSProperties {
  return {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 4px 4px',
    borderRadius: '14px',
    border: active ? '1px solid var(--gold-border)' : '1px solid transparent',
    background: active ? 'var(--gold-faint)' : 'transparent',
    boxSizing: 'border-box',
    transition: 'border-color 200ms var(--ease-out), background 200ms var(--ease-out), opacity 200ms var(--ease-out)',
    opacity: active ? 1 : 0.72,
  }
}

function AspectGlyph({
  ratio,
  selected,
}: {
  ratio: '1:1' | '9:16'
  selected: boolean
}) {
  const w = ratio === '1:1' ? 14 : 10
  const h = ratio === '1:1' ? 14 : 18
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <rect
        x="0.75"
        y="0.75"
        width={w - 1.5}
        height={h - 1.5}
        rx="2.25"
        fill={selected ? 'var(--gold-faint)' : 'transparent'}
        stroke={selected ? 'var(--gold)' : 'var(--text-muted)'}
        strokeWidth="1.5"
      />
    </svg>
  )
}

/**
 * Export-only customization — lives below the card, not inside it.
 * Color and Effect are mutually exclusive modes with direct switching.
 */
export function MomentExportCustomizeBar({
  cardThemeId,
  onThemeChange,
  exportAtmosphereId,
  onExportAtmosphereChange,
  shapeId,
  onShapeChange,
  style,
}: MomentExportCustomizeBarProps) {
  const theme = getStageCardTheme(cardThemeId)
  const colorMode = exportAtmosphereId === 'still'
  const effectMode = !colorMode
  const effectLabel = exportAtmosphereLabel(exportAtmosphereId)
  const effectHint = exportAtmosphereHint(exportAtmosphereId)

  const tapStyle: CSSProperties = {
    width: '100%',
    minHeight: 'var(--margo-touch-min)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 6px',
    borderRadius: '12px',
    border: '1px solid var(--border-hi)',
    background: 'var(--surface-3)',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    boxSizing: 'border-box',
  }

  return (
    <div
      role="toolbar"
      aria-label="Customize export"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
        width: '100%',
        marginTop: '10px',
        padding: '14px 10px 12px',
        borderRadius: '16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={modeColumnStyle(colorMode)}>
        <span style={columnLabelStyle()}>Color{colorMode ? ' · On' : ''}</span>
        <button
          type="button"
          aria-label={
            colorMode
              ? `Color is on: ${theme.label}. Tap to change color.`
              : 'Turn Color on and turn Effect off.'
          }
          aria-pressed={colorMode}
          onClick={() => {
            if (effectMode) {
              onExportAtmosphereChange('still')
              return
            }
            onThemeChange(cycleStageCardTheme(cardThemeId).id)
          }}
          style={tapStyle}
        >
          <span
            aria-hidden
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: colorMode ? '2px solid var(--gold)' : '2px solid var(--text-muted)',
              background: theme.swatch,
              boxShadow: theme.markVariant === 'on-light'
                ? 'inset 0 0 0 1.5px rgba(255,255,255,0.55)'
                : 'inset 0 0 0 1.5px rgba(255,255,255,0.14)',
              opacity: colorMode ? 1 : 0.55,
            }}
          />
        </button>
        <span style={captionStyle()}>{colorMode ? theme.label : 'Tap to use color'}</span>
      </div>

      <div style={modeColumnStyle(effectMode)}>
        <span style={columnLabelStyle()}>Effect{effectMode ? ' · On' : ''}</span>
        <button
          type="button"
          aria-label={
            effectMode
              ? `Effect is on: ${effectLabel}. Tap to change effect.`
              : 'Turn Effect on and turn Color off.'
          }
          aria-pressed={effectMode}
          onClick={() => {
            if (colorMode) {
              onExportAtmosphereChange('breath')
              return
            }
            onExportAtmosphereChange(cycleLivingAtmosphere(exportAtmosphereId))
          }}
          style={tapStyle}
        >
          <span
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.3px',
              color: effectMode ? 'var(--gold)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              padding: '0 4px',
            }}
          >
            {effectMode ? effectLabel : 'Choose…'}
          </span>
        </button>
        <span style={captionStyle()}>
          {effectMode ? effectHint : 'Tap to add motion'}
        </span>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={columnLabelStyle()}>Size</span>
        <div
          role="group"
          aria-label="Export size"
          style={{
            display: 'flex',
            width: '100%',
            gap: '6px',
          }}
        >
          {EXPORT_SHAPE_CYCLE.map((id) => {
            const selected = shapeId === id
            const ratio = id === 'vertical' ? '9:16' : '1:1'
            return (
              <button
                key={id}
                type="button"
                aria-label={`${EXPORT_SHAPE_LABELS[id]}, ${EXPORT_SHAPE_HINTS[id]}`}
                aria-pressed={selected}
                onClick={() => onShapeChange(id)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 'var(--margo-touch-min)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: '12px',
                  border: selected
                    ? '1px solid var(--gold-border)'
                    : '1px solid var(--border-hi)',
                  background: selected ? 'var(--gold-faint)' : 'var(--surface-3)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  boxSizing: 'border-box',
                }}
              >
                <AspectGlyph ratio={ratio} selected={selected} />
              </button>
            )
          })}
        </div>
        <span style={captionStyle()}>
          {EXPORT_SHAPE_LABELS[shapeId]} · {EXPORT_SHAPE_HINTS[shapeId]}
        </span>
      </div>
    </div>
  )
}
