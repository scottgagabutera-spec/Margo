'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'

interface MomentExportPreviewFrameProps {
  shapeId: MomentShapeId
  children: ReactNode
  style?: CSSProperties
  /** When false, drop the preview chrome (border) — used by the Story viewer. */
  framed?: boolean
}

/**
 * Live size preview. Feed is the content-height card. Shorts is a native
 * 9:16 canvas — the card itself fills the frame.
 */
export function MomentExportPreviewFrame({
  shapeId,
  children,
  style,
  framed = true,
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
          width: 'min(100%, 320px)',
          aspectRatio: '9 / 16',
          border: framed ? '1px solid var(--border-hi)' : 'none',
          borderRadius: '18px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: 'var(--bg)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
