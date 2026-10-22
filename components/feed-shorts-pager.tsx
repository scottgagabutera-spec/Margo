'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportPreviewFrame } from '@/components/moment-export-preview-frame'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool } from '@/lib/lyric-moment-playback'
import { subscribeAudioEngine, warmUrls } from '@/lib/audio-engine'

type Props = {
  clips: LyricMoment[]
  loading: boolean
  meetsMinimum: boolean
  signedIn: boolean
  onRequireSignIn: () => boolean
  vibeFilterActive?: boolean
}

export function FeedShortsPager({
  clips,
  loading,
  meetsMinimum,
  signedIn,
  onRequireSignIn,
  vibeFilterActive = false,
}: Props) {
  const withVibeClass = vibeFilterActive ? ' margo-feed-shorts-pager--with-vibe' : ''
  const emptyWithVibe = vibeFilterActive ? ' margo-feed-shorts-empty--with-vibe' : ''
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playingKey, setPlayingKey] = useState<string | null>(null)

  useEffect(() => {
    return subscribeAudioEngine((state) => {
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
        return
      }
      if (state.snippet) {
        setPlayingKey(`${state.songId}_${state.snippet.lineIndex}`)
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
    (moment: LyricMoment) => {
      if (!signedIn) {
        onRequireSignIn()
        return
      }
      playLyricMomentPool(moment, clips)
    },
    [clips, onRequireSignIn, signedIn],
  )

  if (!signedIn) {
    return (
      <div className={`margo-feed-shorts-empty${emptyWithVibe}`}>
        <p className="margo-feed-shorts-empty__title">Sign in for Shorts</p>
        <p className="margo-feed-shorts-empty__body">
          Lyric clips from the catalog are available to signed-in members for now.
        </p>
      </div>
    )
  }

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
                  cardThemeId="gold"
                  atmosphereId="still"
                  shapeId="vertical"
                  hideVibeChrome
                  canPlay={!!clip.audioUrl}
                  playing={isPlaying}
                  onPlay={() => playClip(clip)}
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
