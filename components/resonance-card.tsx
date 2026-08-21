'use client'

import { useState } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { VibeTagPill } from '@/components/vibe-tag-pill'
import { AuthorMeta } from '@/components/username-tag'
import { buildSnippetQueueOverflowItems } from '@/components/song-card-actions'
import { useIdentity } from '@/hooks/useIdentity'
import { resolveMomentLines } from '@/lib/post-lines'
import { EditMomentModal } from '@/components/edit-moment-modal'
import { DeleteMomentDialog } from '@/components/delete-moment-dialog'
import type { Post } from '@/hooks/usePosts'
import { DISCOVER_VIBES } from '@/lib/discover-vibes'

export function ResonanceCard({
  post,
  isPlaying,
  isBuffering,
  variant = 'row',
  onPlay,
  onSelectVibe,
  onPlayNext,
  onAddQueue,
}: {
  post: Post
  isPlaying: boolean
  isBuffering?: boolean
  variant?: 'row' | 'grid'
  onPlay: (e: React.MouseEvent) => void
  onSelectVibe: (vibe: string) => void
  onPlayNext: () => void
  onAddQueue: () => void
}) {
  const emotion = (post.emotion || '').toUpperCase()
  const hasVibeTag = (DISCOVER_VIBES as readonly string[]).includes(emotion)

  const { user } = useIdentity()
  const isOwner = !!user?.id && !!post.authorUid && post.authorUid === user.id
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletedLocally, setDeletedLocally] = useState(false)

  // Optimistic — the server delete already succeeded by the time this is
  // set. Other surfaces reconcile via their own Realtime subscription.
  if (deletedLocally) return null

  const overflowItems: CardOverflowItem[] = [
    ...buildSnippetQueueOverflowItems({
      canQueue: !!post.audioUrl && !!post.songId,
      onPlayNext,
      onAdd: onAddQueue,
    }),
    ...(isOwner
      ? [
          { id: 'edit', label: 'Edit', onSelect: () => setEditOpen(true) },
          { id: 'delete', label: 'Delete', onSelect: () => setDeleteOpen(true) },
        ]
      : []),
  ]

  return (
    <>
      <PendingNavLink
        href={`/lyric-back?postId=${post.id}`}
        style={{
          flexShrink: variant === 'row' ? 0 : undefined,
          width: variant === 'row' ? '240px' : '100%',
          scrollSnapAlign: variant === 'row' ? 'start' : undefined,
          padding: '16px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textDecoration: 'none',
          boxSizing: 'border-box',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {hasVibeTag && (
              <VibeTagPill vibe={emotion} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectVibe(emotion) }} />
            )}
          </div>
          <CardOverflowMenu items={overflowItems} />
        </div>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.88rem',
          color: 'var(--text)', lineHeight: 1.5, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: '4.2em',
        }}>&ldquo;{post.text}&rdquo;</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {post.knowledge?.artwork && (
              <div style={{ width: '30px', height: '30px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.knowledge.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {post.knowledge?.song || 'Margo'}
              </p>
              <AuthorMeta
                authorUid={post.authorUid}
                fallbackName={post.username || 'listener'}
                linkProfile={false}
                size="compact"
              />
            </div>
          </div>
          {post.audioUrl && (
            <button type="button" onClick={onPlay} style={{
              width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
              background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
              border: '1px solid rgba(232,197,71,0.25)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
            }}>
              <PlayPauseIcon playing={isPlaying} buffering={!!isBuffering} size={15} color="var(--gold)" />
            </button>
          )}
        </div>
      </PendingNavLink>
      {isOwner && (
        <>
          <EditMomentModal
            open={editOpen}
            onOpenChange={setEditOpen}
            postId={post.id}
            lines={resolveMomentLines(post)}
            echoCount={post.replies || 0}
          />
          <DeleteMomentDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            postId={post.id}
            onDeleted={() => setDeletedLocally(true)}
          />
        </>
      )}
    </>
  )
}
