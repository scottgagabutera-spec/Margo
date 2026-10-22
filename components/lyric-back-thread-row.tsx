'use client'

import { useEffect, useState } from 'react'
import type { Echo } from '@/hooks/useEchoes'
import { PendingNavLink } from '@/components/pending-nav-link'
import { PostThumbnail } from '@/components/post-thumbnail'
import { RelativeTime } from '@/components/relative-time'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import { resolveExternalListenUrl } from '@/lib/moment/listen'
import { FeedPostActions } from '@/components/feed-post-actions'
import { LyricBackTrackListenControl } from '@/components/lyric-back-track-listen-control'
import { RepostSheet } from '@/components/repost-sheet'
import { echoToPost } from '@/lib/echo-to-post'

const supabase = createClient()

export type LyricBackThreadRowProps = {
  echo: Echo
  isAnchor?: boolean
  resonated?: boolean
  resonateCount?: number
  onResonate?: (echoId: string) => void
  onLyricBack?: (echoId: string) => void
  onOpenThread?: (echoId: string) => void
  onExport?: (echo: Echo) => void
  onReplay?: (echoId: string) => void
  onQuoteReplay?: (echoId: string, note: string) => void
  onUndoReplay?: (echoId: string) => void
  replayNote?: string | null
  replayed?: boolean
  replayCount?: number
  tone?: 'reply' | 'anchor'
  /** Hide Lyric Back action (depth cap, or a focused row that should not drill). */
  hideLyricBackAction?: boolean
  /** Thread focus: user is already composing a Lyric Back to this row. */
  lyricBackSessionActive?: boolean
  /** 0–3. Deeper threads stay at step 3. */
  visualStep?: 0 | 1 | 2 | 3
}

function profileHref(echo: Echo): string | null {
  const handle = (echo.username || '').replace(/^@/, '').trim()
  if (!handle) return null
  return `/profile/${encodeURIComponent(handle)}`
}

function authorLabels(echo: Echo): { display: string; handle: string | null } {
  const handleRaw = (echo.username || '').replace(/^@/, '').trim()
  const display = (echo.displayName || '').trim()
  if (display) {
    return {
      display,
      handle: handleRaw ? `@${handleRaw}` : null,
    }
  }
  if (handleRaw) {
    return { display: `@${handleRaw}`, handle: null }
  }
  return { display: 'Member', handle: null }
}

function AuthorAvatar({ echo }: { echo: Echo }) {
  const [broken, setBroken] = useState(false)
  const url = (echo.authorAvatarUrl || '').trim()
  const handleRaw = (echo.username || '').replace(/^@/, '').trim()
  const initial = (echo.displayName || handleRaw || 'M').charAt(0).toUpperCase()
  const px = 32

  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        width={px}
        height={px}
        onError={() => setBroken(true)}
        className="margo-lb-thread-row__avatar-img"
      />
    )
  }
  return (
    <span className="margo-lb-thread-row__avatar-fallback" aria-hidden>
      {initial}
    </span>
  )
}

