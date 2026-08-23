'use client'
import { useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { playSnippet, warmUrl } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { UI_FONT } from '@/lib/fonts'

export interface ComposeLyricLine {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
}

const lyricFont = 'var(--font-lora), serif'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface ComposeLinePickerProps {
  lines: ComposeLyricLine[]
  loading: boolean
  songTitle: string
  artistName: string
  onPick: (line: ComposeLyricLine) => void
  onSkip?: () => void
  onBack: () => void
  /** When true, parent renders Skip in KeyboardSafeCtaBar — hide inline Skip. */
  stickySkip?: boolean
  /** Catalog audio. When omitted, rows stay text-only (Lyric Back / no file). */
  audioUrl?: string | null
  songId?: string | null
  artwork?: string | null
  /** Stage landing — quieter chrome, smaller title. */
  variant?: 'compose' | 'stage'
}

function ComposeLineRow({
  line,
  songTitle,
  artistName,
  audioUrl,
  songId,
  artwork,
  onPick,
  stage = false,
  isLast = false,
}: {
  line: ComposeLyricLine
  songTitle: string
  artistName: string
  audioUrl: string
  songId: string | null
  artwork: string | null
  onPick: (line: ComposeLyricLine) => void
  stage?: boolean
  isLast?: boolean
}) {
  const { playing, buffering } = useSnippetPlaybackUi(songId || audioUrl, line.lineIndex)

  const handlePick = () => {
    void playSnippet({
      songId: songId || audioUrl,
      audioUrl,
      title: songTitle,
      artist: artistName,
      artwork,
      lineIndex: line.lineIndex,
      lineText: line.text,
      startSec: line.startSec,
      endSec: line.endSec,
      source: 'feed',
    })
    onPick(line)
  }

  const playSize = stage ? 28 : 44
  const playIconSize = 14

  return (
    <button
      type="button"
      onClick={handlePick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: stage ? '12px' : '14px',
        padding: stage ? '12px 14px' : '14px 16px',
        minHeight: 'var(--margo-touch-min)',
        background: playing ? 'var(--gold-faint)' : 'none',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: `${playSize}px`,
          height: `${playSize}px`,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: playing ? 'var(--gold-glow)' : 'var(--gold-faint)',
          border: '1px solid var(--gold-border)',
          boxSizing: 'border-box',
          marginTop: stage ? '2px' : 0,
        }}
      >
        <PlayPauseIcon playing={playing} buffering={buffering} size={playIconSize} color="var(--gold)" />
      </span>
      {!stage ? (
        <span
          style={{
            fontFamily: lyricFont,
            fontSize: '0.6rem',
            color: 'var(--gold)',
            letterSpacing: '0.5px',
            flexShrink: 0,
            paddingTop: '4px',
            minWidth: '36px',
          }}
        >
          {formatTime(line.startSec)}
        </span>
      ) : null}
      <span
        style={{
          fontFamily: lyricFont,
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--text)',
          lineHeight: 1.45,
          paddingTop: stage ? '4px' : '2px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {line.text}
      </span>
      {stage ? (
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            flexShrink: 0,
            paddingTop: '6px',
          }}
        >
          {formatTime(line.startSec)}
        </span>
      ) : null}
    </button>
  )
}

/**
 * Tap-to-pick a real lyric_lines row for a Margo catalog song.
 */
