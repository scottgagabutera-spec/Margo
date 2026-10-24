'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { isLivingAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool } from '@/lib/lyric-moment-playback'
import {
  getAudioEngineState,
  stop,
  subscribeAudioEngine,
  warmUrls,
  setVolume,
  toggleMute,
} from '@/lib/audio-engine'
import { pickShortsLook } from '@/lib/shorts-looks'
import { computeShortsFrameLayout } from '@/lib/shorts-frame-layout'
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

type SlideProps = {
  clip: LyricMoment
  index: number
  isActive: boolean
  isPlaying: boolean
  atmosphereId: AtmosphereId
  stageThemeId: StageCardThemeId
  vibeLabel: string | null
  reduceMotion: boolean
  showBlockedPlay: boolean
  showSignupOnPlay: boolean
  soundOn: boolean
  onToggleSound: () => void
  onPlay: () => void
}

function FeedShortsSlide({
  clip,
  index,
  isActive,
  isPlaying,
  atmosphereId,
  stageThemeId,
  vibeLabel,
  reduceMotion,
  showBlockedPlay,
  showSignupOnPlay,
  soundOn,
  onToggleSound,
  onPlay,
}: SlideProps) {
  const [fillMotion, setFillMotion] = useState(false)

  useEffect(() => {
    if (!isActive || reduceMotion) {
      setFillMotion(false)
      return
    }
    setFillMotion(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFillMotion(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isActive, clip.songId, clip.lineId, reduceMotion])

  return (
    <section
      className="margo-feed-shorts-slide"
      data-shorts-slide
      data-shorts-index={index}
      data-shorts-active={isActive ? '1' : '0'}
      data-shorts-fill-motion={fillMotion ? '1' : '0'}
    >
      <div className="margo-feed-shorts-slide__frame">
        <MomentExportPreviewFrame shapeId="vertical" framed={false} fillParent style={{ height: '100%', width: '100%' }}>
          <StageMomentCard
            lyric={clip.line}
            songTitle={clip.songTitle}
            artistName={clip.artist}
            artwork={clip.artwork}
            vibeLabel={vibeLabel}
            cardThemeId={stageThemeId}
            atmosphereId={atmosphereId}
            effectOwnsFill={
              isActive && fillMotion && !reduceMotion && isLivingAtmosphere(atmosphereId)
            }
            shapeId="vertical"
            hideVibeChrome
            canPlay={!!clip.audioUrl}
            playing={isPlaying}
            playControlLabel={showSignupOnPlay ? 'Sign up' : showBlockedPlay ? 'Play' : null}
            onPlay={onPlay}
            style={{ height: '100%', minHeight: '100%' }}
          />
        </MomentExportPreviewFrame>
        <div className="margo-feed-shorts-slide__meta">
          <Link href={`/song/${clip.songId}`} className="margo-feed-shorts-slide__song">
            {clip.songTitle}
          </Link>
          <span className="margo-feed-shorts-slide__artist">{clip.artist}</span>
          {isActive ? (
            <button
              type="button"
              className="margo-feed-shorts-slide__sound"
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Mute Short' : 'Unmute Short'}
              onClick={onToggleSound}
            >
              {soundOn ? 'Sound on' : 'Tap for sound'}
            </button>
          ) : null}
        </div>
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [anonPlaysCompleted, setAnonPlaysCompleted] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const anonPlayedKeysRef = useRef(new Set<string>())
  const signedInRef = useRef(signedIn)
  const lastAutoIndexRef = useRef<number>(-1)
  const utcDay = utcDayKey(new Date())

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const syncFrameMetrics = () => {
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
    if (!tabActive) {
      stop()
      setPlayingKey(null)
      lastAutoIndexRef.current = -1
    }
  }, [tabActive])

  useEffect(() => {
    return subscribeAudioEngine((state) => {
      if (state.error?.includes('Play blocked')) {
        setAutoplayBlocked(true)
      }
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
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
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || clips.length === 0) return
    const next = clips[activeIndex + 1]
    if (next?.audioUrl) warmUrls([next.audioUrl])
  }, [activeIndex, clips])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const slides = root.querySelectorAll('[data-shorts-slide]')
    if (!slides.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue
          const idx = Number((entry.target as HTMLElement).dataset.shortsIndex)
          if (Number.isFinite(idx)) setActiveIndex(idx)
        }
      },
      { root, threshold: [0.6] },
    )
    slides.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [clips.length])

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
      applyShortsVolume(soundOn)
      playLyricMomentPool(moment, clips)
    },
    [applyShortsVolume, clips, soundOn],
  )

  useEffect(() => {
    if (!tabActive || autoplayBlocked) return
    if (activeIndex === lastAutoIndexRef.current) return
    const clip = clips[activeIndex]
    if (!clip?.audioUrl) return
    const clipKey = `${clip.songId}_${clip.lineId}`
    if (
      !signedIn
      && anonPlaysCompleted >= ANON_PLAYS_BEFORE_SIGNUP
      && !anonPlayedKeysRef.current.has(clipKey)
    ) {
      return
    }
    lastAutoIndexRef.current = activeIndex
    applyShortsVolume(soundOn)
    playLyricMomentPool(clip, clips)
    const t = window.setTimeout(() => {
      const err = getAudioEngineState().error
      if (err?.includes('Play blocked')) setAutoplayBlocked(true)
    }, 400)
    return () => window.clearTimeout(t)
  }, [activeIndex, anonPlaysCompleted, applyShortsVolume, autoplayBlocked, clips, signedIn, soundOn, tabActive])

  const toggleSound = useCallback(() => {
    const next = !soundOn
    setSoundOn(next)
    persistShortsUnmutePref(next)
    applyShortsVolume(next)
    const clip = clips[activeIndex]
    if (next && clip?.audioUrl) playClip(clip, true)
  }, [activeIndex, applyShortsVolume, clips, playClip, soundOn])

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
        const isActive = index === activeIndex
        const look = pickShortsLook(clip.songId, clip.vibes[0], utcDay)
        const clipNeedsSignup =
          !signedIn
          && anonPlaysCompleted >= ANON_PLAYS_BEFORE_SIGNUP
          && !anonPlayedKeysRef.current.has(key)
        const showBlockedPlay = isActive && autoplayBlocked && !isPlaying && !clipNeedsSignup
        const showSignupOnPlay = clipNeedsSignup && isActive
        return (
          <FeedShortsSlide
            key={key}
            clip={clip}
            index={index}
            isActive={isActive}
            isPlaying={isPlaying}
            atmosphereId={look.atmosphereId}
            stageThemeId={look.stageThemeId}
            vibeLabel={vibeLabel}
            reduceMotion={reduceMotion}
            showBlockedPlay={showBlockedPlay}
            showSignupOnPlay={showSignupOnPlay}
            soundOn={soundOn}
            onToggleSound={toggleSound}
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
