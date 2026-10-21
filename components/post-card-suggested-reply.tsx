'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { FeedMomentPlaybackIcon } from '@/components/feed-card-icons'
import { UI_FONT } from '@/lib/fonts'
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

/**
 * Inline Lyric Back suggestions panel (no standalone trigger row).
 * Loads when `open` becomes true.
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

  const loadSuggestions = useCallback(async () => {
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
    >
      <div className="margo-post-card__lb-header">
        <h3 className="margo-post-card__lb-title">Lyric Back</h3>
        <button
          type="button"
          className="margo-post-card__lb-close"
          aria-label="Close Lyric Back suggestions"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {loading && (
        <p className="margo-post-card__lb-status">Finding lines that answer this…</p>
      )}

      {error && (
        <div className="margo-post-card__lb-status-block">
          <p className="margo-post-card__lb-status">{error}</p>
          <button type="button" className="margo-post-card__lb-footer-btn" onClick={() => void loadSuggestions()}>
            Retry
          </button>
        </div>
      )}

      {showEmpty && (
        <p className="margo-post-card__lb-status">
          No strong Lyric Back match in Margo&apos;s music right now.
        </p>
      )}

      {showPicks && picks && (
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
      )}

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
