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
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { playSnippet, stop, subscribeAudioEngine } from '@/lib/audio-engine'
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
  slideIndex,
  slideCount,
  onAdvance,
}: {
  moment: MargoMoment
  active: boolean
  slideIndex: number
  slideCount: number
  onAdvance: () => void
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
  const advancedRef = useRef(false)
  const onAdvanceRef = useRef(onAdvance)
  onAdvanceRef.current = onAdvance

  const clearAdvance = useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  const finishSlide = useCallback(() => {
    if (advancedRef.current) return
    advancedRef.current = true
    clearAdvance()
    onAdvanceRef.current()
  }, [clearAdvance])

  const scheduleAdvance = useCallback((delayMs: number) => {
    clearAdvance()
    advanceTimerRef.current = window.setTimeout(finishSlide, delayMs)
  }, [clearAdvance, finishSlide])

  const startPreviewPlayback = useCallback(() => {
    advancedRef.current = false
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
      lineIndex: 0,
      lineText: line.lyric,
      startSec: line.snippetStart,
      endSec: line.snippetEnd,
      atmosphere: livingAtmosphereOrNull(
        atmosphereId !== 'still' ? atmosphereId : songAtmosphere,
      ),
      source: 'feed',
    }).catch(() => {
      /* Autoplay may be blocked — timer still advances the slide. */
    })
  }, [canPlay, line, playbackKey, atmosphereId, songAtmosphere, scheduleAdvance])

  const slideIdentity = `${moment.postId ?? ''}|${line?.lyric ?? ''}|${line?.snippetStart ?? ''}|${line?.snippetEnd ?? ''}`

  useEffect(() => {
    if (!active) {
      clearAdvance()
      return
    }
    startPreviewPlayback()
    return () => {
      clearAdvance()
    }
  }, [active, slideIdentity, startPreviewPlayback, clearAdvance])

  useEffect(() => {
    if (!active || !canPlay) return
    return subscribeAudioEngine((state) => {
      if (advancedRef.current) return
      if (state.mode !== 'snippet' || !state.snippet) return
      if (state.currentTime >= state.snippet.endSec - 0.08) {
        finishSlide()
      }
    })
  }, [active, canPlay, finishSlide])

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
      minHeight: 0,
      position: 'relative',
      zIndex: 1,
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 'min(100%, 320px, calc((100dvh - 180px) * 9 / 16))',
        maxHeight: 'calc(100dvh - 180px)',
        pointerEvents: 'auto',
      }}>
        <MomentExportPreviewFrame shapeId="vertical">
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
            onPlay={startPreviewPlayback}
            brandWatermark
          />
        </MomentExportPreviewFrame>
      </div>
      <span style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: font,
        fontSize: '0.55rem',
        letterSpacing: '0.4px',
        color: 'var(--text-muted)',
        pointerEvents: 'none',
      }}>
        {slideIndex + 1} / {slideCount}
      </span>
    </div>
  )
}

function formatStoryHeader(author: MargoMoment['author']): { primary: string; secondary: string | null } {
  if (!author) return { primary: 'Story', secondary: null }
  const username = author.username?.replace(/^@/, '') || null
  const displayName = author.displayName?.trim() || null
  if (displayName && username) {
    return { primary: displayName, secondary: `@${username}` }
  }
  if (username) return { primary: `@${username}`, secondary: null }
  if (displayName) return { primary: displayName, secondary: null }
  return { primary: 'Story', secondary: null }
}

export function StoryViewer({ authorProfileId, onClose }: StoryViewerProps) {
  const { slides, loading, error } = useAuthorStories(authorProfileId, true)
  const [index, setIndex] = useState(0)
  const seenMarkedRef = useRef<Set<string>>(new Set())
  const mounted = typeof document !== 'undefined'

  const slidesRef = useRef(slides)
  const indexRef = useRef(index)
  slidesRef.current = slides
  indexRef.current = index

  const current = slides[index] ?? null
  const storyAuthor = current?.moment.author ?? null
  const header = formatStoryHeader(storyAuthor)
  const authorInitial = (storyAuthor?.displayName || storyAuthor?.username || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!current) return
    if (seenMarkedRef.current.has(current.story.id)) return
    seenMarkedRef.current.add(current.story.id)
    void markStorySeen(current.story.id)
  }, [current])

  const advanceStory = useCallback(() => {
    stop()
    const i = indexRef.current
    const len = slidesRef.current.length
    if (len === 0 || i >= len - 1) {
      onClose()
      return
    }
    setIndex(i + 1)
  }, [onClose])

  const goPrev = useCallback(() => {
    stop()
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') advanceStory()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, advanceStory, goPrev])

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
        gap: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
          flex: 1,
        }}>
          {storyAuthor ? (
            <span style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {storyAuthor.avatarUrl ? (
                <img
                  src={storyAuthor.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{
                  fontFamily: font,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--gold)',
                }}>
                  {authorInitial}
                </span>
              )}
            </span>
          ) : null}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0,
              fontFamily: font,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.4px',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {header.primary}
            </p>
            {header.secondary ? (
              <p style={{
                margin: '2px 0 0',
                fontFamily: font,
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {header.secondary}
              </p>
            ) : null}
          </div>
        </div>
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
            flexShrink: 0,
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
            slideIndex={index}
            slideCount={slides.length}
            onAdvance={advanceStory}
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
            zIndex: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        />
        <button
          type="button"
          aria-label="Next Story"
          onClick={advanceStory}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '28%',
            zIndex: 2,
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
