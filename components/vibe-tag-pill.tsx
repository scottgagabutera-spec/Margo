'use client'

import { discoverVibeColor } from '@/lib/discover-vibes'

export function VibeTagPill({
  vibe,
  onClick,
  size = 'default',
}: {
  vibe: string
  onClick?: (e: React.MouseEvent) => void
  size?: 'default' | 'discover'
}) {
  const color = discoverVibeColor(vibe)
  const discover = size === 'discover'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: discover ? 'var(--font-geist-sans), system-ui, sans-serif' : 'var(--font-lora), serif',
        fontSize: discover ? '9px' : '0.5rem',
        fontWeight: 700,
        letterSpacing: discover ? '0.1em' : '1px',
        textTransform: 'uppercase',
        padding: discover ? '3px 8px' : '3px 9px',
        borderRadius: '50px',
        background: discover ? 'transparent' : `${color}18`,
        border: `1px solid ${color}${discover ? '55' : '40'}`,
        color,
        cursor: 'pointer',
        flexShrink: 0,
        minHeight: discover ? '24px' : undefined,
      }}
    >{vibe}</button>
  )
}
