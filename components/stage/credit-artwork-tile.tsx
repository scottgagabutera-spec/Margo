'use client'

import type { CSSProperties } from 'react'
import { MusicNoteIcon } from '@/components/icons'

export function CreditArtworkTile({
  size,
  src,
  style,
}: {
  size: number
  src?: string | null
  style?: CSSProperties
}) {
  const radius = size * 0.18
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          display: 'block',
          ...style,
        }}
      />
    )
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'rgba(7, 6, 10, 0.55)',
        border: '1px solid rgba(232, 197, 71, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <MusicNoteIcon size={Math.round(size * 0.42)} color="var(--gold)" />
    </div>
  )
}
