'use client'

import { UI_FONT } from '@/lib/fonts'
import type { SongsSortMode } from '@/lib/discover-view-more-logic'

const OPTIONS: { value: SongsSortMode; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'top', label: 'Top' },
  { value: 'az', label: 'A–Z' },
]

export function DiscoverSongsSortSwitch({
  value,
  onChange,
}: {
  value: SongsSortMode
  onChange: (next: SongsSortMode) => void
}) {
  return (
    <div
      role="group"
      aria-label="Sort songs"
      data-discover-songs-sort
      style={{
        display: 'inline-flex',
        padding: '2px',
        borderRadius: '50px',
        border: '1px solid var(--border-hi)',
        background: 'var(--surface)',
        gap: '2px',
      }}
    >
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            data-sort={opt.value}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: UI_FONT,
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: active ? 'var(--gold)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--text-secondary)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
