'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'

const ASPECT: Record<MomentShapeId, string> = {
  square: '1 / 1',
  vertical: '9 / 16',
  wide: '16 / 9',
}

interface MomentPreviewSlotProps {
  shapeId: MomentShapeId
  children: ReactNode
  /** Laptop preview column — show PREVIEW · FEED / 1:1 label */
  showDesktopLabel?: boolean
  style?: CSSProperties
}

/**
 * Fixed-height preview well. The card keeps its true aspect ratio and scales
 * to fit — switching size never changes the slot height or moves controls below.
 */
export function MomentPreviewSlot({
  shapeId,
  children,
  showDesktopLabel = false,
  style,
}: MomentPreviewSlotProps) {
  const ratioLabel =
    shapeId === 'vertical' ? '9:16' : shapeId === 'wide' ? '16:9' : '1:1'
  const feedLabel =
    shapeId === 'vertical' ? 'SHORTS' : shapeId === 'wide' ? 'WIDE' : 'FEED'

  return (
    <div className="margo-moment-preview-slot-wrap" style={style}>
      {showDesktopLabel ? (
        <div className="margo-moment-preview-slot__label" aria-hidden>
          <span>{`PREVIEW · ${feedLabel}`}</span>
          <span>{ratioLabel}</span>
        </div>
      ) : null}
      <div
        className="margo-moment-preview-slot"
        aria-label={`Moment preview, ${feedLabel} ${ratioLabel}`}
      >
        <div
          className="margo-moment-preview-slot__inner"
          data-shape={shapeId}
          style={{ aspectRatio: ASPECT[shapeId] }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
