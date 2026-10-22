'use client'

import { useEffect, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type { Echo } from '@/hooks/useEchoes'
import {
  FeedIconExternal,
  FeedMomentPlaybackIcon,
} from '@/components/feed-card-icons'
import { PendingNavLink } from '@/components/pending-nav-link'
import { PostThumbnail } from '@/components/post-thumbnail'
import { RelativeTime } from '@/components/relative-time'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import {
  externalListenAriaLabel,
  resolveExternalListenUrl,
} from '@/lib/moment/listen'
import { FeedPostActions } from '@/components/feed-post-actions'

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
  replayed?: boolean
  replayCount?: number
  tone?: 'reply' | 'anchor'
  /** Hide Lyric Back action (focused item at thread root). */
  hideLyricBackAction?: boolean
  /** Thread focus: user is already composing a Lyric Back to this row. */
  lyricBackSessionActive?: boolean
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
  replayed = false,
  replayCount = 0,
  tone = 'reply',
  hideLyricBackAction = false,
  lyricBackSessionActive = false,
}: LyricBackThreadRowProps) {
  const engine = useAudioEngine()
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const myId = user?.id ?? null

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
  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === echo.songId
    && echo.snippetStart != null
    && Math.abs((engine.snippet?.startSec ?? 0) - echo.snippetStart) < 0.5

  const externalHref = !canPlay
    ? resolveExternalListenUrl({ songTitle: echo.song, artistName: echo.artist })
    : null

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

  const toggleSnippet = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying) {
      togglePlayPause()
      return
    }
    if (!echo.audioUrl || !echo.songId) return
    void playSnippet({
      songId: echo.songId,
      audioUrl: echo.audioUrl,
      title: echo.song,
      artist: echo.artist,
      artwork: echo.artwork ?? null,
      lineIndex: 0,
      lineText: echo.lyric,
      startSec: echo.snippetStart ?? 0,
      endSec: echo.snippetEnd ?? (echo.snippetStart ?? 0) + 8,
      source: 'feed',
    })
  }

  const rowClass = [
    'margo-lb-thread-row',
    isAnchor || tone === 'anchor' ? 'margo-lb-thread-row--anchor' : '',
    !isAnchor && tone === 'reply' ? 'margo-lb-thread-row--reply' : '',
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

      {(echo.song || echo.artist || canPlay || externalHref) ? (
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
            ) : null}
            {echo.artist ? (
              <span className="margo-lb-thread-row__artist">{echo.artist}</span>
            ) : null}
          </div>
          {canPlay ? (
            <button
              type="button"
              className="margo-lb-thread-row__snippet-btn"
              aria-label={isPlaying ? 'Pause line' : 'Play line'}
              onClick={toggleSnippet}
            >
              <span className="margo-lb-thread-row__snippet-btn-inner">
                <FeedMomentPlaybackIcon playing={isPlaying} size={16} color="var(--bg)" />
              </span>
            </button>
          ) : externalHref ? (
            <a
              className="margo-lb-thread-row__snippet-btn margo-lb-thread-row__snippet-btn--external"
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={externalListenAriaLabel(externalHref) || 'Open in music app'}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="margo-lb-thread-row__snippet-btn-inner margo-lb-thread-row__snippet-btn-inner--external">
                <FeedIconExternal size={16} />
              </span>
            </a>
          ) : null}
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
        onReplayTap={onReplay ? () => onReplay(echo.id) : undefined}
      />
    </article>
  )
}
