'use client'

import { DISCOVER_VIBES, discoverVibeColor } from '@/lib/discover-vibes'
import { UI_FONT } from '@/lib/fonts'

export function DiscoverVibeFilterRow({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <div
      data-discover-vibe-row
      className="margo-discover-vibe-row"
      style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}
    >
      {DISCOVER_VIBES.map(vibe => {
        const active = selected === vibe
        const color = vibe === 'ALL' ? 'var(--text-secondary)' : discoverVibeColor(vibe)
        return (
          <button
            key={vibe}
            type="button"
            data-vibe-chip={vibe}
            className={`margo-btn margo-btn--chip margo-discover-vibe-chip${active ? ' margo-discover-vibe-chip--active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(vibe)}
            style={{
              flexShrink: 0,
              fontFamily: UI_FONT,
              borderColor: active ? 'var(--border-hi)' : color,
              color: active ? 'var(--text)' : color,
            }}
          >
            {vibe === 'ALL' ? 'All' : vibe.charAt(0) + vibe.slice(1).toLowerCase()}
          </button>
        )
      })}
    </div>
  )
}
