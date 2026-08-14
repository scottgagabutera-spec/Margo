'use client'

import Image from 'next/image'
import { CardOverflowMenu } from '@/components/card-overflow-menu'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { buildSnippetQueueOverflowItems } from '@/components/song-card-actions'
import { togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import type { LibraryPlaylistItem } from '@/lib/library/playlists'
import { useRef } from 'react'

export function PlaylistLyricRow({
  item,
  queueSlot,
  onPlay,
  onPlayNext,
  onAddQueue,
}: {
  item: LibraryPlaylistItem
  /** Index in the session queue this row maps to, or -1 if not playable. */
  queueSlot: number
  onPlay: () => void
  onPlayNext: () => void
  onAddQueue: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  useWarmAudioUrlOnVisible(item.audioUrl, cardRef, !!item.audioUrl)
  const { playing, buffering, queueIndex } = useAudioEngine()
  const isThisRow = playing && queueSlot >= 0 && queueIndex === queueSlot
  const canQueue = !!item.audioUrl && (item.status === 'live' || item.status === 'active' || !item.status)
  const primary = item.isSnippet && item.lineText
    ? `“${item.lineText}”`
    : item.title
  const meta = item.isSnippet
    ? `${item.title} · ${item.artist}`
    : item.artist

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={() => { if (isThisRow) togglePlayPause(); else onPlay() }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (isThisRow) togglePlayPause()
          else onPlay()
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        minHeight: 'var(--margo-touch-min)',
        borderRadius: '12px',
        border: `1px solid ${isThisRow ? 'var(--gold-border)' : 'var(--border)'}`,
        background: isThisRow ? 'var(--gold-faint)' : 'rgba(255,255,255,0.02)',
        cursor: canQueue ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: 'var(--gold-faint)',
      }}>
        {item.artwork ? (
          <Image src={item.artwork} alt="" fill style={{ objectFit: 'cover' }} sizes="40px" />
        ) : null}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: '0.9rem',
          color: 'var(--text)',
          margin: 0,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {primary}
        </p>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '4px 0 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {meta}
        </p>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
        onClick={e => { e.preventDefault(); e.stopPropagation() }}
      >
        <button
          type="button"
          aria-label={isThisRow ? 'Pause' : 'Play'}
          disabled={!canQueue}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            if (isThisRow) togglePlayPause()
            else onPlay()
          }}
          style={{
            width: 'var(--margo-touch-min)',
            height: 'var(--margo-touch-min)',
            borderRadius: '50%',
            flexShrink: 0,
            background: isThisRow ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
            border: '1px solid var(--gold-border)',
            cursor: canQueue ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxSizing: 'border-box',
            opacity: canQueue ? 1 : 0.4,
          }}
        >
          <PlayPauseIcon playing={isThisRow} buffering={isThisRow && buffering} size={15} color="var(--gold)" />
        </button>
        <CardOverflowMenu
          items={buildSnippetQueueOverflowItems({
            canQueue,
            onPlayNext,
            onAdd: onAddQueue,
          })}
        />
      </div>
    </div>
  )
}
