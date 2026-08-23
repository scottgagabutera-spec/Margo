'use client'

import { UI_FONT } from '@/lib/fonts'

/**
 * Inline disclosure for songs the artist marked as AI-generated.
 * Plain supporting metadata — no frame, border, or background.
 * Renders nothing when `show` is false — callers gate on the boolean.
 */
export function AiGeneratedLabel({
  show = true,
  style,
}: {
  show?: boolean
  style?: React.CSSProperties
}) {
  if (!show) return null

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: UI_FONT,
        fontSize: '0.6rem',
        fontWeight: 400,
        letterSpacing: '0.2px',
        color: 'var(--text-muted)',
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      AI-generated
    </span>
  )
}
