'use client'

import { UI_FONT } from '@/lib/fonts'

/**
 * Inline disclosure for songs the artist marked as AI-generated.
 * Plain supporting metadata — no frame, border, or background.
 * Renders nothing when `show` is false — callers gate on the boolean.
 *
 * Default: small muted "(AI-generated)" immediately after the song title.
 */
export function AiGeneratedLabel({
  show = true,
  spaced = true,
  style,
}: {
  show?: boolean
  /** Narrow space before the bracket when following a title. */
  spaced?: boolean
  style?: React.CSSProperties
}) {
  if (!show) return null

  return (
    <span
      style={{
        display: 'inline',
        fontFamily: UI_FONT,
        fontSize: '0.52rem',
        fontWeight: 400,
        letterSpacing: 0,
        color: 'var(--text-muted)',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      {spaced ? '\u2009' : null}(AI-generated)
    </span>
  )
}
