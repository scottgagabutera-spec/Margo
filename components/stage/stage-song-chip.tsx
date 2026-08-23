'use client'

import { CloseIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

interface StageSongChipProps {
  title: string
  artist: string
  artwork?: string | null
  onClear: () => void
}

export function StageSongChip({ title, artist, artwork, onClear }: StageSongChipProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '100%',
        padding: '6px 10px 6px 6px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '50px',
        boxSizing: 'border-box',
      }}
    >
      {artwork ? (
        <img
          src={artwork}
          alt=""
          style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0, background: 'var(--surface-2)' }} />
      )}
      <span
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.82rem',
          color: 'var(--text)',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {title}
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> · {artist}</span>
      </span>
      <button
        type="button"
        aria-label="Clear song"
        onClick={onClear}
        style={{
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          margin: '-6px -8px -6px 0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          color: 'var(--text-muted)',
        }}
      >
        <CloseIcon size={16} color="currentColor" />
      </button>
    </div>
  )
}
