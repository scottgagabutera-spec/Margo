'use client'

import { DISCOVER_VIBES, discoverVibeColor } from '@/lib/discover-vibes'

export function DiscoverVibeFilterRow({
  selected,
  onSelect,
  tone = 'catalog',
}: {
  selected: string
  onSelect: (v: string) => void
  /** catalog = view-more pages; home = Discover tab chip row */
  tone?: 'catalog' | 'home'
}) {
  const isHome = tone === 'home'
  return (
    <div
      data-discover-vibe-row
      style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}
    >
      {DISCOVER_VIBES.map(vibe => {
        const active = selected === vibe
        const color = vibe === 'ALL' ? 'var(--gold)' : discoverVibeColor(vibe)
        return (
          <button
            key={vibe}
            type="button"
            data-vibe-chip={vibe}
            onClick={() => onSelect(vibe)}
            style={{
              flexShrink: 0,
              padding: isHome ? '6px 11px' : '5px 12px',
              borderRadius: '50px',
              fontFamily: isHome
                ? 'var(--font-geist-sans), system-ui, sans-serif'
                : 'var(--font-lora), serif',
              fontSize: isHome ? '10px' : '0.52rem',
              fontWeight: 700,
              letterSpacing: isHome ? '0.08em' : '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              minHeight: isHome ? '44px' : undefined,
              boxSizing: 'border-box',
              background: active ? color : (isHome ? 'transparent' : `${color}12`),
              border: `1px solid ${active ? color : `${color}${isHome ? '55' : '35'}`}`,
              color: active ? 'var(--bg)' : color,
            }}
          >{vibe}</button>
        )
      })}
    </div>
  )
}
