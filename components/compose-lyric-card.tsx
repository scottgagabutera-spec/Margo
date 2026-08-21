'use client'

import type { CSSProperties, ReactNode } from 'react'
import { LYRIC_FONT } from '@/lib/fonts'

interface ComposeLyricCardProps {
  /** True when this line has hosted Margo audio linked — mirrors post-card.tsx's tier-1 treatment. */
  hasAudio?: boolean
  children: ReactNode
  style?: CSSProperties
}

/**
 * Shared Moment-card visual language for Compose (Your line / Feeling /
 * Ready to send). Mirrors components/post-card.tsx's real lyric card
 * background/border/radius exactly, so the draft preview reads as the
 * same object the user will see once it's an actual Moment — not a
 * separate gold form card invented for Compose alone.
 */
export function ComposeLyricCard({ hasAudio = false, children, style }: ComposeLyricCardProps) {
  return (
    <div
      style={{
        background: hasAudio ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hasAudio ? 'rgba(232,197,71,0.22)' : 'rgba(255,255,255,0.06)'}`,
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

/** Same typography as post-card.tsx's lyric line — the one Lora italic voice. */
export const composeLyricTextStyle: CSSProperties = {
  fontFamily: LYRIC_FONT,
  fontStyle: 'italic',
  fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)',
  color: 'var(--text)',
  lineHeight: 1.45,
  margin: 0,
  textAlign: 'left',
}