export function LyricBackThreadRow({
  echo,
  isAnchor = false,
  resonated: resonatedProp,
  resonateCount: resonateCountProp,
  onResonate,
  onLyricBack,
  onOpenThread,
  onExport,
  onReplay,
  onQuoteReplay,
  onUndoReplay,
  replayNote = null,
  replayed = false,
  replayCount = 0,
  tone = 'reply',
  hideLyricBackAction = false,
  lyricBackSessionActive = false,
  visualStep = 0,
}: LyricBackThreadRowProps) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const myId = user?.id ?? null
  const [repostSheetOpen, setRepostSheetOpen] = useState(false)

  const [resonatedLocal, setResonatedLocal] = useState(
    () => Boolean(myId && echo.resonates?.[myId]),
  )
  const [countLocal, setCountLocal] = useState(echo.resonateCount ?? 0)

  const controlled = typeof onResonate === 'function'
  const resonated = controlled ? Boolean(resonatedProp) : resonatedLocal
  const resonateCount = controlled ? (resonateCountProp ?? 0) : countLocal

  useEffect(() => {
    if (controlled) return
    setResonatedLocal(Boolean(myId && echo.resonates?.[myId]))
    setCountLocal(echo.resonateCount ?? 0)
  }, [controlled, echo.id, echo.resonateCount, echo.resonates, myId])

  const canPlay = Boolean(echo.audioUrl && echo.songId)
  const externalHref = !canPlay
    ? resolveExternalListenUrl({
        songTitle: echo.song,
        artistName: echo.artist,
        itunesTrackUrl: echo.externalListenUrl,
      })
    : null
  const showTrackStrip = Boolean(
    (echo.song || '').trim()
    || (echo.artist || '').trim()
    || echo.songId
    || echo.externalListenUrl
    || canPlay
    || externalHref,
  )

  const href = profileHref(echo)
  const { display, handle } = authorLabels(echo)
  const lbCount = echo.echoCount ?? 0
  const songHref = echo.songId ? `/song/${echo.songId}` : null

  const toggleResonate = async (id: string) => {
    if (controlled) {
      onResonate?.(id)
      return
    }
    if (!requireAuth() || !myId) return
    const was = resonatedLocal
    setResonatedLocal(!was)
    setCountLocal((c) => Math.max(0, c + (was ? -1 : 1)))
    try {
      if (was) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', id).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: id, actor_id: myId })
        if (error) throw error
      }
    } catch {
      setResonatedLocal(was)
      setCountLocal((c) => Math.max(0, c + (was ? 1 : -1)))
    }
  }

  const step = visualStep > 0 && !isAnchor && tone === 'reply' ? visualStep : 0
  const rowClass = [
    'margo-lb-thread-row',
    isAnchor || tone === 'anchor' ? 'margo-lb-thread-row--anchor' : '',
    !isAnchor && tone === 'reply' ? 'margo-lb-thread-row--reply' : '',
    step > 0 ? `margo-lb-thread-row--step-${step}` : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={rowClass} data-echo-id={echo.id}>
      {isAnchor ? (
        <p className="margo-lb-thread-row__badge">This Lyric Back</p>
      ) : null}

      <header className="margo-lb-thread-row__header">
        <div className="margo-lb-thread-row__avatar" aria-hidden>
          <AuthorAvatar echo={echo} />
        </div>
        <div className="margo-lb-thread-row__header-text">
          <div className="margo-lb-thread-row__header-line">
            {href ? (
              <PendingNavLink href={href} indicator="subtle" className="margo-lb-thread-row__display" onClick={(e) => e.stopPropagation()}>
                {display}
              </PendingNavLink>
            ) : (
              <span className="margo-lb-thread-row__display">{display}</span>
            )}
            {handle ? (
              <span className="margo-lb-thread-row__handle">{handle}</span>
            ) : null}
          </div>
          {echo.timestamp ? (
            <RelativeTime
              date={echo.timestamp}
              className="margo-lb-thread-row__time"
            />
          ) : null}
        </div>
      </header>

      <button
        type="button"
        className="margo-lb-thread-row__lyric"
        onClick={() => onOpenThread?.(echo.id)}
      >
        &ldquo;{echo.lyric}&rdquo;
      </button>

      {showTrackStrip ? (
        <div className="margo-lb-thread-row__track-row">
          <div className="margo-lb-thread-row__track-art">
            {songHref ? (
              <PendingNavLink href={songHref} indicator="tint" aria-label="Open song" onClick={(e) => e.stopPropagation()}>
                <PostThumbnail
                  artwork={echo.artwork}
                  alt=""
                  loading="lazy"
                  className="margo-lb-thread-row__art"
                />
              </PendingNavLink>
            ) : (
              <PostThumbnail
                artwork={echo.artwork}
                alt=""
                loading="lazy"
                className="margo-lb-thread-row__art"
              />
            )}
          </div>
          <div className="margo-lb-thread-row__track-meta">
            {echo.song ? (
              <span className="margo-lb-thread-row__song">{echo.song}</span>
            ) : echo.songId ? (
              <span className="margo-lb-thread-row__song">On Margo</span>
            ) : null}
            {echo.artist ? (
              <span className="margo-lb-thread-row__artist">{echo.artist}</span>
            ) : null}
          </div>
          <LyricBackTrackListenControl
            songId={echo.songId}
            audioUrl={echo.audioUrl}
            songTitle={echo.song}
            artistName={echo.artist}
            externalListenUrl={echo.externalListenUrl}
            lineIndex={0}
            lineText={echo.lyric}
            startSec={echo.snippetStart}
            endSec={echo.snippetEnd}
            artwork={echo.artwork}
            source="feed"
          />
        </div>
      ) : null}

      <FeedPostActions
        variant="compact"
        postId={echo.id}
        resonated={resonated}
        resonateCount={resonateCount}
        onResonate={toggleResonate}
        lyricBackAllowed={!hideLyricBackAction && Boolean(onLyricBack)}
        lyricBackOpen={false}
        lyricBackSessionActive={lyricBackSessionActive}
        echoCount={lbCount}
        onLyricBack={onLyricBack ? () => onLyricBack(echo.id) : undefined}
        onCard={() => onExport?.(echo)}
        replayed={replayed}
        replayCount={replayCount}
        onReplayTap={onReplay ? () => {
          if (!requireAuth()) return
          setRepostSheetOpen(true)
        } : undefined}
      />
      {onReplay ? (
        <RepostSheet
          open={repostSheetOpen}
          onOpenChange={setRepostSheetOpen}
          post={echoToPost(echo)}
          replayed={replayed}
          existingNote={replayNote}
          onRepost={onReplay}
          onRepostWithNote={(id, note) => onQuoteReplay?.(id, note)}
          onUndo={(id) => onUndoReplay?.(id)}
        />
      ) : null}
    </article>
  )
}
