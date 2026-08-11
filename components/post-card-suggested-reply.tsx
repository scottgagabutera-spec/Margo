'use client'

import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'

export type { SuggestedLyricBack }

export type PostCardSuggestedReplyProps = {
  suggestions?: SuggestedLyricBack[] | null
  loading?: boolean
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
}

/**
 * Suggested Lyric Back — catalog picks from Margo's music (not AI copy).
 * Renders nothing when empty (and not loading).
 */
export function PostCardSuggestedReply({
  suggestions,
  loading = false,
  onAcceptSuggested,
  onOpenSuggestedSearch,
}: PostCardSuggestedReplyProps) {
  const picks = suggestions?.slice(0, 3) ?? []
  if (!loading && picks.length === 0) return null

  return (
    <div
      data-no-card-nav
      style={{
        marginBottom: 16,
        padding: '14px 14px 12px',
        borderRadius: 14,
        border: '1px solid rgba(232,197,71,0.18)',
        background: 'rgba(232,197,71,0.04)',
      }}
    >
      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          margin: '0 0 10px',
        }}
      >
        From Margo&apos;s music
      </p>

      {loading && picks.length === 0 && (
        <p
          style={{
            fontFamily: LYRIC_FONT,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          Finding a line that answers this…
        </p>
      )}

      {picks.length > 0 && (
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

      {onOpenSuggestedSearch && (
        <button
          type="button"
          onClick={onOpenSuggestedSearch}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: UI_FONT,
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            minHeight: 'var(--margo-touch-min)',
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
          <PlayPauseIcon playing={isPlaying} size={15} color="var(--gold)" />
        </button>
      )}
    </div>
  )
}
