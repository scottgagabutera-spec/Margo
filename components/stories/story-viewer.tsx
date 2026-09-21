'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { playSnippet, stop } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { useAuthorStories, markStorySeen } from '@/hooks/useAuthorStories'
import { UI_FONT } from '@/lib/fonts'
import type { MargoMoment } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import type { AtmosphereId } from '@/lib/atmosphere'

const font = UI_FONT
const STORY_HOLD_MS = 4500
const STORY_MIN_MS = 3000

function asStageTheme(id: string | null | undefined): StageCardThemeId {
  if (id === 'blush' || id === 'sage' || id === 'dusk' || id === 'gold') return id
  return 'gold'
}

interface StoryViewerProps {
  authorProfileId: string
  onClose: () => void
}

function StorySlideView({
  moment,
  active,
  onEnded,
}: {
  moment: MargoMoment
  active: boolean
  onEnded: () => void
}) {
  const line = moment.lines[0]
  const songId = line?.songId ?? null
  const songAtmosphere = useSongAtmosphere(songId)
  const themeId = asStageTheme(moment.themeId)
  const atmosphereId = (moment.exportAtmosphereId ?? 'still') as AtmosphereId
  const playbackKey = songId || moment.postId || 'story'
  const canPlay = !!line?.audioUrl && line.snippetStart != null && line.snippetEnd != null
  const { playing, buffering } = useSnippetPlaybackUi(
    active && canPlay ? playbackKey : null,
    active && canPlay ? line?.lyric ?? null : null,
  )

  const advanceTimerRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const clearAdvance = useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  const scheduleAdvance = useCallback((delayMs: number) => {
    clearAdvance()
    advanceTimerRef.current = window.setTimeout(onEnded, delayMs)
  }, [clearAdvance, onEnded])

  const startPlayback = useCallback(() => {
    if (!canPlay || !line?.audioUrl || line.snippetStart == null || line.snippetEnd == null) {
      scheduleAdvance(STORY_HOLD_MS)
      return
    }
    const durationMs = Math.max(
      STORY_MIN_MS,
      (line.snippetEnd - line.snippetStart) * 1000 + 800,
    )
    scheduleAdvance(durationMs)
    void playSnippet({
      songId: playbackKey,
      audioUrl: line.audioUrl,
      title: line.songTitle || '',
      artist: line.artistName || '',
      artwork: line.artworkUrl,
      lineIndex: line.snippetStart,
      lineText: line.lyric,
      startSec: line.snippetStart,
      endSec: line.snippetEnd,
      atmosphere: livingAtmosphereOrNull(
        atmosphereId !== 'still' ? atmosphereId : songAtmosphere,
      ),
      source: 'feed',
    })
  }, [canPlay, line, playbackKey, atmosphereId, songAtmosphere, scheduleAdvance])

  useEffect(() => {
    if (!active) {
      startedRef.current = false
      clearAdvance()
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    startPlayback()
    return () => {
      clearAdvance()
    }
  }, [active, startPlayback, clearAdvance])

  useEffect(() => () => {
    clearAdvance()
    if (active) stop()
  }, [active, clearAdvance])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 12px',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <StageMomentCard
          lyric={line?.lyric || ''}
          songTitle={line?.songTitle || ''}
          artistName={line?.artistName || ''}
          artwork={line?.artworkUrl}
          vibeLabel={moment.vibeLabel}
          cardThemeId={themeId}
          atmosphereId={atmosphereId}
          shapeId="vertical"
          hideVibeChrome
          effectOwnsFill
          canPlay={canPlay}
          playing={playing}
          buffering={buffering}
          onPlay={startPlayback}
        />
      </div>
    </div>
  )
}

export function StoryViewer({ authorProfileId, onClose }: StoryViewerProps) {
  const { slides, loading, error } = useAuthorStories(authorProfileId, true)
  const [index, setIndex] = useState(0)
  const seenMarkedRef = useRef<Set<string>>(new Set())
  const mounted = typeof document !== 'undefined'

  const current = slides[index] ?? null
  const authorLabel = current?.moment.author?.displayName
    || current?.moment.author?.username
    || 'Story'

  useEffect(() => {
    if (!current) return
    if (seenMarkedRef.current.has(current.story.id)) return
    seenMarkedRef.current.add(current.story.id)
    void markStorySeen(current.story.id)
  }, [current])

  const goNext = useCallback(() => {
    stop()
    if (index >= slides.length - 1) {
      onClose()
      return
    }
    setIndex((i) => i + 1)
  }, [index, slides.length, onClose])

  const goPrev = useCallback(() => {
    stop()
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev])

  useEffect(() => {
    document.documentElement.setAttribute('data-margo-story-open', '1')
    return () => {
      document.documentElement.removeAttribute('data-margo-story-open')
      stop()
    }
  }, [])

  const progressSegments = useMemo(
    () => slides.map((_, i) => ({
      filled: i < index,
      active: i === index,
    })),
    [slides, index],
  )

  if (!mounted) return null

  const shellStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 400,
    background: '#07060A',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    boxSizing: 'border-box',
  }

  return createPortal(
    <div style={shellStyle} role="dialog" aria-modal="true" aria-label="Story viewer">
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 14px 12px',
      }}>
        {progressSegments.map((seg, i) => (
          <div
            key={slides[i]?.story.id ?? i}
            style={{
              flex: 1,
              height: '2px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.18)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              height: '100%',
              width: seg.filled ? '100%' : seg.active ? '100%' : '0%',
              background: 'var(--gold)',
              opacity: seg.active ? 1 : seg.filled ? 0.85 : 0,
              transition: seg.active ? 'width 0.2s linear' : undefined,
            }} />
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px 8px',
      }}>
        <span style={{
          fontFamily: font,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.4px',
          color: 'var(--text-primary)',
        }}>
          {authorLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Stories"
          style={{
            minWidth: 'var(--margo-touch-min)',
            minHeight: 'var(--margo-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <CloseIcon size={14} color="var(--text-primary)" />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
        {loading && (
          <p style={{
            margin: 'auto',
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            Loading…
          </p>
        )}
        {!loading && error && (
          <p style={{
            margin: 'auto',
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--danger, #e55)',
            padding: '0 24px',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}
        {!loading && !error && slides.length === 0 && (
          <p style={{
            margin: 'auto',
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            This Story has expired.
          </p>
        )}
        {!loading && current && (
          <StorySlideView
            key={current.story.id}
            moment={current.moment}
            active
            onEnded={goNext}
          />
        )}

        <button
          type="button"
          aria-label="Previous Story"
          onClick={goPrev}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '28%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        />
        <button
          type="button"
          aria-label="Next Story"
          onClick={goNext}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '28%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        />
      </div>

      <p style={{
        fontFamily: font,
        fontSize: '0.62rem',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '8px 16px 0',
        margin: 0,
      }}>
        Native playback · disappears in 24h
      </p>
    </div>,
    document.body,
  )
}
