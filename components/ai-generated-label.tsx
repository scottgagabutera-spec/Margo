'use client'

import { UI_FONT } from '@/lib/fonts'

/**
 * Inline disclosure for songs the artist marked as AI-generated.
 * Quiet supporting meta — not an earned badge or CTA chip.
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
        fontSize: '0.65rem',
        fontWeight: 500,
        letterSpacing: '0.2px',
        padding: '2px 8px',
        borderRadius: '6px',
        background: 'var(--gold-faint)',
        border: '1px solid var(--border)',
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
