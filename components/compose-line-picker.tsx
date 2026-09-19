'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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
const LONG_PRESS_MS = 400
const LONG_PRESS_MOVE_PX = 12
const DEFAULT_PARAGRAPH_MAX = 3
const SELECTED_FILL = 'color-mix(in srgb, var(--gold) 22%, transparent)'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function sortedSelection(selected: number[]): number[] {
  return [...selected].sort((a, b) => a - b)
}

function isContiguous(selected: number[]): boolean {
  const s = sortedSelection(selected)
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1] + 1) return false
  }
  return true
}

function canToggleLine(selected: number[], lineIndex: number): boolean {
  if (selected.length === 0) return true
  if (selected.includes(lineIndex)) {
    const s = sortedSelection(selected)
    return lineIndex === s[0] || lineIndex === s[s.length - 1]
  }
  const s = sortedSelection(selected)
  const min = s[0]
  const max = s[s.length - 1]
  return lineIndex === min - 1 || lineIndex === max + 1
}

interface ComposeLinePickerProps {
  lines: ComposeLyricLine[]
  loading: boolean
  songTitle: string
  artistName: string
  onPick: (line: ComposeLyricLine) => void
  /** Combine adjacent lines into one paragraph Moment (long-press to start). */
  onPickParagraph?: (lines: ComposeLyricLine[]) => void
  enableParagraphPick?: boolean
  maxParagraphLines?: number
  onSkip?: () => void
  onBack: () => void
  stickySkip?: boolean
  audioUrl?: string | null
  songId?: string | null
  artwork?: string | null
  variant?: 'compose' | 'stage'
  hideHeader?: boolean
}

function ComposeLineRow({
  line,
  songTitle,
  artistName,
  audioUrl,
  songId,
  artwork,
  onPick,
  onLongPressStart,
  onSelectionTap,
  selectionMode,
  selected,
  selectionDisabled,
  stage = false,
  isLast = false,
}: {
  line: ComposeLyricLine
  songTitle: string
  artistName: string
  audioUrl: string | null
  songId: string | null
  artwork: string | null
  onPick: (line: ComposeLyricLine) => void
  onLongPressStart: (line: ComposeLyricLine) => void
  onSelectionTap: (line: ComposeLyricLine) => void
  selectionMode: boolean
  selected: boolean
  selectionDisabled: boolean
  stage?: boolean
  isLast?: boolean
}) {
  const { playing, buffering } = useSnippetPlaybackUi(songId || audioUrl || '', line.lineIndex)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressOrigin.current = null
  }

  const handlePick = () => {
    if (selectionMode) {
      onSelectionTap(line)
      return
    }
    if (audioUrl) {
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
    }
    onPick(line)
  }

  const playSize = stage ? 28 : 44
  const playIconSize = 14

  return (
    <button
      type="button"
      onClick={() => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false
          return
        }
        handlePick()
      }}
      onPointerDown={(event) => {
        longPressTriggered.current = false
        clearPressTimer()
        if (selectionMode) return
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* capture is best-effort */
        }
        pressOrigin.current = { x: event.clientX, y: event.clientY }
        pressTimer.current = setTimeout(() => {
          longPressTriggered.current = true
          pressTimer.current = null
          onLongPressStart(line)
        }, LONG_PRESS_MS)
      }}
      onPointerMove={(event) => {
        if (!pressOrigin.current || !pressTimer.current) return
        const dx = event.clientX - pressOrigin.current.x
        const dy = event.clientY - pressOrigin.current.y
        if ((dx * dx + dy * dy) > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
          clearPressTimer()
        }
      }}
      onPointerUp={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(event) => {
        event.preventDefault()
      }}
      aria-pressed={selectionMode ? selected : undefined}
      aria-disabled={selectionMode && selectionDisabled && !selected ? true : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: stage ? '12px' : '14px',
        padding: stage ? '12px 14px' : '14px 16px',
        minHeight: 'var(--margo-touch-min)',
        background: selected
          ? SELECTED_FILL
          : playing
            ? 'var(--gold-faint)'
            : 'none',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        boxShadow: selected ? 'inset 4px 0 0 var(--gold)' : 'none',
        cursor: selectionMode && selectionDisabled && !selected ? 'default' : 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
        opacity: selectionMode && selectionDisabled && !selected ? 0.42 : 1,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {selectionMode ? (
        <span
          aria-hidden
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '7px',
            flexShrink: 0,
            marginTop: stage ? '3px' : '1px',
            border: selected ? '2px solid var(--gold)' : '2px solid var(--text-muted)',
            background: selected ? 'var(--gold)' : 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--gold) 28%, transparent)' : 'none',
          }}
        >
          {selected ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2.4 6.2 L4.8 8.7 L9.6 3.3"
                fill="none"
                stroke="var(--text-on-gold, var(--bg))"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      ) : audioUrl ? (
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
      ) : (
        <span style={{ width: `${playSize}px`, flexShrink: 0 }} />
      )}
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
 * Long-press a line to enter multi-select and combine adjacent lines.
 */
