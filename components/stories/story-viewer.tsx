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
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { useAuthorStories, markStorySeen } from '@/hooks/useAuthorStories'
import { UI_FONT } from '@/lib/fonts'
import type { MargoMoment } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { StoryRingAuthor, StorySlide } from '@/lib/stories/types'

const font = UI_FONT
const STORY_HOLD_MS = 4500
const STORY_MIN_MS = 3000
const STORY_FADE_MS = 320

function asStageTheme(id: string | null | undefined): StageCardThemeId {
  if (id === 'blush' || id === 'sage' || id === 'dusk' || id === 'gold') return id
  return 'gold'
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function slideHoldMs(moment: MargoMoment): number {
  const line = moment.lines[0]
  if (line?.audioUrl && line.snippetStart != null && line.snippetEnd != null) {
    return Math.max(STORY_MIN_MS, (line.snippetEnd - line.snippetStart) * 1000 + 800)
  }
  return STORY_HOLD_MS
}

function resolveStoryAuthor(
  slides: StorySlide[],
  preview: StoryRingAuthor | null,
  fallback: MargoMoment['author'],
): MargoMoment['author'] {
  if (preview) {
    return {
      profileId: preview.profileId,
      username: preview.username,
      displayName: preview.displayName,
      avatarUrl: preview.avatarUrl,
    }
  }
  for (const slide of slides) {
    if (slide.moment.author?.displayName || slide.moment.author?.username) {
      return slide.moment.author
    }
  }
  return fallback
}

interface StoryViewerProps {
  authorProfileId: string
  onClose: () => void
  authorPreview?: StoryRingAuthor | null
  initialSlides?: StorySlide[]
}

function StorySlideView({
  moment,
  active,
  onAdvance,
}: {
  moment: MargoMoment
  active: boolean
  onAdvance: () => void
}) {
  const line = moment.lines[0]
  const songId = line?.songId ?? null
  const songAtmosphere = useSongAtmosphere(songId)
  const themeId = asStageTheme(moment.themeId)
  const atmosphereId = (moment.exportAtmosphereId ?? 'still') as AtmosphereId
  const playbackKey = songId || moment.postId || 'story'
  const canPlay = !!line?.audioUrl && line.snippetStart != null && line.snippetEnd != null

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
    scheduleAdvance(slideHoldMs(moment))
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
  }, [canPlay, line, playbackKey, atmosphereId, songAtmosphere, scheduleAdvance, moment])

  const startPreviewPlaybackRef = useRef(startPreviewPlayback)
  startPreviewPlaybackRef.current = startPreviewPlayback

  const slideIdentity = `${moment.postId ?? ''}|${line?.lyric ?? ''}|${line?.snippetStart ?? ''}|${line?.snippetEnd ?? ''}`
  const startedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!active) {
      clearAdvance()
      startedForRef.current = null
      return
    }
    if (startedForRef.current === slideIdentity) return
    startedForRef.current = slideIdentity
    startPreviewPlaybackRef.current()
    return () => {
      clearAdvance()
    }
  }, [active, slideIdentity, clearAdvance])

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
  }, [clearAdvance])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 12px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      minHeight: 0,
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 'min(100%, 320px, calc((100dvh - 160px) * 9 / 16))',
        maxHeight: 'calc(100dvh - 160px)',
        pointerEvents: 'auto',
      }}>
        <MomentExportPreviewFrame shapeId="vertical" framed={false}>
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
            canPlay={false}
            brandWatermark
          />
        </MomentExportPreviewFrame>
      </div>
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

