'use client'

import { HeartIcon } from '@/components/heart-icon'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { useSongLibrarySaves } from '@/hooks/useSongLibrarySaves'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  fullSongToQueueItem,
  queueAdd,
  queuePlayNext,
} from '@/lib/audio-engine'
import type { SongCardData } from '@/components/song-catalog-card'

/**
 * Like heart + overflow (Play Next / Add to Queue / Listen Later) for catalog song cards.
 * Never auto-queues on Like (D1). Listen Later = songs only (D2).
 */
export function SongCardActions({
  song,
  placement = 'cover',
}: {
  song: SongCardData
  /** cover = absolute overlays on artwork; inline = row of controls */
  placement?: 'cover' | 'inline'
}) {
  const { requireAuth } = useAuthGate()
  const { isLiked, isListenLater, toggleLike, toggleListenLater } = useSongLibrarySaves()
  const liked = isLiked(song.id)
  const later = isListenLater(song.id)
  const canQueue = !!(song.audioUrl && (song.status === 'live' || song.status === 'active' || !song.status))

  const queueSong = (mode: 'next' | 'add') => {
    if (!requireAuth()) return
    if (!song.audioUrl) return
    const item = fullSongToQueueItem({
      id: song.id,
      audioUrl: song.audioUrl,
      title: song.title,
      artist: song.artist,
      artwork: song.artwork ?? null,
    })
    if (mode === 'next') queuePlayNext(item)
    else queueAdd(item)
  }

  const items: CardOverflowItem[] = [
    {
      id: 'play-next',
      label: 'Play Next',
      disabled: !canQueue,
      onSelect: () => queueSong('next'),
    },
    {
      id: 'add-queue',
      label: 'Add to Queue',
      disabled: !canQueue,
      onSelect: () => queueSong('add'),
    },
    {
      id: 'listen-later',
      label: later ? 'Remove from Listen Later' : 'Listen Later',
      onSelect: () => { void toggleListenLater(song.id) },
    },
  ]

  const likeBtn = (
    <button
      type="button"
      aria-label={liked ? 'Unlike song' : 'Like song'}
      aria-pressed={liked}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        void toggleLike(song.id)
      }}
      style={{
        width: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        borderRadius: '50%',
        border: liked ? '1px solid rgba(232,197,71,0.45)' : '1px solid rgba(255,255,255,0.14)',
        background: liked ? 'rgba(232,197,71,0.18)' : 'rgba(7,6,10,0.72)',
        color: liked ? 'var(--gold)' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <HeartIcon filled={liked} size={14} color="currentColor" />
    </button>
  )

  if (placement === 'inline') {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={e => { e.preventDefault(); e.stopPropagation() }}
      >
        {likeBtn}
        <CardOverflowMenu items={items} />
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 3 }}>
        <CardOverflowMenu items={items} />
      </div>
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 3 }}>
        {likeBtn}
      </div>
    </>
  )
}

/** Build overflow-only items for snippet cards (Moment / Resonance). */
export function buildSnippetQueueOverflowItems(opts: {
  canQueue: boolean
  onPlayNext: () => void
  onAdd: () => void
}): CardOverflowItem[] {
  return [
    {
      id: 'play-next',
      label: 'Play Next',
      disabled: !opts.canQueue,
      onSelect: opts.onPlayNext,
    },
    {
      id: 'add-queue',
      label: 'Add to Queue',
      disabled: !opts.canQueue,
      onSelect: opts.onAdd,
    },
  ]
}
