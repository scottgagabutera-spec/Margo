'use client'

import { CloseIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

type Props = {
  title: string
  artist: string
  artwork?: string | null
  onClear: () => void
  onChangeSong: () => void
}

/** Compact 40px song row — sticky at top of compose scroll region. */
export function ComposeSongRow({ title, artist, artwork, onClear, onChangeSong }: Props) {
  return (
    <div className="margo-compose-song-row" data-testid="compose-song-row">
      {artwork ? (
        <img
          src={artwork}
          alt=""
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'var(--surface-2)' }} />
      )}
      <button
        type="button"
        onClick={onChangeSong}
        aria-label="Change song"
        style={{
          flex: 1,
          minWidth: 0,
          height: 40,
          maxHeight: 40,
          display: 'flex',
          alignItems: 'center',
          padding: '0 4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            width: '100%',
          }}
        >
          {title}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> · {artist}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Clear song"
        data-testid="compose-song-clear"
        onClick={onClear}
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
        }}
      >
        <CloseIcon size={16} color="currentColor" />
      </button>
    </div>
  )
}
