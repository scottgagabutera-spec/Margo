'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { isLivingAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentShort } from '@/lib/lyric-moment-playback'
import {
  getAudioEngineState,
  stop,
  subscribeAudioEngine,
  warmUrls,
  setVolume,
  toggleMute,
} from '@/lib/audio-engine'
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
  atmosphereId: AtmosphereId
  stageThemeId: StageCardThemeId
  vibeLabel: string | null
  reduceMotion: boolean
  showBlockedPlay: boolean
  showSignupOnPlay: boolean
  soundOn: boolean
  desktopLayout: boolean
  onPlay: () => void
  onTapToggleSound: () => void
}

function FeedShortsSlide({
  clip,
  index,
  isSettled,
  isPlaying,
  atmosphereId,
  stageThemeId,
  vibeLabel,
  reduceMotion,
  showBlockedPlay,
  showSignupOnPlay,
  soundOn,
  desktopLayout,
  onPlay,
  onTapToggleSound,
}: SlideProps) {
  const [soundFlash, setSoundFlash] = useState(false)

  const effectOwnsFill =
    isSettled && !reduceMotion && isLivingAtmosphere(atmosphereId)

  const cardAtmosphere = atmosphereId

  useEffect(() => {
    if (!soundFlash) return
    const t = window.setTimeout(() => setSoundFlash(false), 700)
    return () => window.clearTimeout(t)
  }, [soundFlash])

  const handleTapSurface = () => {
    if (!isSettled) return
    onTapToggleSound()
    if (!reduceMotion) setSoundFlash(true)
  }

  const showMetaPlay = !!clip.audioUrl || showSignupOnPlay || showBlockedPlay

  const phoneMeta = (
    <>
      <Link href={`/song/${clip.songId}`} className="margo-feed-shorts-slide__song">
        {clip.songTitle}
      </Link>
      <span className="margo-feed-shorts-slide__artist">{clip.artist}</span>
    </>
  )

  const desktopMeta = (
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
      {showMetaPlay ? (
        <button
          type="button"
          className="margo-feed-shorts-slide__meta-play"
          aria-label={showSignupOnPlay ? 'Sign up to play' : showBlockedPlay ? 'Play Short' : isPlaying ? 'Pause Short' : 'Play Short'}
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
        >
          {showSignupOnPlay ? 'Sign up' : showBlockedPlay ? 'Play' : (
            <PlayPauseIcon playing={isPlaying} buffering={false} size={16} color="var(--gold)" />
          )}
        </button>
      ) : null}
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
        {isSettled ? (
          <button
            type="button"
            className="margo-feed-shorts-slide__tap-surface"
            aria-label={soundOn ? 'Mute Short audio' : 'Unmute Short audio'}
            aria-pressed={soundOn}
            onClick={handleTapSurface}
          />
        ) : null}
        {soundFlash ? (
          <span className="margo-feed-shorts-slide__sound-flash" aria-hidden>
            <PlayPauseIcon playing={soundOn} buffering={false} size={22} color="var(--gold)" />
          </span>
        ) : null}
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
            atmosphereId={cardAtmosphere}
            effectOwnsFill={effectOwnsFill}
            shapeId="vertical"
            hideVibeChrome
            hideShortsCreditRow={desktopLayout}
            canPlay={!!clip.audioUrl}
            playing={isPlaying}
            playControlLabel={
              desktopLayout
                ? null
                : showSignupOnPlay
                  ? 'Sign up'
                  : showBlockedPlay
                    ? 'Play'
                    : null
            }
            onPlay={onPlay}
            style={{ height: '100%', minHeight: '100%' }}
          />
        </MomentExportPreviewFrame>
        {desktopLayout ? (
          <div className="margo-feed-shorts-slide__meta">{desktopMeta}</div>
        ) : null}
      </div>
      {!desktopLayout ? (
        <div className="margo-feed-shorts-slide__meta">{phoneMeta}</div>
      ) : null}
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
  const [soundOn, setSoundOn] = useState(false)
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
    applyShortsVolume(soundOn)
    playLyricMomentShort(clip)
    const t = window.setTimeout(() => {
      const err = getAudioEngineState().error
      if (err?.includes('Play blocked')) setAutoplayBlocked(true)
    }, 400)
    return () => window.clearTimeout(t)
  }, [settledIndex, anonPlaysCompleted, applyShortsVolume, autoplayBlocked, clips, signedIn, soundOn, tabActive])

  const toggleSound = useCallback(() => {
    const next = !soundOn
    setSoundOn(next)
    persistShortsUnmutePref(next)
    applyShortsVolume(next)
    const clip = clips[settledIndex]
    if (next && clip?.audioUrl) playClip(clip, true)
  }, [applyShortsVolume, clips, playClip, settledIndex, soundOn])

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
        const showBlockedPlay = isSettled && autoplayBlocked && !isPlaying && !clipNeedsSignup
        const showSignupOnPlay = clipNeedsSignup && isSettled
        return (
          <FeedShortsSlide
            key={key}
            clip={clip}
            index={index}
            isSettled={isSettled}
            isPlaying={isPlaying}
            atmosphereId={look.atmosphereId}
            stageThemeId={look.stageThemeId}
            vibeLabel={vibeLabel}
            reduceMotion={reduceMotion}
            showBlockedPlay={showBlockedPlay}
            showSignupOnPlay={showSignupOnPlay}
            soundOn={soundOn}
            desktopLayout={desktopLayout}
            onTapToggleSound={toggleSound}
            onPlay={() => {
              if (showSignupOnPlay) {
                onRequireSignIn()
                return
              }
              setAutoplayBlocked(false)
              playClip(clip, true)
            }}
          />
        )
      })}
    </div>
  )
}
