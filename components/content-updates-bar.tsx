'use client'

import { ChevronUpIcon } from '@/components/icons/chevron-up-icon'

const font = 'var(--font-lora), serif'

type ContentUpdatesBarProps = {
  songCount: number
  artistCount: number
  onSongs: () => void
  onArtists: () => void
  /** Extra offset when a sibling pill (e.g. new Moments) is visible above. */
  topOffsetPx?: number
}

function lineLabel(count: number, singular: string, plural: string) {
  if (count === 1) return `1 new ${singular}`
  return `${count} new ${plural}`
}

/**
 * Compact catalog-update rows (songs / artists) on Feed.
 * New Moments use FeedNewMomentsPill instead.
 */
export function ContentUpdatesBar({
  songCount,
  artistCount,
  onSongs,
  onArtists,
  topOffsetPx = 0,
}: ContentUpdatesBarProps) {
  const rows: { key: string; label: string; onClick: () => void }[] = []
  if (songCount > 0) {
    rows.push({ key: 'songs', label: lineLabel(songCount, 'song', 'songs'), onClick: onSongs })
  }
  if (artistCount > 0) {
    rows.push({ key: 'artists', label: lineLabel(artistCount, 'artist', 'artists'), onClick: onArtists })
  }
  if (rows.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: `calc(var(--nav-height, 72px) + 8px + ${topOffsetPx}px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 44,
        minWidth: '148px',
        maxWidth: 'min(280px, calc(100vw - 32px))',
        boxSizing: 'border-box',
        background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--gold)',
        border: '1px solid var(--gold-border)',
        borderRadius: '50px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        animation: 'fadeInUp 220ms var(--ease-out) both',
        overflow: 'hidden',
      }}
    >
      {rows.map((row, i) => (
        <button
          key={row.key}
          type="button"
          onClick={row.onClick}
          aria-label={`Show ${row.label}`}
          style={{
            width: '100%',
            minHeight: 'var(--margo-touch-min)',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            boxSizing: 'border-box',
            background: 'transparent',
            color: 'var(--gold)',
            border: 'none',
            borderTop: i === 0 ? 'none' : '1px solid var(--gold-border)',
            fontFamily: font,
            fontWeight: 700,
            fontSize: '0.58rem',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <ChevronUpIcon size={12} color="var(--gold)" />
          {row.label}
        </button>
      ))}
    </div>
  )
}
