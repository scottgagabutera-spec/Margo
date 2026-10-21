'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT, LYRIC_FONT, FEED_TYPE } from '@/lib/fonts'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  postId: string
  open: boolean
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
}

/**
 * Inline Lyric Back suggestions panel (no standalone trigger row).
 * Loads when `open` becomes true.
 */
export function PostCardSuggestedReply({
  postId,
  open,
  onAcceptSuggested,
  onOpenSuggestedSearch,
}: PostCardSuggestedReplyProps) {
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

  if (!open) return null

  const showEmpty = fetched && !loading && !error && (picks?.length ?? 0) === 0
  const showPicks = !loading && !error && (picks?.length ?? 0) > 0

  const linkBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '8px 0',
    margin: 0,
    cursor: 'pointer',
    fontFamily: UI_FONT,
    fontSize: `var(${FEED_TYPE.actionLabel})`,
    fontWeight: 600,
    color: 'var(--post-vibe-text)',
    minHeight: 'var(--margo-touch-min)',
    display: 'inline-flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  }

  return (
    <div data-no-card-nav className="margo-post-card__suggestions">
      {loading && (
        <p className="margo-post-card__suggestions-status">Finding lines that answer this…</p>
      )}

      {error && (
        <div className="margo-post-card__suggestions-error">
          <p className="margo-post-card__suggestions-status">{error}</p>
          <button type="button" onClick={() => void loadSuggestions()} style={linkBtnStyle}>
            Retry
          </button>
        </div>
      )}

      {showEmpty && (
        <p className="margo-post-card__suggestions-status">
          No strong Lyric Back match in Margo&apos;s music right now.
        </p>
      )}

      {showPicks && picks && (
        <div className="margo-post-card__suggestions-list">
          {picks.map((s) => (
            <SuggestionRow
              key={`${s.songId}_${s.lineIndex}_${s.startSec}`}
              suggestion={s}
              onAccept={() => onAcceptSuggested?.(s)}
            />
          ))}
        </div>
      )}

      {onOpenSuggestedSearch && !loading && (
        <button type="button" onClick={onOpenSuggestedSearch} style={linkBtnStyle}>
          Search the catalog
        </button>
      )}
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
    <div className="margo-post-card__suggestion-row">
      <button type="button" onClick={onAccept} className="margo-post-card__suggestion-body">
        <p className="margo-post-card__suggestion-lyric">&ldquo;{suggestion.text}&rdquo;</p>
        <p className="margo-post-card__suggestion-meta">
          {suggestion.songTitle} · {suggestion.artistName}
        </p>
      </button>

      {canPlay && (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause suggestion' : 'Play suggestion'}
          className="margo-post-card__suggestion-play"
          onClick={() => {
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
          <PlayPauseIcon playing={isPlaying} buffering={isBuffering} size={18} color="var(--post-vibe-fill)" />
        </button>
      )}
    </div>
  )
}
