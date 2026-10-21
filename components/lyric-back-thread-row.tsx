'use client'

import { useEffect, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type { Echo } from '@/hooks/useEchoes'
import {
  FeedIconCard,
  FeedIconHeart,
  FeedIconHeartFilled,
  FeedIconLyricBack,
  FeedIconReplay,
  FeedIconExternal,
  FeedMomentPlaybackIcon,
} from '@/components/feed-card-icons'
import { PendingNavLink } from '@/components/pending-nav-link'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import {
  externalListenAriaLabel,
  resolveExternalListenUrl,
} from '@/lib/moment/listen'

const supabase = createClient()

export type LyricBackThreadRowProps = {
  echo: Echo
  /** Highlight when this post is the thread anchor (e.g. on /post/[id]). */
  isAnchor?: boolean
  resonated?: boolean
  resonateCount?: number
  /** Controlled resonate from parent (thread page). If omitted, row toggles itself. */
  onResonate?: (echoId: string) => void
  onLyricBack?: (echoId: string) => void
  onOpenThread?: (echoId: string) => void
  onExport?: (echo: Echo) => void
  onReplay?: (echoId: string) => void
  replayed?: boolean
  replayCount?: number
  /** reply = smaller nested row; anchor = focused post on thread page */
  tone?: 'reply' | 'anchor'
}

function profileHref(echo: Echo): string | null {
  const handle = (echo.username || '').replace(/^@/, '').trim()
  if (!handle) return null
  return `/profile/${encodeURIComponent(handle)}`
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
}: LyricBackThreadRowProps) {
  const engine = useAudioEngine()
  const { user } = useIdentity()
  const { requireAuth } = useAuthGate()
  const myId = user?.id

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

  const handle = echo.username ? `@${echo.username.replace(/^@/, '')}` : null
  const href = profileHref(echo)
  const lbCount = echo.echoCount ?? 0

  const toggleResonate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (controlled) {
      onResonate?.(echo.id)
      return
    }
    if (!requireAuth() || !myId) return
    const was = resonatedLocal
    setResonatedLocal(!was)
    setCountLocal((c) => Math.max(0, c + (was ? -1 : 1)))
    try {
      if (was) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', echo.id).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: echo.id, actor_id: myId })
        if (error) throw error
      }
    } catch {
      setResonatedLocal(was)
      setCountLocal((c) => Math.max(0, c + (was ? 1 : -1)))
    }
  }

  const rowClass = [
    'margo-lb-thread-row',
    isAnchor || tone === 'anchor' ? 'margo-lb-thread-row--anchor' : '',
    !isAnchor && tone === 'reply' ? 'margo-lb-thread-row--reply' : '',
  ].filter(Boolean).join(' ')

  return (
    <article
      className={rowClass}
      data-echo-id={echo.id}
    >
      {isAnchor ? (
        <p className="margo-lb-thread-row__badge">This Lyric Back</p>
      ) : (
        <p className="margo-lb-thread-row__badge margo-lb-thread-row__badge--reply">Lyric Back</p>
      )}
      <div className="margo-lb-thread-row__head">
        {handle && href ? (
          <PendingNavLink href={href} indicator="subtle" className="margo-lb-thread-row__user" onClick={(e) => e.stopPropagation()}>
            {handle}
          </PendingNavLink>
        ) : handle ? (
          <span className="margo-lb-thread-row__user">{handle}</span>
        ) : null}
        {(echo.song || echo.artist) ? (
          <p className="margo-lb-thread-row__track">
            {echo.song ? <span className="margo-lb-thread-row__song">{echo.song}</span> : null}
            {echo.artist ? <span className="margo-lb-thread-row__artist">{echo.artist}</span> : null}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="margo-lb-thread-row__bubble"
        onClick={() => onOpenThread?.(echo.id)}
      >
        &ldquo;{echo.lyric}&rdquo;
      </button>
      <div className="margo-lb-thread-row__actions" data-no-card-nav>
        <button type="button" className="margo-lb-thread-row__action" aria-label={resonated ? 'Remove resonate' : 'Resonate'} onClick={(e) => void toggleResonate(e)}>
          {resonated ? <FeedIconHeartFilled size={16} /> : <FeedIconHeart size={16} />}
          <span>{resonateCount > 0 ? resonateCount : 'Resonate'}</span>
        </button>
        <button
          type="button"
          className="margo-lb-thread-row__action"
          aria-label="Lyric Back"
          onClick={(e) => { e.stopPropagation(); onLyricBack?.(echo.id) }}
        >
          <FeedIconLyricBack size={16} />
          <span>{lbCount > 0 ? lbCount : 'Lyric Back'}</span>
        </button>
        <button
          type="button"
          className="margo-lb-thread-row__action"
          aria-label="Replay"
          onClick={(e) => { e.stopPropagation(); onReplay?.(echo.id) }}
          style={{ color: replayed ? 'var(--gold)' : undefined }}
        >
          <FeedIconReplay size={16} />
          <span>{replayCount > 0 ? replayCount : 'Replay'}</span>
        </button>
        <button
          type="button"
          className="margo-lb-thread-row__action"
          aria-label="Export card"
          onClick={(e) => { e.stopPropagation(); onExport?.(echo) }}
        >
          <FeedIconCard size={16} />
          <span>Card</span>
        </button>
        {canPlay ? (
          <button
            type="button"
            className="margo-lb-thread-row__action margo-lb-thread-row__action--play"
            aria-label={isPlaying ? 'Pause' : 'Play line'}
            onClick={(e) => {
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
            }}
          >
            <FeedMomentPlaybackIcon playing={isPlaying} size={16} color="var(--post-vibe-fill)" />
          </button>
        ) : null}
        {externalHref ? (
          <a
            className="margo-lb-thread-row__action"
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={externalListenAriaLabel(externalHref) || 'Open in music app'}
            onClick={(e) => e.stopPropagation()}
          >
            <FeedIconExternal size={16} />
            <span>Open</span>
          </a>
        ) : null}
      </div>
    </article>
  )
}
