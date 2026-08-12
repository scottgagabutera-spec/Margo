'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  postId: string
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
}

/**
 * Suggested Lyric Back — collapsed underline trigger; fetches only on tap.
 * Expands inline on the same post (no Feed auto-batch).
 */
export function PostCardSuggestedReply({
  postId,
  onAcceptSuggested,
  onOpenSuggestedSearch,
}: PostCardSuggestedReplyProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [fetched, setFetched] = useState(false)

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/suggest-lyric-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: [postId] }),
      })
      const data = await res.json().catch(() => ({})) as {
        suggestions?: Record<string, SuggestedLyricBack[]>
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || `Could not load suggestions (${res.status})`)
      }
      const list = (data.suggestions?.[postId] ?? []).slice(0, 3)
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

  const handleOpen = useCallback(() => {
    setExpanded(true)
    if (!fetched && !loading) {
      void loadSuggestions()
    }
  }, [fetched, loading, loadSuggestions])

  const handleRetry = useCallback(() => {
    void loadSuggestions()
  }, [loadSuggestions])

  const triggerStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: '0 0 12px',
    cursor: 'pointer',
    fontFamily: UI_FONT,
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    minHeight: 'var(--margo-touch-min)',
    display: 'inline-flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  }

  if (!expanded) {
    return (
      <div data-no-card-nav>
        <button type="button" onClick={handleOpen} style={triggerStyle}>
          See Lyric Back suggestions
        </button>
      </div>
    )
  }

  const showEmpty = fetched && !loading && !error && (picks?.length ?? 0) === 0
  const showPicks = !loading && !error && (picks?.length ?? 0) > 0

  return (
    <div
      data-no-card-nav
      style={{
        marginBottom: 16,
        padding: '12px 0 4px',
      }}
    >
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          margin: '0 0 10px',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        See Lyric Back suggestions
      </p>

      {loading && (
        <p
          style={{
            fontFamily: LYRIC_FONT,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            margin: '0 0 8px',
          }}
        >
          Finding a line that answers this…
        </p>
      )}

      {error && (
        <div style={{ marginBottom: 8 }}>
          <p
            style={{
              fontFamily: LYRIC_FONT,
              fontStyle: 'italic',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              margin: '0 0 8px',
            }}
          >
            {error}. Try again, or search the catalog.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              ...triggerStyle,
              margin: 0,
              color: 'var(--gold)',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {showEmpty && (
        <p
          style={{
            fontFamily: LYRIC_FONT,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            margin: '0 0 8px',
          }}
        >
          No strong Lyric Back match in Margo&apos;s music right now.
        </p>
      )}

      {showPicks && picks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <button
          type="button"
          onClick={onOpenSuggestedSearch}
          style={{
            ...triggerStyle,
            marginTop: 12,
          }}
        >
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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 10px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <button
        type="button"
        onClick={onAccept}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <p
          style={{
            fontFamily: LYRIC_FONT,
            fontStyle: 'italic',
            fontSize: '0.88rem',
            color: 'var(--text)',
            lineHeight: 1.45,
            margin: '0 0 6px',
            whiteSpace: 'pre-line',
          }}
        >
          &ldquo;{suggestion.text}&rdquo;
        </p>
        <p
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {suggestion.songTitle} · {suggestion.artistName}
        </p>
      </button>

      {canPlay && (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause suggestion' : 'Play suggestion'}
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
          style={{
            width: 'var(--margo-touch-min)',
            height: 'var(--margo-touch-min)',
            borderRadius: '50%',
            flexShrink: 0,
            background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
            border: '1px solid rgba(232,197,71,0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          <PlayPauseIcon playing={isPlaying} buffering={isBuffering} size={15} color="var(--gold)" />
        </button>
      )}
    </div>
  )
}
