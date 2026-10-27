'use client'

import { StageSongChip } from '@/components/stage/stage-song-chip'
import { UI_FONT } from '@/lib/fonts'

type Props = {
  title: string
  artist: string
  artwork?: string | null
  onClear: () => void
  onChangeSong: () => void
}

/** Sticky song row for compose overlays (keyboard-safe). */
export function ComposeStickySongRow({ title, artist, artwork, onClear, onChangeSong }: Props) {
  return (
    <div className="margo-compose-sticky-song">
      <div className="margo-compose-sticky-song__chip">
        <StageSongChip title={title} artist={artist} artwork={artwork} onClear={onClear} />
      </div>
      <button
        type="button"
        onClick={onChangeSong}
        aria-label="Change song"
        style={{
          flexShrink: 0,
          minWidth: 'var(--margo-touch-min)',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 10px',
          borderRadius: '50px',
          border: '1px solid var(--border-hi)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontFamily: UI_FONT,
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Change
      </button>
    </div>
  )
}
