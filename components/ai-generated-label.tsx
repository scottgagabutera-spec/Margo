'use client'

import { UI_FONT } from '@/lib/fonts'

/**
 * Inline disclosure for songs the artist marked as AI-generated.
 */
export function AiGeneratedLabel({
  show = true,
  spaced = true,
  variant = 'default',
  style,
}: {
  show?: boolean
  spaced?: boolean
  /** Feed song row: compact "AI" outline tag. */
  variant?: 'default' | 'feed'
  style?: React.CSSProperties
}) {
  if (!show) return null

  if (variant === 'feed') {
    return (
      <span
        className="margo-feed-ai-tag"
        style={style}
      >
        AI
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline',
        fontFamily: UI_FONT,
        fontSize: 'var(--feed-type-ai-label, 0.75rem)',
        fontWeight: 400,
        letterSpacing: 0,
        color: 'var(--text-muted)',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      {spaced ? '\u2009' : null}AI-generated
    </span>
  )
}
