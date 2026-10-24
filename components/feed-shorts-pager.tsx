'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { ShortsCenterPlayIcon, ShortsMuteIcon } from '@/components/feed-shorts-chrome-icons'
import {
  getAudioEngineState,
  stop,
  subscribeAudioEngine,
  warmUrls,
  setVolume,
  toggleMute,
  togglePlayPause,
} from '@/lib/audio-engine'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { isLivingAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentShort } from '@/lib/lyric-moment-playback'
import { pickShortsLook } from '@/lib/shorts-looks'
import { computeShortsFrameLayout, SHORTS_DESKTOP_MIN_WIDTH } from '@/lib/shorts-frame-layout'
import { utcDayKey } from '@/lib/shorts-shelf-rotation'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

const ANON_PLAYS_BEFORE_SIGNUP = 5
const SHORTS_UNMUTE_STORAGE_KEY = 'margo-shorts-unmuted'

function readShortsUnmutePref(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SHORTS_UNMUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistShortsUnmutePref(unmuted: boolean): void {
  try {
    window.localStorage.setItem(SHORTS_UNMUTE_STORAGE_KEY, unmuted ? '1' : '0')
  } catch {
    /* private mode */
  }
}

function findSettledSlideIndex(scroller: HTMLElement): number {
  const slides = scroller.querySelectorAll<HTMLElement>('[data-shorts-slide]')
  if (!slides.length) return 0
  const rootRect = scroller.getBoundingClientRect()
  const targetY = rootRect.top + rootRect.height * 0.45
  let bestIdx = 0
  let bestDist = Infinity
  slides.forEach((el) => {
    const r = el.getBoundingClientRect()
    const mid = r.top + r.height / 2
    const dist = Math.abs(mid - targetY)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = Number(el.dataset.shortsIndex) || 0
    }
  })
  return bestIdx
}

type SlideProps = {
  clip: LyricMoment
  index: number
  isSettled: boolean
  isPlaying: boolean
  progressPct: number
  atmosphereId: AtmosphereId
  stageThemeId: StageCardThemeId
  vibeLabel: string | null
  reduceMotion: boolean
  showCenterPlay: boolean
  showSignupOnPlay: boolean
  soundOn: boolean
  desktopLayout: boolean
  onTapVideo: () => void
  onToggleMute: () => void
  onCenterPlay: () => void
}

