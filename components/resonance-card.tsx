'use client'

import { useRef, useState } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { VibeTagPill } from '@/components/vibe-tag-pill'
import { AuthorMeta } from '@/components/username-tag'
import { buildSnippetQueueOverflowItems } from '@/components/song-card-actions'
import { useIdentity } from '@/hooks/useIdentity'
import { resolveMomentLines, type PostLine } from '@/lib/post-lines'
import { EditMomentModal } from '@/components/edit-moment-modal'
import { MargoDeleteConfirm } from '@/components/margo-delete-confirm'
import type { Post } from '@/hooks/usePosts'
import { DISCOVER_VIBES } from '@/lib/discover-vibes'
import { AtmosphereLayer } from '@/components/atmosphere-layer'
import { UI_FONT } from '@/lib/fonts'

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
  variant?: 'row' | 'grid' | 'discover'
  onPlay: (e: React.MouseEvent) => void
  onSelectVibe: (vibe: string) => void
  onPlayNext: () => void
  onAddQueue: () => void
}) {
  const emotion = (post.emotion || '').toUpperCase()
  const hasVibeTag = (DISCOVER_VIBES as readonly string[]).includes(emotion)
  const isDiscover = variant === 'discover'
  const isCompactCard = isDiscover || variant === 'grid'

  // Was reading post.text directly — the position-0 mirror, so a 2/3-line
  // Moment only ever showed its first line here. resolveMomentLines is the
  // canonical source of truth (same helper Feed/Post Detail/Profile/Search
  // already use); the existing single-paragraph treatment below (with its
  // 4-line clamp) already handles arbitrary length, so joining the lines
  // into one string is enough — no second stitch/divider UI needed in a
  // card this compact.
  const momentLines: PostLine[] = resolveMomentLines(post)
  const momentText = momentLines.length > 0
    ? momentLines.map((l) => l.text).join('  /  ')
    : post.text || ''

  const { user } = useIdentity()
  const isOwner = !!user?.id && !!post.authorUid && post.authorUid === user.id
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletedLocally, setDeletedLocally] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

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
    <div ref={cardRef} style={{ position: 'relative' }}>
      <PendingNavLink
        href={`/feed?highlight=${encodeURIComponent(post.id)}&openLb=1`}
        className={isDiscover ? 'discover-home-resonance-card' : undefined}
        style={{
          flexShrink: variant === 'row' || isDiscover ? 0 : undefined,
          width: variant === 'row' ? '240px' : isDiscover ? undefined : '100%',
          scrollSnapAlign: variant === 'row' || isDiscover ? 'start' : undefined,
          padding: isDiscover ? '12px' : '16px',
          background: isDiscover ? 'var(--surface)' : 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textDecoration: 'none',
          boxSizing: 'border-box',
          height: '100%',
          minHeight: isCompactCard ? '168px' : undefined,
          position: 'relative',
          isolation: 'isolate',
        }}
      >
        <AtmosphereLayer
          variant="card"
          rooms={momentLines.flatMap((l) => (
            l.songId ? [{ songId: l.songId, lineText: l.text }] : []
          ))}
        />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {hasVibeTag && (
              <VibeTagPill
                vibe={emotion}
                size={isDiscover ? 'discover' : 'default'}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectVibe(emotion) }}
              />
            )}
          </div>
          <CardOverflowMenu compact={isDiscover} items={overflowItems} />
        </div>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
          fontSize: isDiscover ? '14px' : '0.88rem',
          color: 'var(--text)', lineHeight: isDiscover ? 1.35 : 1.5, margin: 0,
          display: '-webkit-box', WebkitLineClamp: isDiscover ? 3 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: isDiscover ? 'calc(14px * 1.35 * 3)' : '4.2em',
        }}>&ldquo;{momentText}&rdquo;</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {post.knowledge?.artwork && (
              <div style={{
                width: isDiscover ? '22px' : '30px',
                height: isDiscover ? '22px' : '30px',
                borderRadius: isDiscover ? '6px' : '6px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.knowledge.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              {isDiscover ? (
                <p style={{
                  fontFamily: UI_FONT, fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)',
                  margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {(post.authorDisplayName || post.username || 'listener')} · {post.knowledge?.song || 'Margo'}
                </p>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {post.knowledge?.song || 'Margo'}
                  </p>
                  <AuthorMeta
                    authorUid={post.authorUid}
                    fallbackName={post.username || 'listener'}
                    linkProfile={false}
                    size="compact"
                  />
                </>
              )}
            </div>
          </div>
          {post.audioUrl && (
            <button type="button" onClick={onPlay} style={{
              width: isDiscover ? '28px' : 'var(--margo-touch-min)',
              height: isDiscover ? '28px' : 'var(--margo-touch-min)',
              borderRadius: '50%', flexShrink: 0,
              background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
              border: '1px solid rgba(232,197,71,0.25)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
            }}>
              <PlayPauseIcon playing={isPlaying} buffering={!!isBuffering} size={isDiscover ? 12 : 15} color="var(--gold)" />
            </button>
          )}
        </div>
      </PendingNavLink>
      <div
        className="margo-post-delete-inline-host"
        data-delete-inline-host={post.id}
        data-no-card-nav
      />
      {isOwner && (
        <>
          <EditMomentModal
            open={editOpen}
            onOpenChange={setEditOpen}
            postId={post.id}
            lines={resolveMomentLines(post)}
            echoCount={post.replies || 0}
          />
          <MargoDeleteConfirm
            anchorRef={cardRef}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            postId={post.id}
            onDeleted={() => setDeletedLocally(true)}
          />
        </>
      )}
    </div>
  )
}