export function ComposeLinePicker({
  lines,
  loading,
  songTitle,
  artistName,
  onPick,
  onPickParagraph,
  enableParagraphPick = true,
  maxParagraphLines = DEFAULT_PARAGRAPH_MAX,
  onSkip,
  onBack,
  stickySkip = false,
  audioUrl = null,
  songId = null,
  artwork = null,
  variant = 'compose',
  hideHeader = false,
}: ComposeLinePickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const canHear = !!audioUrl
  const isStage = variant === 'stage'
  const paragraphEnabled = enableParagraphPick && !!onPickParagraph
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
  const [limitHint, setLimitHint] = useState<string | null>(null)
  const limitHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!audioUrl || loading || lines.length === 0) return
    warmUrl(audioUrl)
  }, [audioUrl, loading, lines.length])

  const showLimitHint = useCallback((message: string) => {
    setLimitHint(message)
    if (limitHintTimer.current) clearTimeout(limitHintTimer.current)
    limitHintTimer.current = setTimeout(() => {
      setLimitHint(null)
      limitHintTimer.current = null
    }, 2400)
  }, [])

  useEffect(() => () => {
    if (limitHintTimer.current) clearTimeout(limitHintTimer.current)
  }, [])

  const resetSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIndexes([])
    setLimitHint(null)
  }, [])

  const beginSelection = useCallback((line: ComposeLyricLine) => {
    if (!paragraphEnabled) return
    setSelectionMode(true)
    setSelectedIndexes([line.lineIndex])
  }, [paragraphEnabled])

  const toggleSelection = useCallback((line: ComposeLyricLine) => {
    setSelectedIndexes((prev) => {
      if (prev.includes(line.lineIndex)) {
        const next = prev.filter((i) => i !== line.lineIndex)
        if (next.length === 0) setSelectionMode(false)
        return next
      }
      if (prev.length >= maxParagraphLines) {
        showLimitHint(`You can combine up to ${maxParagraphLines} lines`)
        return prev
      }
      if (!canToggleLine(prev, line.lineIndex)) return prev
      return [...prev, line.lineIndex]
    })
  }, [maxParagraphLines, showLimitHint])

  const confirmParagraph = useCallback(() => {
    if (!onPickParagraph || selectedIndexes.length < 2) return
    const sorted = sortedSelection(selectedIndexes)
    const picked = sorted
      .map((idx) => lines.find((l) => l.lineIndex === idx))
      .filter((l): l is ComposeLyricLine => !!l)
    if (picked.length < 2 || !isContiguous(sorted)) return
    onPickParagraph(picked)
    resetSelection()
  }, [lines, onPickParagraph, resetSelection, selectedIndexes])

  const selectionCount = selectedIndexes.length
  const canConfirmParagraph = selectionCount >= 2 && isContiguous(selectedIndexes)

  return (
    <div>
      {!hideHeader ? (
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
      ) : null}

      <div style={{ textAlign: isStage ? 'left' : 'center', marginBottom: isStage ? '20px' : '28px' }}>
        {!hideHeader ? (
        <h1 style={{
          fontFamily: lyricFont,
          fontStyle: 'italic',
          fontSize: isStage ? 'clamp(1.5rem, 4vw, 1.75rem)' : '2rem',
          color: isStage ? 'var(--text)' : 'var(--gold)',
          marginBottom: '6px',
          fontWeight: 400,
          lineHeight: 1.15,
        }}>
          {selectionMode ? 'Combine lines' : isStage ? 'Choose a line' : 'Pick the line'}
        </h1>
        ) : null}
        <p style={{
          fontFamily: isStage ? UI_FONT : lyricFont,
          fontSize: isStage ? '0.78rem' : '0.82rem',
          color: 'var(--text-secondary)',
          marginBottom: isStage ? 0 : '4px',
        }}>
          {selectionMode
            ? `Tap adjacent lines · ${selectionCount} of ${maxParagraphLines} selected`
            : canHear
              ? (paragraphEnabled
                ? (isStage ? 'Tap a line · long-press to combine' : 'Tap a line to hear it · long-press to combine')
                : (isStage ? 'Tap to preview' : 'Tap a line to hear it'))
              : (paragraphEnabled
                ? (isStage ? 'Tap a line · long-press to combine' : 'Pick the line · long-press to combine')
                : (isStage ? 'Tap the line you mean' : 'Pick the line you want'))}
        </p>
        {!isStage ? (
          <p style={{ fontFamily: lyricFont, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {artistName} · {songTitle}
          </p>
        ) : null}
      </div>

      {selectionMode ? (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={resetSelection}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmParagraph}
            disabled={!canConfirmParagraph}
            style={{
              flex: 1.4,
              minHeight: 'var(--margo-touch-min)',
              borderRadius: '50px',
              border: 'none',
              background: canConfirmParagraph ? 'var(--gold)' : 'rgba(232,197,71,0.25)',
              color: canConfirmParagraph ? 'var(--text-on-gold, var(--bg))' : 'var(--text-muted)',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: canConfirmParagraph ? 'pointer' : 'not-allowed',
            }}
          >
            Use {selectionCount} {selectionCount === 1 ? 'line' : 'lines'}
          </button>
        </div>
      ) : null}

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
        <>
        {limitHint ? (
          <div
            role="status"
            aria-live="assertive"
            style={{
              marginBottom: '10px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--gold)',
              color: 'var(--text-on-gold, var(--bg))',
              fontFamily: UI_FONT,
              fontSize: '0.78rem',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {limitHint}
          </div>
        ) : null}
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
              <ComposeLineRow
                key={line.lineIndex}
                line={line}
                songTitle={songTitle}
                artistName={artistName}
                audioUrl={audioUrl}
                songId={songId}
                artwork={artwork}
                onPick={onPick}
                onLongPressStart={beginSelection}
                onSelectionTap={toggleSelection}
                selectionMode={selectionMode}
                selected={selectedIndexes.includes(line.lineIndex)}
                selectionDisabled={!canToggleLine(selectedIndexes, line.lineIndex)}
                stage={isStage}
                isLast={index === lines.length - 1}
              />
          ))}
        </div>
        </>
      )}
    </div>
  )
}