function FeedShortsSlide({
  clip,
  index,
  isSettled,
  isPlaying,
  progressPct,
  atmosphereId,
  stageThemeId,
  vibeLabel,
  reduceMotion,
  showCenterPlay,
  showSignupOnPlay,
  soundOn,
  desktopLayout,
  onTapVideo,
  onToggleMute,
  onCenterPlay,
}: SlideProps) {
  const effectOwnsFill = !reduceMotion && isLivingAtmosphere(atmosphereId)

  const songBlock = (
    <div className="margo-feed-shorts-slide__meta-row">
      {clip.artwork ? (
        <img src={clip.artwork} alt="" className="margo-feed-shorts-slide__meta-art" />
      ) : null}
      <div className="margo-feed-shorts-slide__meta-text">
        <Link href={`/song/${clip.songId}`} className="margo-feed-shorts-slide__song">
          {clip.songTitle}
        </Link>
        <span className="margo-feed-shorts-slide__artist">{clip.artist}</span>
      </div>
    </div>
  )

  return (
    <section
      className="margo-feed-shorts-slide"
      data-shorts-slide
      data-shorts-index={index}
      data-shorts-active={isSettled ? '1' : '0'}
      data-shorts-theme={stageThemeId}
      data-shorts-atmosphere={atmosphereId}
    >
      <div className="margo-feed-shorts-slide__frame">
        <MomentExportPreviewFrame
          shapeId="vertical"
          framed={false}
          fillParent={desktopLayout}
          style={{ height: '100%', width: '100%' }}
        >
          <StageMomentCard
            lyric={clip.line}
            songTitle={clip.songTitle}
            artistName={clip.artist}
            artwork={clip.artwork}
            vibeLabel={vibeLabel}
            cardThemeId={stageThemeId}
            atmosphereId={atmosphereId}
            effectOwnsFill={effectOwnsFill}
            shortsFeedStableLook
            shapeId="vertical"
            hideVibeChrome
            hideShortsCreditRow
            canPlay={false}
            playing={isPlaying}
            style={{ height: '100%', minHeight: '100%' }}
          />
        </MomentExportPreviewFrame>
        {isSettled ? (
          <>
            <button
              type="button"
              className="margo-feed-shorts-slide__tap-surface"
              aria-label={isPlaying ? 'Pause Short' : 'Play Short'}
              onClick={onTapVideo}
            />
            <button
              type="button"
              className="margo-feed-shorts-slide__mute"
              aria-label={soundOn ? 'Mute Short audio' : 'Unmute Short audio'}
              aria-pressed={soundOn}
              onClick={(e) => {
                e.stopPropagation()
                onToggleMute()
              }}
            >
              <ShortsMuteIcon muted={!soundOn} />
            </button>
            {showCenterPlay ? (
              <button
                type="button"
                className="margo-feed-shorts-slide__center-play"
                aria-label={showSignupOnPlay ? 'Sign up to play Shorts' : 'Play Short'}
                onClick={(e) => {
                  e.stopPropagation()
                  onCenterPlay()
                }}
              >
                {showSignupOnPlay ? (
                  <span className="margo-feed-shorts-slide__center-play-label">Sign up</span>
                ) : (
                  <ShortsCenterPlayIcon />
                )}
              </button>
            ) : null}
            <div className="margo-feed-shorts-slide__chrome-bottom">
              <div
                className="margo-feed-shorts-slide__progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressPct * 100)}
                aria-label="Short playback progress"
              >
                <div
                  className="margo-feed-shorts-slide__progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, progressPct * 100))}%` }}
                />
              </div>
              <div className="margo-feed-shorts-slide__meta">{songBlock}</div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

type Props = {
  clips: LyricMoment[]
  loading: boolean
  meetsMinimum: boolean
  signedIn: boolean
  onRequireSignIn: () => boolean
  vibeFilterActive?: boolean
  tabActive: boolean
}

export function FeedShortsPager({
  clips,
  loading,
  meetsMinimum,
  signedIn,
  onRequireSignIn,
  vibeFilterActive = false,
  tabActive,
}: Props) {
  const withVibeClass = vibeFilterActive ? ' margo-feed-shorts-pager--with-vibe' : ''
  const emptyWithVibe = vibeFilterActive ? ' margo-feed-shorts-empty--with-vibe' : ''
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [settledIndex, setSettledIndex] = useState(0)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const isScrollingRef = useRef(false)
  const settledIndexRef = useRef(0)
  const tabActiveRef = useRef(tabActive)
  const loopClipRef = useRef<LyricMoment | null>(null)
  const userPausedRef = useRef(false)
  const [soundOn, setSoundOn] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [anonPlaysCompleted, setAnonPlaysCompleted] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [desktopLayout, setDesktopLayout] = useState(false)
  const anonPlayedKeysRef = useRef(new Set<string>())
  const signedInRef = useRef(signedIn)
  const lastAutoIndexRef = useRef<number>(-1)
  const utcDay = utcDayKey(new Date())

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SHORTS_DESKTOP_MIN_WIDTH}px)`)
    const sync = () => setDesktopLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const syncFrameMetrics = () => {
      if (window.innerWidth < SHORTS_DESKTOP_MIN_WIDTH) {
        root.style.removeProperty('--margo-shorts-frame-w')
        root.style.removeProperty('--margo-shorts-frame-h')
        root.style.removeProperty('--margo-shorts-slide-min-h')
        delete root.dataset.shortsCols
        return
      }
      const styles = getComputedStyle(document.documentElement)
      const nav = parseFloat(styles.getPropertyValue('--nav-height')) || 72
      const tabBar = parseFloat(styles.getPropertyValue('--margo-feed-tab-bar-h')) || 44
      const vibeBar = vibeFilterActive
        ? parseFloat(styles.getPropertyValue('--margo-feed-vibe-bar-h')) || 0
        : 0
      const bottom = parseFloat(styles.getPropertyValue('--margo-page-padding-bottom')) || 88
      const layout = computeShortsFrameLayout(
        window.innerWidth,
        window.innerHeight,
        nav + tabBar + vibeBar,
        bottom,
      )
      root.style.setProperty('--margo-shorts-frame-w', `${layout.frameWidthPx}px`)
      root.style.setProperty('--margo-shorts-frame-h', `${layout.frameHeightPx}px`)
      root.style.setProperty('--margo-shorts-slide-min-h', `${layout.slideStridePx}px`)
      root.dataset.shortsCols = String(layout.columns)
    }
    syncFrameMetrics()
    window.addEventListener('resize', syncFrameMetrics)
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(syncFrameMetrics)
      ro.observe(root)
    }
    return () => {
      window.removeEventListener('resize', syncFrameMetrics)
      ro?.disconnect()
    }
  }, [vibeFilterActive])

  useEffect(() => {
    setSoundOn(readShortsUnmutePref())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    signedInRef.current = signedIn
    if (signedIn) {
      anonPlayedKeysRef.current = new Set()
      setAnonPlaysCompleted(0)
    }
  }, [signedIn])

  useEffect(() => {
    tabActiveRef.current = tabActive
    if (!tabActive) {
      stop()
      setPlayingKey(null)
      lastAutoIndexRef.current = -1
      isScrollingRef.current = false
    } else {
      const root = scrollerRef.current
      if (root) {
        root.scrollTop = 0
        const idx = findSettledSlideIndex(root)
        settledIndexRef.current = idx
        setSettledIndex(idx)
        lastAutoIndexRef.current = -1
      }
    }
  }, [tabActive])

  const applyShortsVolume = useCallback((wantSound: boolean) => {
    const state = getAudioEngineState()
    if (wantSound) {
      if (state.muted) toggleMute()
      if (state.volume === 0) setVolume(1)
    } else if (!state.muted || state.volume > 0) {
      setVolume(0)
    }
  }, [])

  const playClip = useCallback(
    (moment: LyricMoment, fromUserGesture: boolean) => {
      if (!moment.audioUrl) return
      if (fromUserGesture) setAutoplayBlocked(false)
      loopClipRef.current = moment
      applyShortsVolume(soundOn)
      playLyricMomentShort(moment)
    },
    [applyShortsVolume, soundOn],
  )

  useEffect(() => {
    settledIndexRef.current = settledIndex
  }, [settledIndex])

  useEffect(() => {
    return subscribeAudioEngine((state) => {
      if (state.error?.includes('Play blocked')) {
        setAutoplayBlocked(true)
      }
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
        if (
          state.mode === 'snippet'
          && !state.playing
          && !state.buffering
          && tabActiveRef.current
          && !isScrollingRef.current
          && !userPausedRef.current
          && !state.error
        ) {
          const clip = loopClipRef.current
          const idx = settledIndexRef.current
          const current = clips[idx]
          if (
            clip
            && current
            && clip.songId === current.songId
            && clip.lineId === current.lineId
            && current.audioUrl
          ) {
            window.setTimeout(() => {
              if (isScrollingRef.current || !tabActiveRef.current) return
              const wantSound = readShortsUnmutePref()
              applyShortsVolume(wantSound)
              playLyricMomentShort(current)
            }, 40)
          }
        }
        return
      }
      if (state.snippet) {
        const playKey = `${state.songId}_${state.snippet.lineIndex}`
        setPlayingKey(playKey)
        setAutoplayBlocked(false)
        const span = Math.max(0.001, state.snippet.endSec - state.snippet.startSec)
        const pct = Math.min(1, Math.max(0, (state.currentTime - state.snippet.startSec) / span))
        setProgressPct(pct)
        if (!signedInRef.current && state.playing) {
          const played = anonPlayedKeysRef.current
          if (!played.has(playKey)) {
            played.add(playKey)
            setAnonPlaysCompleted(played.size)
          }
        }
      }
    })
  }, [applyShortsVolume, clips])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || clips.length === 0) return
    const next = clips[settledIndex + 1]
    if (next?.audioUrl) warmUrls([next.audioUrl])
  }, [settledIndex, clips])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root || clips.length === 0) return

    let settleTimer: ReturnType<typeof setTimeout> | undefined

    const commitSettled = () => {
      isScrollingRef.current = false
      const idx = findSettledSlideIndex(root)
      settledIndexRef.current = idx
      setSettledIndex(idx)
    }

    const onScroll = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true
        userPausedRef.current = false
        setUserPaused(false)
        setProgressPct(0)
        stop()
        setPlayingKey(null)
        lastAutoIndexRef.current = -1
      }
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(commitSettled, 140)
    }

    const onScrollEnd = () => {
      if (settleTimer) clearTimeout(settleTimer)
      commitSettled()
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    root.addEventListener('scrollend', onScrollEnd)
    commitSettled()
    return () => {
      root.removeEventListener('scroll', onScroll)
      root.removeEventListener('scrollend', onScrollEnd)
      if (settleTimer) clearTimeout(settleTimer)
    }
  }, [clips.length])

  useEffect(() => {
    if (!tabActive || autoplayBlocked || isScrollingRef.current) return
    if (settledIndex === lastAutoIndexRef.current) return
    const clip = clips[settledIndex]
    if (!clip?.audioUrl) return
    const clipKey = `${clip.songId}_${clip.lineId}`
    if (
      !signedIn
      && anonPlaysCompleted >= ANON_PLAYS_BEFORE_SIGNUP
      && !anonPlayedKeysRef.current.has(clipKey)
    ) {
      return
    }
    lastAutoIndexRef.current = settledIndex
    loopClipRef.current = clip
    userPausedRef.current = false
    setUserPaused(false)
    applyShortsVolume(soundOn)
    playLyricMomentShort(clip)
    const t = window.setTimeout(() => {
      const err = getAudioEngineState().error
      if (err?.includes('Play blocked')) setAutoplayBlocked(true)
    }, 400)
    return () => window.clearTimeout(t)
  }, [settledIndex, anonPlaysCompleted, applyShortsVolume, autoplayBlocked, clips, signedIn, soundOn, tabActive])

  const toggleMutePref = useCallback(() => {
    const next = !soundOn
    setSoundOn(next)
    persistShortsUnmutePref(next)
    applyShortsVolume(next)
  }, [applyShortsVolume, soundOn])

  const handleTapVideo = useCallback(() => {
    const clip = clips[settledIndex]
    if (!clip?.audioUrl) return
    const key = `${clip.songId}_${clip.lineId}`
    const state = getAudioEngineState()
    const onThisClip =
      state.snippet
      && state.songId === clip.songId
      && state.snippet.lineIndex === clip.lineId
    if (onThisClip && state.playing) {
      togglePlayPause()
      userPausedRef.current = true
      setUserPaused(true)
      return
    }
    userPausedRef.current = false
    setUserPaused(false)
    setAutoplayBlocked(false)
    playClip(clip, true)
  }, [clips, playClip, settledIndex])

  const handleCenterPlay = useCallback(() => {
    const clip = clips[settledIndex]
    if (!clip) return
    if (
      !signedIn
      && anonPlaysCompleted >= ANON_PLAYS_BEFORE_SIGNUP
      && !anonPlayedKeysRef.current.has(`${clip.songId}_${clip.lineId}`)
    ) {
      onRequireSignIn()
      return
    }
    userPausedRef.current = false
    setUserPaused(false)
    setAutoplayBlocked(false)
    playClip(clip, true)
  }, [anonPlaysCompleted, clips, onRequireSignIn, playClip, settledIndex, signedIn])

  if (loading) {
    return (
      <div className={`margo-feed-shorts-empty${emptyWithVibe}`}>
        <p className="margo-feed-shorts-empty__body">Loading clips…</p>
      </div>
    )
  }

  if (!meetsMinimum) {
    return (
      <div className={`margo-feed-shorts-empty${emptyWithVibe}`}>
        <p className="margo-feed-shorts-empty__title">Shorts coming soon</p>
        <p className="margo-feed-shorts-empty__body">
          We need a few more catalog songs with lyric moments before Shorts can go live here.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollerRef} className={`margo-feed-shorts-pager${withVibeClass}`}>
      {clips.map((clip, index) => {
        const key = `${clip.songId}_${clip.lineId}`
        const vibeLabel = emotionToVibeLabel(clip.vibes[0]) || clip.vibes[0] || null
        const isPlaying = playingKey === key
        const isSettled = index === settledIndex
        const look = pickShortsLook(clip.songId, clip.vibes[0], utcDay)
        const clipNeedsSignup =
          !signedIn
          && anonPlaysCompleted >= ANON_PLAYS_BEFORE_SIGNUP
          && !anonPlayedKeysRef.current.has(key)
        const showSignupOnPlay = clipNeedsSignup && isSettled
        const showCenterPlay =
          isSettled
          && !isPlaying
          && (showSignupOnPlay || autoplayBlocked || userPaused)
        const slideProgress = isSettled && isPlaying ? progressPct : 0
        return (
          <FeedShortsSlide
            key={key}
            clip={clip}
            index={index}
            isSettled={isSettled}
            isPlaying={isPlaying}
            progressPct={slideProgress}
            atmosphereId={look.atmosphereId}
            stageThemeId={look.stageThemeId}
            vibeLabel={vibeLabel}
            reduceMotion={reduceMotion}
            showCenterPlay={showCenterPlay}
            showSignupOnPlay={showSignupOnPlay}
            soundOn={soundOn}
            desktopLayout={desktopLayout}
            onTapVideo={handleTapVideo}
            onToggleMute={toggleMutePref}
            onCenterPlay={handleCenterPlay}
          />
        )
      })}
    </div>
  )
}
