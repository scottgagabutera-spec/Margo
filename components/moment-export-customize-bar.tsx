'use client'

import type { CSSProperties } from 'react'
import { UI_FONT } from '@/lib/fonts'
import {
  cycleExportAtmosphere,
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

const EFFECT_CAPTIONS: Record<AtmosphereId, string> = {
  still: 'Off',
  breath: 'Wash',
  drift: 'Band',
  pulse: 'Hit',
  weight: 'Drops',
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
 * Editor chrome (not card-themed) so Color / Effect / Size stay readable
 * on the dark page while the canvas above is the live preview.
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
  const effectLabel = exportAtmosphereLabel(exportAtmosphereId)
  const effectOn = exportAtmosphereId !== 'still'

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
      <div
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: effectOn ? 0.38 : 1,
          transition: 'opacity 200ms var(--ease-out)',
        }}
      >
        <span style={columnLabelStyle()}>Color</span>
        <button
          type="button"
          aria-label={
            effectOn
              ? `Color: ${theme.label}. Turn Effect off to use Color.`
              : `Color: ${theme.label}. Tap to change.`
          }
          aria-disabled={effectOn}
          disabled={effectOn}
          onClick={() => {
            if (effectOn) return
            onThemeChange(cycleStageCardTheme(cardThemeId).id)
          }}
          style={{
            ...tapStyle,
            cursor: effectOn ? 'default' : 'pointer',
          }}
        >
          <span
            aria-hidden
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '2px solid var(--text)',
              background: theme.swatch,
              boxShadow: theme.markVariant === 'on-light'
                ? 'inset 0 0 0 1.5px rgba(255,255,255,0.55)'
                : 'inset 0 0 0 1.5px rgba(255,255,255,0.14)',
            }}
          />
        </button>
        <span style={captionStyle()}>{effectOn ? 'Off' : theme.label}</span>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={columnLabelStyle()}>Effect</span>
        <button
          type="button"
          aria-label={`Effect: ${effectLabel}. Tap to change.`}
          onClick={() => onExportAtmosphereChange(cycleExportAtmosphere(exportAtmosphereId))}
          style={tapStyle}
        >
          <span
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.3px',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              padding: '0 4px',
            }}
          >
            {effectLabel}
          </span>
        </button>
        <span style={captionStyle()}>
          {EFFECT_CAPTIONS[exportAtmosphereId]}
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