export function StoryViewer({
  authorProfileId,
  onClose,
  authorPreview = null,
  initialSlides,
}: StoryViewerProps) {
  const { slides, loading, error } = useAuthorStories(authorProfileId, true, initialSlides)
  const [index, setIndex] = useState(0)
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const seenMarkedRef = useRef<Set<string>>(new Set())
  const mounted = typeof document !== 'undefined'
  const reduceMotion = prefersReducedMotion()
  const fadeMs = reduceMotion ? 0 : STORY_FADE_MS

  const slidesRef = useRef(slides)
  const indexRef = useRef(index)
  const closingRef = useRef(false)
  slidesRef.current = slides
  indexRef.current = index

  const current = slides[index] ?? initialSlides?.[index] ?? null
  const storyAuthor = resolveStoryAuthor(slides, authorPreview, current?.moment.author ?? null)
  const header = formatStoryHeader(storyAuthor)
  const authorInitial = (storyAuthor?.displayName || storyAuthor?.username || '?').trim().charAt(0).toUpperCase()
  const holdMs = current ? slideHoldMs(current.moment) : STORY_HOLD_MS

  useEffect(() => {
    if (!current) return
    if (seenMarkedRef.current.has(current.story.id)) return
    seenMarkedRef.current.add(current.story.id)
    void markStorySeen(current.story.id)
  }, [current])

  useEffect(() => {
    if (outgoingIndex == null) return
    const t = window.setTimeout(() => setOutgoingIndex(null), fadeMs)
    return () => window.clearTimeout(t)
  }, [outgoingIndex, fadeMs])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    stop()
    if (fadeMs <= 0) {
      onClose()
      return
    }
    setClosing(true)
    window.setTimeout(onClose, fadeMs)
  }, [onClose, fadeMs])

  const goToIndex = useCallback((next: number) => {
    const from = indexRef.current
    if (next === from) return
    stop()
    if (fadeMs > 0) setOutgoingIndex(from)
    setIndex(next)
  }, [fadeMs])

  const advanceStory = useCallback(() => {
    if (closingRef.current) return
    const i = indexRef.current
    const len = slidesRef.current.length
    if (len === 0 || i >= len - 1) {
      requestClose()
      return
    }
    goToIndex(i + 1)
  }, [goToIndex, requestClose])

  const goPrev = useCallback(() => {
    if (closingRef.current) return
    const i = indexRef.current
    if (i <= 0) return
    goToIndex(i - 1)
  }, [goToIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
      if (e.key === 'ArrowRight') advanceStory()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose, advanceStory, goPrev])

  useEffect(() => {
    document.documentElement.setAttribute('data-margo-story-open', '1')
    return () => {
      document.documentElement.removeAttribute('data-margo-story-open')
      stop()
    }
  }, [])

  if (!mounted) return null

  const visibleIndexes = [index]
  if (outgoingIndex != null && outgoingIndex !== index && slides[outgoingIndex]) {
    visibleIndexes.unshift(outgoingIndex)
  }

  const shellStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 400,
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    boxSizing: 'border-box',
    opacity: closing ? 0 : 1,
    transition: fadeMs > 0 ? `opacity ${fadeMs}ms var(--ease-out)` : undefined,
  }

  return createPortal(
    <div style={shellStyle} role="dialog" aria-modal="true" aria-label="Story viewer">
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 14px 10px',
      }}>
        {slides.map((slide, i) => {
          const filled = i < index
          const active = i === index && !closing
          return (
            <div
              key={slide.story.id}
              style={{
                flex: 1,
                height: '2px',
                borderRadius: '999px',
                background: 'var(--border-hi)',
                overflow: 'hidden',
              }}
            >
              <div
                className={active ? 'margo-story-progress-active' : undefined}
                style={{
                  height: '100%',
                  width: '100%',
                  background: 'var(--gold)',
                  transformOrigin: 'left center',
                  transform: filled ? 'scaleX(1)' : 'scaleX(0)',
                  animation: active
                    ? `margo-story-progress ${holdMs}ms linear forwards`
                    : undefined,
                  opacity: filled || active ? 1 : 0,
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 8px 14px',
        gap: '8px',
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
              width: 32,
              height: 32,
              borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden',
              border: '1px solid var(--border)',
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
                  fontSize: '0.72rem',
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
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.2px',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {header.primary}
            </p>
            {header.secondary ? (
              <p style={{
                margin: '1px 0 0',
                fontFamily: font,
                fontSize: '0.62rem',
                color: 'var(--text-secondary)',
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
          onClick={requestClose}
          aria-label="Close"
          style={{
            minWidth: 'var(--margo-touch-min)',
            minHeight: 'var(--margo-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
            opacity: 0.72,
          }}
        >
          <CloseIcon size={18} color="var(--text)" />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
        {loading && slides.length === 0 && (
          <p style={{
            margin: 'auto',
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            Loading…
          </p>
        )}
        {!loading && error && slides.length === 0 && (
          <p style={{
            margin: 'auto',
            fontFamily: font,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
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
        {slides.length > 0 && visibleIndexes.map((slideIndex) => {
          const slide = slides[slideIndex]
          if (!slide) return null
          const isActive = slideIndex === index
          return (
            <div
              key={slide.story.id}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                zIndex: isActive ? 1 : 0,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0.985)',
                transition: fadeMs > 0
                  ? `opacity ${fadeMs}ms var(--ease-out), transform ${fadeMs}ms var(--ease-out)`
                  : undefined,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <StorySlideView
                moment={slide.moment}
                active={isActive && !closing}
                onAdvance={advanceStory}
              />
            </div>
          )
        })}

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

      <style>{`
        @keyframes margo-story-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .margo-story-progress-active {
            animation: none !important;
            transform: scaleX(1) !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
