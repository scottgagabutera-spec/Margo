'use client'

import type { CSSProperties } from 'react'
import { UI_FONT } from '@/lib/fonts'
import {
  cycleExportAtmosphere,
  exportAtmosphereLabel,
  type AtmosphereId,
} from '@/lib/atmosphere'
import {
  cycleExportShape,
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

function columnLabelStyle(muted: string): CSSProperties {
  return {
    fontFamily: UI_FONT,
    fontSize: '0.56rem',
    fontWeight: 600,
    letterSpacing: '0.55px',
    textTransform: 'uppercase',
    color: muted,
    lineHeight: 1,
    marginBottom: '8px',
    display: 'block',
    textAlign: 'center',
  }
}

/**
 * Export-only customization — lives below the card, not inside it.
 * Three equal columns (Color / Effect / Size) inspired by Stories toolbars:
 * label above, tap target below, no horizontal overflow.
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
  const chipBorder = theme.markVariant === 'on-light'
    ? 'rgba(7,6,10,0.16)'
    : 'rgba(255,255,255,0.18)'
  const chipBg = theme.markVariant === 'on-light'
    ? 'rgba(7,6,10,0.06)'
    : 'rgba(255,255,255,0.08)'

  const tapStyle: CSSProperties = {
    width: '100%',
    minHeight: 'var(--margo-touch-min)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 6px',
    borderRadius: '12px',
    border: `1px solid ${chipBorder}`,
    background: chipBg,
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
        gap: '10px',
        width: '100%',
        marginTop: '14px',
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span style={columnLabelStyle(theme.inkMuted)}>Color</span>
        <button
          type="button"
          aria-label={`Color: ${theme.label}. Tap to change.`}
          onClick={() => onThemeChange(cycleStageCardTheme(cardThemeId).id)}
          style={tapStyle}
        >
          <span
            aria-hidden
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              border: `2px solid ${theme.ink}`,
              background: theme.swatch,
              boxShadow: theme.markVariant === 'on-light'
                ? 'inset 0 0 0 1.5px rgba(255,255,255,0.55)'
                : 'inset 0 0 0 1.5px rgba(255,255,255,0.14)',
            }}
          />
        </button>
      </div>

      <div style={{ minWidth: 0 }}>
        <span style={columnLabelStyle(theme.inkMuted)}>Effect</span>
        <button
          type="button"
          aria-label={`Effect: ${exportAtmosphereLabel(exportAtmosphereId)}. Tap to change.`}
          onClick={() => onExportAtmosphereChange(cycleExportAtmosphere(exportAtmosphereId))}
          style={tapStyle}
        >
          <span
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.35px',
              textTransform: 'uppercase',
              color: theme.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              padding: '0 4px',
            }}
          >
            {exportAtmosphereLabel(exportAtmosphereId)}
          </span>
        </button>
      </div>

      <div style={{ minWidth: 0 }}>
        <span style={columnLabelStyle(theme.inkMuted)}>Size</span>
        <button
          type="button"
          aria-label={`Size: ${EXPORT_SHAPE_LABELS[shapeId]}. Tap to change.`}
          onClick={() => onShapeChange(cycleExportShape(shapeId))}
          style={tapStyle}
        >
          <span
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.35px',
              textTransform: 'uppercase',
              color: theme.ink,
            }}
          >
            {EXPORT_SHAPE_LABELS[shapeId]}
          </span>
        </button>
      </div>
    </div>
  )
}
