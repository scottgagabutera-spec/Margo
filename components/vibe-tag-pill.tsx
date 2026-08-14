'use client'

import { discoverVibeColor } from '@/lib/discover-vibes'

export function VibeTagPill({
  vibe,
  onClick,
}: {
  vibe: string
  onClick?: (e: React.MouseEvent) => void
}) {
  const color = discoverVibeColor(vibe)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
        letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 9px',
        borderRadius: '50px', background: `${color}18`, border: `1px solid ${color}40`,
        color, cursor: 'pointer', flexShrink: 0,
      }}
    >{vibe}</button>
  )
}
