'use client'

import { DISCOVER_VIBES, discoverVibeColor } from '@/lib/discover-vibes'

export function DiscoverVibeFilterRow({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (vibe: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
      {DISCOVER_VIBES.map(vibe => {
        const active = selected === vibe
        const color = vibe === 'ALL' ? 'var(--gold)' : discoverVibeColor(vibe)
        return (
          <button
            key={vibe}
            type="button"
            onClick={() => onSelect(vibe)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: '50px',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
              background: active ? color : `${color}12`,
              border: `1px solid ${active ? color : `${color}35`}`,
              color: active ? 'var(--bg)' : color,
            }}
          >{vibe}</button>
        )
      })}
    </div>
  )
}
