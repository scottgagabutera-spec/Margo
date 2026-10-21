'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { FeedIconClose, FeedIconChevronRight, FeedMomentPlaybackIcon } from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  postId: string
  echoCount: number
  parentUsername?: string | null
  open: boolean
  onClose: () => void
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
  onWriteOwn?: () => void
  onOpenEcho?: (echoId: string) => void
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
 * Lyric Back comment sheet: people's Lyric Backs first, catalog ideas opt-in.
 */
export function PostCardSuggestedReply({
  postId,
  echoCount,
  parentUsername,
  open,
  onClose,
  onAcceptSuggested,
  onOpenSuggestedSearch,
  onWriteOwn,
  onOpenEcho,
}: PostCardSuggestedReplyProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { echoes, loading: echoesLoading } = useEchoes(open ? postId : null)

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
    }
  }, [open, postId])

  const loadIdeas = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIdeasError('You are offline. Connect to load ideas or search the catalog.')
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

  useEffect(() => {
    if (!open || !panelRef.current) return
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panelRef.current.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [open])

  if (!open) return null

  const displayCount = Math.max(echoCount, echoes.length)
  const parentLabel = parentUsername ? `@${parentUsername.replace(/^@/, '')}` : 'this post'
  const showEchoEmpty = !echoesLoading && echoes.length === 0
  const showIdeasEmpty = ideasFetched && !ideasLoading && !ideasError && (picks?.length ?? 0) === 0

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

      {echoesLoading ? <LyricBackPanelSkeleton /> : null}

      {showEchoEmpty ? (
        <div className="margo-post-card__lb-empty margo-post-card__lb-empty--thread">
          <p className="margo-post-card__lb-empty-title">No Lyric Backs yet</p>
          <p className="margo-post-card__lb-empty-body">
            Be the first to answer with a lyric from Margo&apos;s music or your own words.
          </p>
        </div>
      ) : null}

      {!echoesLoading && echoes.length > 0 ? (
        <ul className="margo-post-card__lb-list margo-post-card__lb-list--echoes">
          {echoes.map((echo) => (
            <li key={echo.id}>
              <EchoRow
                echo={echo}
                parentLabel={parentLabel}
                onOpen={() => onOpenEcho?.(echo.id)}
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
          <span>See ideas from Margo music</span>
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
                <p className="margo-post-card__lb-status-title">Could not load ideas</p>
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
            {showIdeasEmpty ? (
              <p className="margo-post-card__lb-status">
                No close catalog match right now. Write your own or search the catalog.
              </p>
            ) : null}
            {!ideasLoading && !ideasError && (picks?.length ?? 0) > 0 && picks ? (
              <ul className="margo-post-card__lb-list">
                {picks.map((s) => (
                  <li key={`${s.songId}_${s.lineIndex}_${s.startSec}`}>
                    <SuggestionRow
                      suggestion={s}
                      onAccept={() => onAcceptSuggested?.(s)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="margo-post-card__lb-footer">
        {onWriteOwn ? (
          <button type="button" className="margo-post-card__lb-primary-btn" onClick={onWriteOwn}>
            Write your Lyric Back
          </button>
        ) : null}
        {onOpenSuggestedSearch ? (
          <button type="button" className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full" onClick={onOpenSuggestedSearch}>
            Search catalog
          </button>
        ) : null}
      </div>
    </div>
  )
}

function EchoRow({
  echo,
  parentLabel,
  onOpen,
}: {
  echo: Echo
  parentLabel: string
  onOpen: () => void
}) {
  const engine = useAudioEngine()
  const canPlay = Boolean(echo.audioUrl && echo.songId)
  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === echo.songId
    && echo.snippetStart != null
    && Math.abs((engine.snippet?.startSec ?? 0) - echo.snippetStart) < 0.5

  return (
    <div className="margo-post-card__lb-echo-row">
      <div className="margo-post-card__lb-echo-thread" aria-hidden />
      <div className="margo-post-card__lb-echo-main">
        <div className="margo-post-card__lb-echo-content">
          <p className="margo-post-card__lb-echo-label">
            Lyric Back to {parentLabel}
          </p>
          <button type="button" className="margo-post-card__lb-row-body" onClick={onOpen}>
            <p className="margo-post-card__lb-row-lyric">&ldquo;{echo.lyric}&rdquo;</p>
            {(echo.song || echo.artist) ? (
              <p className="margo-post-card__lb-row-meta">
                {echo.username ? `@${echo.username.replace(/^@/, '')} · ` : ''}
                {echo.song}{echo.artist ? ` · ${echo.artist}` : ''}
              </p>
            ) : (
              <p className="margo-post-card__lb-row-meta">
                {echo.username ? `@${echo.username.replace(/^@/, '')}` : 'Lyric Back'}
              </p>
            )}
          </button>
        </div>
        {canPlay ? (
          <button
            type="button"
            aria-label={isPlaying ? 'Pause Lyric Back' : 'Play Lyric Back'}
            className="margo-post-card__lb-row-play"
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
            <span className="margo-post-card__lb-row-play-inner">
              <FeedMomentPlaybackIcon playing={isPlaying} size={16} color="var(--post-vibe-fill)" />
            </span>
          </button>
        ) : null}
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
          {suggestion.songTitle} · {suggestion.artistName}
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
