'use client'

import type { CSSProperties, ReactNode } from 'react'
import { LYRIC_FONT } from '@/lib/fonts'

interface ComposeLyricCardProps {
  children: ReactNode
  style?: CSSProperties
}

/**
 * The Margo Gold Moment — the core visual object of the Send a line flow.
 * Search and Pick the line are lists (scanning many items, calm/neutral
 * chrome is correct there). The instant a line is chosen, the screen
 * becomes about one object with full attention — that's the moment this
 * card exists for, and it deliberately breaks from the app's otherwise
 * black/restrained palette on purpose: gold here is the transformation
 * from "browsing" to "this is mine now," not decoration.
 *
 * Shares its ink tokens (--text-on-gold / --text-on-gold-muted) with the
 * exported card's Margo Gold theme, so Compose's Moment and the shared
 * artifact are the same object, not visually related cousins.
 */
export function ComposeLyricCard({ children, style }: ComposeLyricCardProps) {
  return (
    <div
      style={{
        background: 'var(--gold)',
        border: '1px solid rgba(7,6,10,0.16)',
        borderRadius: '18px',
        padding: '24px',
        position: 'relative',
        overflow: 'visible',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Same voice as the exported card's Margo Gold theme — the one Lora italic text. */
export const composeLyricTextStyle: CSSProperties = {
  fontFamily: LYRIC_FONT,
  fontStyle: 'italic',
  fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)',
  color: 'var(--text-on-gold)',
  lineHeight: 1.45,
  margin: 0,
  textAlign: 'left',
}
