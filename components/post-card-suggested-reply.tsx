'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { FeedIconClose, FeedMomentPlaybackIcon } from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  postId: string
  open: boolean
  onClose: () => void
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
  onWriteOwn?: () => void
}

function LyricBackPanelSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="margo-post-card__lb-skeleton-row">
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
        </div>
      ))}
    </div>
  )
}

/**
 * Inline Lyric Back panel (comment-style). Loads only when `open` is true.
 */
export function PostCardSuggestedReply({
  postId,
  open,
  onClose,
  onAcceptSuggested,
  onOpenSuggestedSearch,
  onWriteOwn,
}: PostCardSuggestedReplyProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    setPicks(null)
    setFetched(false)
    setError(null)
    setLoading(false)
  }, [postId])

  const loadSuggestions = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to load suggestions or search the catalog.')
      setPicks(null)
      setFetched(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchLyricBackSuggestionsForPost(postId)
      setPicks(list)
      setFetched(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load suggestions'
      setError(message)
      setPicks(null)
      setFetched(false)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (!open) return
    if (!fetched && !loading) {
      void loadSuggestions()
    }
  }, [open, fetched, loading, loadSuggestions])

  useEffect(() => {
    if (!open || !panelRef.current) return
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panelRef.current.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [open])

  if (!open) return null

  const showEmpty = fetched && !loading && !error && (picks?.length ?? 0) === 0
  const showPicks = !loading && !error && (picks?.length ?? 0) > 0

  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className="margo-post-card__lb-panel"
      role="region"
      aria-label="Lyric Back suggestions"
    >
      <div className="margo-post-card__lb-header">
        <h3 className="margo-post-card__lb-title">Lyric Back</h3>
        <button
          type="button"
          className="margo-post-card__lb-close"
          aria-label="Close Lyric Back"
          onClick={onClose}
        >
          <FeedIconClose size={20} />
        </button>
      </div>

      {loading ? <LyricBackPanelSkeleton /> : null}

      {error && !loading ? (
        <div className="margo-post-card__lb-status-block">
          <p className="margo-post-card__lb-status-title">Could not load suggestions</p>
          <p className="margo-post-card__lb-status">{error}</p>
          <button
            type="button"
            className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
            onClick={() => void loadSuggestions()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="margo-post-card__lb-empty">
          <p className="margo-post-card__lb-empty-title">No close match in the catalog</p>
          <p className="margo-post-card__lb-empty-body">
            Write your own Lyric Back or search Margo music for a line that fits.
          </p>
          {onWriteOwn ? (
            <button
              type="button"
              className="margo-post-card__lb-primary-btn"
              onClick={onWriteOwn}
            >
              Write your Lyric Back
            </button>
          ) : null}
        </div>
      ) : null}

      {showPicks && picks ? (
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

      <div className="margo-post-card__lb-footer">
        {onOpenSuggestedSearch ? (
          <button type="button" className="margo-post-card__lb-footer-btn" onClick={onOpenSuggestedSearch}>
            Search catalog
          </button>
        ) : null}
        {onWriteOwn ? (
          <button type="button" className="margo-post-card__lb-footer-btn" onClick={onWriteOwn}>
            Write your own
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
