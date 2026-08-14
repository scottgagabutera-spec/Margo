'use client'

import { ChevronUpIcon } from '@/components/icons/chevron-up-icon'

const font = 'var(--font-lora), serif'

type ContentUpdatesBarProps = {
  lyricsCount: number
  songCount: number
  artistCount: number
  onLyrics: () => void
  onSongs: () => void
  onArtists: () => void
}

function lineLabel(count: number, singular: string, plural: string) {
  if (count === 1) return `1 new ${singular}`
  return `${count} new ${plural}`
}

/**
 * One mixed rectangle under nav: lyrics / songs / artists.
 * Same quiet gold-tint recipe as the old lyrics pill (Feed EarnedTag).
 */
export function ContentUpdatesBar({
  lyricsCount,
  songCount,
  artistCount,
  onLyrics,
  onSongs,
  onArtists,
}: ContentUpdatesBarProps) {
  const rows: { key: string; label: string; onClick: () => void }[] = []
  if (lyricsCount > 0) {
    rows.push({ key: 'lyrics', label: lineLabel(lyricsCount, 'lyric', 'lyrics'), onClick: onLyrics })
  }
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
        top: 'calc(var(--nav-height, 72px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        minWidth: '168px',
        maxWidth: 'min(320px, calc(100vw - 32px))',
        boxSizing: 'border-box',
        background: 'rgba(232,197,71,0.1)',
        color: 'var(--gold)',
        border: '1px solid var(--gold-border)',
        borderRadius: '14px',
        boxShadow: 'none',
        animation: 'fadeInUp 280ms var(--ease-out) both',
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
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxSizing: 'border-box',
            background: 'transparent',
            color: 'var(--gold)',
            border: 'none',
            borderTop: i === 0 ? 'none' : '1px solid var(--gold-border)',
            fontFamily: font,
            fontWeight: 700,
            fontSize: '0.6rem',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <ChevronUpIcon size={14} color="var(--gold)" />
          {row.label}
        </button>
      ))}
    </div>
  )
}
