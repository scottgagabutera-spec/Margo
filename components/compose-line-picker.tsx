'use client'
import { useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { playSnippet, warmUrl } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'

export interface ComposeLyricLine {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
}

const font = 'var(--font-lora), serif'

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
}

function ComposeLineRow({
  line,
  songTitle,
  artistName,
  audioUrl,
  songId,
  artwork,
  onPick,
}: {
  line: ComposeLyricLine
  songTitle: string
  artistName: string
  audioUrl: string
  songId: string | null
  artwork: string | null
  onPick: (line: ComposeLyricLine) => void
}) {
  const { playing, buffering } = useSnippetPlaybackUi(songId || audioUrl, line.lineIndex)

  const handlePick = () => {
    // play() must stay inside this tap for iOS. Call before onPick/unmount.
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

  return (
    <button
      type="button"
      onClick={handlePick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '14px 16px',
        minHeight: 'var(--margo-touch-min)',
        background: playing ? 'var(--gold-faint)' : 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: playing ? 'var(--gold-glow)' : 'var(--gold-faint)',
          border: '1px solid var(--gold-border)',
          boxSizing: 'border-box',
        }}
      >
        <PlayPauseIcon playing={playing} buffering={buffering} size={16} color="var(--gold)" />
      </span>
      <span
        style={{
          fontFamily: font,
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
      <span
        style={{
          fontFamily: font,
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: 'var(--text)',
          lineHeight: 1.45,
          paddingTop: '2px',
        }}
      >
        {line.text}
      </span>
    </button>
  )
}

/**
 * Tap-to-pick a real lyric_lines row for a Margo catalog song.
 * Timing comes straight from the row — no fuzzy match.
 * When audioUrl is passed, the same tap plays that line's snippet.
 * List height uses dvh + --margo-vv-height so iOS keyboard open remains scrollable.
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
}: ComposeLinePickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const canHear = !!audioUrl

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
          fontFamily: font, fontSize: '0.82rem',
          color: 'var(--text-secondary)', letterSpacing: '0.5px',
          marginBottom: '32px', padding: '0 12px', minHeight: 'var(--margo-touch-min)',
          display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box',
        }}
      ><ArrowLeftIcon size={16} color="currentColor" /> Back</button>

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>
          Pick the line
        </h1>
        <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {canHear ? 'Tap a line to hear it' : 'Tap the lyric that matches the moment'}
        </p>
        <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {artistName} · {songTitle}
        </p>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', fontFamily: font, color: 'var(--gold)', fontSize: '0.82rem' }}>
          Loading lyrics…
        </p>
      )}

      {!loading && lines.length === 0 && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: stickySkip ? 0 : '20px' }}>
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
                fontFamily: font, fontWeight: 700, fontSize: '0.6rem',
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
            borderRadius: '16px',
            background: 'var(--surface)',
          }}
        >
          {lines.map((line) => (
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
                  gap: '14px',
                  padding: '14px 16px',
                  minHeight: 'var(--margo-touch-min)',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontFamily: font,
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
                <span
                  style={{
                    fontFamily: font,
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    color: 'var(--text)',
                    lineHeight: 1.45,
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
