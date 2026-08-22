'use client'

import { UI_FONT } from '@/lib/fonts'

/**
 * Inline disclosure chip for songs the artist marked as AI-generated.
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
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: UI_FONT,
        fontSize: '0.58rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '50px',
        background: 'rgba(7,6,10,0.55)',
        border: '1px solid var(--gold-border)',
        color: 'rgba(232,197,71,0.88)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      AI-generated
    </span>
  )
}
