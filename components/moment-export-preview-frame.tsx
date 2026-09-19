'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'
import { VERTICAL_CARD_WIDTH_FRACTION } from '@/lib/moment-export/export-shapes'

interface MomentExportPreviewFrameProps {
  shapeId: MomentShapeId
  children: ReactNode
  style?: CSSProperties
}

/**
 * Live size preview. Feed keeps the card at full width. Shorts places the
 * same card on a 9:16 stage at the same width fraction as PNG / MP4 export.
 */
export function MomentExportPreviewFrame({
  shapeId,
  children,
  style,
}: MomentExportPreviewFrameProps) {
  if (shapeId !== 'vertical') {
    return <div style={style}>{children}</div>
  }

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        aria-label="Shorts preview, 9:16"
        style={{
          width: 'min(100%, 236px)',
          aspectRatio: '9 / 16',
          background: 'var(--bg)',
          border: '1px solid var(--border-hi)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: `${VERTICAL_CARD_WIDTH_FRACTION * 100}%` }}>
          {children}
        </div>
      </div>
    </div>
  )
}
