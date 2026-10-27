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
              minHeight: '44px',
              padding: '9px 4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              data-vibe-chip-face={vibe}
              style={{
                padding: '5px 9px',
                borderRadius: '8px',
                fontFamily: UI_FONT,
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                boxSizing: 'border-box',
                background: active ? 'var(--gold)' : 'transparent',
                border: `1px solid ${active ? 'var(--gold)' : color}`,
                color: active ? 'var(--bg)' : color,
              }}
            >
              {vibe}
            </span>
          </button>
        )
      })}
    </div>
  )
}
