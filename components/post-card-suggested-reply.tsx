'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  FeedIconClose,
  FeedIconChevronRight,
  FeedMomentPlaybackIcon,
} from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'
import {
  LyricBackPanelCompose,
  type LyricBackPanelComposeHandle,
  type LyricBackPanelPrefill,
} from '@/components/lyric-back-panel-compose'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  /** Root feed moment id (thread root). */
  postId: string
  echoCount: number
  parentUsername?: string | null
  parentEmotion: string
  parentMoment?: {
    text?: string
    song?: string | null
    artist?: string | null
  }
  open: boolean
  onClose: () => void
  onRequireAuth?: () => boolean
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
}

function LyricBackPanelSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="margo-post-card__lb-skeleton-row">
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
        </div>
      ))}
    </div>
  )
}

function IdeasSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton margo-post-card__lb-skeleton--compact" aria-hidden>
      <div className="margo-post-card__lb-skeleton-row">
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
      </div>
    </div>
  )
}

/**
 * Lyric Back comment sheet: echoes first, opt-in ideas, inline compose + send.
 */
export function PostCardSuggestedReply({
  postId,
  echoCount,
  parentUsername,
  parentEmotion,
  parentMoment,
  open,
  onClose,
  onRequireAuth,
  onOpenThread,
  onExportEcho,
  onReplayEcho,
}: PostCardSuggestedReplyProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const [replyTargetId, setReplyTargetId] = useState(postId)
  const [replyTargetEcho, setReplyTargetEcho] = useState<Echo | null>(null)
  const [composePrefill, setComposePrefill] = useState<LyricBackPanelPrefill | null>(null)
  const { echoes, loading: echoesLoading, refetch: refetchEchoes } = useEchoes(open ? replyTargetId : null)

  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [ideasFetched, setIdeasFetched] = useState(false)

  useEffect(() => {
    if (!open) {
      setIdeasOpen(false)
      setIdeasLoading(false)
      setIdeasError(null)
      setPicks(null)
      setIdeasFetched(false)
      setComposePrefill(null)
      setReplyTargetId(postId)
      setReplyTargetEcho(null)
    }
  }, [open, postId])

  useEffect(() => {
    if (open) {
      setReplyTargetId(postId)
      setReplyTargetEcho(null)
      setComposePrefill(null)
    }
  }, [open, postId])

  const loadIdeas = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIdeasError('Offline')
      setIdeasFetched(true)
      setIdeasLoading(false)
      return
    }
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const list = await fetchLyricBackSuggestionsForPost(postId)
      setPicks(list)
      setIdeasFetched(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load ideas'
      setIdeasError(message)
      setPicks(null)
      setIdeasFetched(false)
    } finally {
      setIdeasLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (!ideasOpen || ideasFetched || ideasLoading) return
    void loadIdeas()
  }, [ideasOpen, ideasFetched, ideasLoading, loadIdeas])

  const applySuggestion = useCallback((s: SuggestedLyricBack) => {
    setComposePrefill({
      lyric: s.text,
      songTitle: s.songTitle,
      artistName: s.artistName,
      songId: s.songId,
      startSec: s.startSec,
      endSec: s.endSec,
    })
    requestAnimationFrame(() => composeRef.current?.scrollIntoView())
  }, [])

  const focusNestedLyricBack = useCallback((echo: Echo) => {
    setReplyTargetId(echo.id)
    setReplyTargetEcho(echo)
    setComposePrefill(null)
    requestAnimationFrame(() => composeRef.current?.scrollIntoView())
  }, [])

  const replyToLabel = replyTargetEcho
    ? (() => {
      const handle = replyTargetEcho.username?.replace(/^@/, '').trim()
      const name = replyTargetEcho.displayName?.trim()
      if (name && handle) return `@${handle}`
      if (handle) return `@${handle}`
      return null
    })()
    : null

  if (!open) return null

  const displayCount = Math.max(echoCount, echoes.length)
  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className="margo-post-card__lb-panel"
      role="region"
      aria-label="Lyric Backs"
    >
      <div className="margo-post-card__lb-header">
        <h3 className="margo-post-card__lb-title">Lyric Backs · {displayCount}</h3>
        <button
          type="button"
          className="margo-post-card__lb-close"
          aria-label="Close Lyric Backs"
          onClick={onClose}
        >
          <FeedIconClose size={20} />
        </button>
      </div>

      <div className="margo-post-card__lb-compose-slot">
        <LyricBackPanelCompose
          ref={composeRef}
          key={replyTargetId}
          layout="panel"
          parentPostId={replyTargetId}
          parentEmotion={parentEmotion}
          onRequireAuth={onRequireAuth}
          prefill={composePrefill}
          replyToLabel={replyToLabel}
          onSent={() => {
            setComposePrefill(null)
            if (replyTargetId !== postId) {
              setReplyTargetId(postId)
              setReplyTargetEcho(null)
            }
            void refetchEchoes()
          }}
        />
      </div>

      <div className="margo-post-card__lb-scroll">
        <div className="margo-post-card__lb-context">
          <p className="margo-post-card__lb-context-lyric">
            {parentMoment?.text ? `“${parentMoment.text}”` : null}
          </p>
          {(parentMoment?.song || parentMoment?.artist) ? (
            <p className="margo-post-card__lb-context-track">
              {parentMoment.song}{parentMoment.artist ? ` · ${parentMoment.artist}` : ''}
            </p>
          ) : null}
          {parentUsername ? (
            <p className="margo-post-card__lb-context-user">@{parentUsername.replace(/^@/, '')}</p>
          ) : null}
        </div>

        {replyTargetId !== postId ? (
          <div className="margo-post-card__lb-focus">
            <button
              type="button"
              className="margo-post-card__lb-focus-back"
              onClick={() => {
                setReplyTargetId(postId)
                setReplyTargetEcho(null)
                setComposePrefill(null)
              }}
            >
              ← Back
            </button>
          </div>
        ) : null}

        {echoesLoading ? <LyricBackPanelSkeleton /> : null}

        {!echoesLoading && echoes.length > 0 ? (
          <ul className="margo-post-card__lb-list margo-post-card__lb-list--echoes">
            {echoes.map((echo) => (
              <li key={echo.id}>
                <LyricBackThreadRow
                  echo={echo}
                  tone="reply"
                  onLyricBack={() => focusNestedLyricBack(echo)}
                  onOpenThread={(id) => onOpenThread?.(id)}
                  onExport={onExportEcho}
                  onReplay={onReplayEcho}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="margo-post-card__lb-ideas-section">
          <button
            type="button"
            className="margo-post-card__lb-ideas-toggle"
            aria-expanded={ideasOpen}
            onClick={() => setIdeasOpen((o) => !o)}
          >
            <span>Suggestions</span>
            <span
              className="margo-post-card__lb-ideas-chevron"
              style={{ transform: ideasOpen ? 'rotate(90deg)' : 'none' }}
            >
              <FeedIconChevronRight size={16} />
            </span>
          </button>

          {ideasOpen ? (
            <div className="margo-post-card__lb-ideas-body">
              {ideasLoading ? <IdeasSkeleton /> : null}
              {ideasError && !ideasLoading ? (
                <div className="margo-post-card__lb-status-block">
                  <p className="margo-post-card__lb-status">{ideasError}</p>
                  <button
                    type="button"
                    className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
                    onClick={() => void loadIdeas()}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {!ideasLoading && !ideasError && (picks?.length ?? 0) > 0 && picks ? (
                <ul className="margo-post-card__lb-list">
                  {picks.map((s) => (
                    <li key={`${s.songId}_${s.lineIndex}_${s.startSec}`}>
                      <SuggestionRow suggestion={s} onAccept={() => applySuggestion(s)} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onAccept,
}: {
  suggestion: SuggestedLyricBack
  onAccept: () => void
}) {
  const engine = useAudioEngine()
  const canPlay = Boolean(suggestion.audioUrl)
  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === suggestion.songId
    && engine.snippet?.lineIndex === suggestion.lineIndex
  const isBuffering = isPlaying && engine.buffering

  return (
    <div className="margo-post-card__lb-row">
      <button type="button" onClick={onAccept} className="margo-post-card__lb-row-body">
        <p className="margo-post-card__lb-row-lyric">&ldquo;{suggestion.text}&rdquo;</p>
        <p className="margo-post-card__lb-row-meta">
          <span className="margo-post-card__lb-echo-song">{suggestion.songTitle}</span>
          <span className="margo-post-card__lb-echo-artist">{suggestion.artistName}</span>
        </p>
      </button>
      {canPlay ? (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause suggestion' : 'Play suggestion'}
          className="margo-post-card__lb-row-play"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) {
              togglePlayPause()
              return
            }
            if (!suggestion.audioUrl) return
            void playSnippet({
              songId: suggestion.songId,
              audioUrl: suggestion.audioUrl,
              title: suggestion.songTitle,
              artist: suggestion.artistName,
              artwork: suggestion.artworkUrl ?? null,
              lineIndex: suggestion.lineIndex,
              lineText: suggestion.text,
              startSec: suggestion.startSec,
              endSec: suggestion.endSec,
              vibe: suggestion.vibe,
              source: 'feed',
            })
          }}
        >
          <span className="margo-post-card__lb-row-play-inner">
            <FeedMomentPlaybackIcon playing={isPlaying} buffering={isBuffering} size={16} color="var(--post-vibe-fill)" />
          </span>
        </button>
      ) : null}
    </div>
  )
}
