'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { isLivingAtmosphere } from '@/lib/atmosphere'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool } from '@/lib/lyric-moment-playback'
import {
  getAudioEngineState,
  stop,
  subscribeAudioEngine,
  warmUrls,
} from '@/lib/audio-engine'
import { pickShortsLook } from '@/lib/shorts-looks'
import { utcDayKey } from '@/lib/shorts-shelf-rotation'

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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const lastAutoIndexRef = useRef<number>(-1)
  const utcDay = utcDayKey(new Date())

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
        setPlayingKey(`${state.songId}_${state.snippet.lineIndex}`)
        setAutoplayBlocked(false)
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

  const playClip = useCallback(
    (moment: LyricMoment, fromUserGesture: boolean) => {
      if (!signedIn) {
        onRequireSignIn()
        return
      }
      if (!moment.audioUrl) return
      playLyricMomentPool(moment, clips)
      if (fromUserGesture) setAudioUnlocked(true)
    },
    [clips, onRequireSignIn, signedIn],
  )

  useEffect(() => {
    if (!tabActive || !signedIn || !audioUnlocked || autoplayBlocked) return
    if (activeIndex === lastAutoIndexRef.current) return
    const clip = clips[activeIndex]
    if (!clip?.audioUrl) return
    lastAutoIndexRef.current = activeIndex
    playLyricMomentPool(clip, clips)
    const t = window.setTimeout(() => {
      const err = getAudioEngineState().error
      if (err?.includes('Play blocked')) setAutoplayBlocked(true)
    }, 400)
    return () => window.clearTimeout(t)
  }, [activeIndex, audioUnlocked, autoplayBlocked, clips, signedIn, tabActive])

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
        const motionAtmosphere = isActive ? look.atmosphereId : 'still'
        const showBlockedPlay = signedIn && isActive && autoplayBlocked && !isPlaying
        return (
          <section
            key={key}
            className="margo-feed-shorts-slide"
            data-shorts-slide
            data-shorts-index={index}
          >
            <div className="margo-feed-shorts-slide__frame">
              <MomentExportPreviewFrame shapeId="vertical" framed={false} style={{ height: '100%', width: '100%' }}>
                <StageMomentCard
                  lyric={clip.line}
                  songTitle={clip.songTitle}
                  artistName={clip.artist}
                  artwork={clip.artwork}
                  vibeLabel={vibeLabel}
                  cardThemeId={look.stageThemeId}
                  atmosphereId={motionAtmosphere}
                  effectOwnsFill={isActive && isLivingAtmosphere(motionAtmosphere)}
                  shapeId="vertical"
                  hideVibeChrome
                  canPlay={!!clip.audioUrl}
                  playing={isPlaying}
                  playControlLabel={signedIn ? (showBlockedPlay ? 'Play' : null) : 'Sign up'}
                  onPlay={() => {
                    if (!signedIn) {
                      onRequireSignIn()
                      return
                    }
                    setAutoplayBlocked(false)
                    playClip(clip, true)
                  }}
                  style={{ height: '100%', minHeight: '100%' }}
                />
              </MomentExportPreviewFrame>
            </div>
            <div className="margo-feed-shorts-slide__meta">
              <Link href={`/song/${clip.songId}`} className="margo-feed-shorts-slide__song">
                {clip.songTitle}
              </Link>
              <span className="margo-feed-shorts-slide__artist">{clip.artist}</span>
            </div>
          </section>
        )
      })}
    </div>
  )
}
