'use client'

import { useRef } from 'react'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { CardOverflowMenu } from '@/components/card-overflow-menu'
import { VibeTagPill } from '@/components/vibe-tag-pill'
import { buildSnippetQueueOverflowItems } from '@/components/song-card-actions'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { AtmosphereLayer } from '@/components/atmosphere-layer'

export function LyricMomentCard({
  moment,
  isPlaying,
  isBuffering,
  variant = 'row',
  onClick,
  onPlay,
  onSelectVibe,
  onPlayNext,
  onAddQueue,
}: {
  moment: LyricMoment
  isPlaying: boolean
  isBuffering?: boolean
  variant?: 'row' | 'grid'
  onClick: () => void
  onPlay: (e: React.MouseEvent) => void
  onSelectVibe: (vibe: string) => void
  onPlayNext: () => void
  onAddQueue: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  useWarmAudioUrlOnVisible(moment.audioUrl, cardRef, true, moment.start)
  const primaryVibe = moment.vibes[0]
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className="moment-card"
      style={{
        flexShrink: variant === 'row' ? 0 : undefined,
        width: variant === 'row' ? '240px' : '100%',
        scrollSnapAlign: variant === 'row' ? 'start' : undefined,
        padding: '16px',
        background: isPlaying ? 'rgba(232,197,71,0.06)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isPlaying ? 'rgba(232,197,71,0.28)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        transition: 'border-color 200ms ease, background 200ms ease',
        boxSizing: 'border-box',
        height: '100%',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <AtmosphereLayer variant="card" songId={moment.songId} lineText={moment.line} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {primaryVibe && (
            <VibeTagPill vibe={primaryVibe} onClick={(e) => { e.stopPropagation(); onSelectVibe(primaryVibe) }} />
          )}
        </div>
        <CardOverflowMenu
          items={buildSnippetQueueOverflowItems({
            canQueue: !!moment.audioUrl,
            onPlayNext,
            onAdd: onAddQueue,
          })}
        />
      </div>
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.88rem',
        color: 'var(--text)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line',
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        minHeight: '4.2em',
      }}>&ldquo;{moment.line}&rdquo;</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{moment.songTitle}</p>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{moment.artist}</p>
        </div>
        <button type="button" onClick={onPlay} style={{
          width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
          background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
          border: '1px solid rgba(232,197,71,0.25)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
        }}>
          <PlayPauseIcon playing={isPlaying} buffering={!!isBuffering} size={15} color="var(--gold)" />
        </button>
      </div>
    </div>
  )
}