export function ComposeLinePicker({
  lines,
  loading,
  songTitle,
  artistName,
  onPick,
  onSkip,
  onBack,
  stickySkip = false,
  audioUrl = null,
  songId = null,
  artwork = null,
  variant = 'compose',
}: ComposeLinePickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const canHear = !!audioUrl
  const isStage = variant === 'stage'

  useEffect(() => {
    if (!audioUrl || loading || lines.length === 0) return
    warmUrl(audioUrl)
  }, [audioUrl, loading, lines.length])

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: isStage ? UI_FONT : lyricFont,
          fontSize: '0.82rem',
          color: 'var(--text-secondary)', letterSpacing: '0.3px',
          marginBottom: isStage ? '20px' : '32px',
          padding: '0 4px', minHeight: 'var(--margo-touch-min)',
          display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box',
        }}
      ><ArrowLeftIcon size={16} color="currentColor" /> Back</button>

      <div style={{ textAlign: isStage ? 'left' : 'center', marginBottom: isStage ? '20px' : '28px' }}>
        <h1 style={{
          fontFamily: lyricFont,
          fontStyle: 'italic',
          fontSize: isStage ? 'clamp(1.5rem, 4vw, 1.75rem)' : '2rem',
          color: isStage ? 'var(--text)' : 'var(--gold)',
          marginBottom: '6px',
          fontWeight: 400,
          lineHeight: 1.15,
        }}>
          {isStage ? 'Choose a line' : 'Pick the line'}
        </h1>
        <p style={{
          fontFamily: isStage ? UI_FONT : lyricFont,
          fontSize: isStage ? '0.78rem' : '0.82rem',
          color: 'var(--text-secondary)',
          marginBottom: isStage ? 0 : '4px',
        }}>
          {canHear
            ? (isStage ? 'Tap to preview' : 'Tap a line to hear it')
            : (isStage ? 'Tap the line you mean' : 'Pick the line you want')}
        </p>
        {!isStage ? (
          <p style={{ fontFamily: lyricFont, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {artistName} · {songTitle}
          </p>
        ) : null}
      </div>

      {loading && (
        <p style={{ textAlign: isStage ? 'left' : 'center', fontFamily: isStage ? UI_FONT : lyricFont, color: 'var(--gold)', fontSize: '0.82rem' }}>
          Loading lyrics…
        </p>
      )}

      {!loading && lines.length === 0 && (
        <div style={{ textAlign: isStage ? 'left' : 'center' }}>
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: stickySkip ? 0 : '20px' }}>
            No synced lyrics for this song yet.
          </p>
          {onSkip && !stickySkip && (
            <button
              type="button"
              onClick={onSkip}
              style={{
                minHeight: 'var(--margo-touch-min)', padding: '0 24px',
                display: 'inline-flex', alignItems: 'center',
                background: 'var(--gold)', color: 'var(--text-on-gold, var(--bg))', borderRadius: '50px',
                fontFamily: lyricFont, fontWeight: 700, fontSize: '0.6rem',
                letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              }}
            >Continue without hearing it</button>
          )}
        </div>
      )}

      {!loading && lines.length > 0 && (
        <div
          ref={listRef}
          style={{
            maxHeight: 'min(52dvh, calc(var(--margo-vv-height, 100dvh) * 0.48), 420px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            border: '1px solid var(--border)',
            borderRadius: isStage ? '14px' : '16px',
            background: isStage ? 'var(--surface-elevated)' : 'var(--surface)',
          }}
        >
          {lines.map((line, index) => (
            canHear ? (
              <ComposeLineRow
                key={line.lineIndex}
                line={line}
                songTitle={songTitle}
                artistName={artistName}
                audioUrl={audioUrl!}
                songId={songId}
                artwork={artwork}
                onPick={onPick}
                stage={isStage}
                isLast={index === lines.length - 1}
              />
            ) : (
              <button
                key={line.lineIndex}
                type="button"
                onClick={() => onPick(line)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: isStage ? '12px 14px' : '14px 16px',
                  minHeight: 'var(--margo-touch-min)',
                  background: 'none',
                  border: 'none',
                  borderBottom: index < lines.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontFamily: isStage ? UI_FONT : lyricFont,
                    fontSize: '0.65rem',
                    color: isStage ? 'var(--text-muted)' : 'var(--gold)',
                    letterSpacing: '0.3px',
                    flexShrink: 0,
                    paddingTop: '4px',
                    minWidth: '36px',
                  }}
                >
                  {formatTime(line.startSec)}
                </span>
                <span
                  style={{
                    fontFamily: lyricFont,
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    color: 'var(--text)',
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {line.text}
                </span>
              </button>
            )
          ))}
        </div>
      )}
    </div>
  )
}
