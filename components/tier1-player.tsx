'use client'

import { useRef, useState } from 'react'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { MusicNoteIcon } from '@/components/icons'
import { playFull, stop, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { fetchLyricLines, type LyricLine } from '@/lib/fetch-lyric-lines'

export function Tier1Player({
  audioUrl,
  songId,
  postText,
  title = '',
  artist = '',
  artwork = null,
}: {
  audioUrl: string
  songId: string | null
  postText?: string
  title?: string
  artist?: string
  artwork?: string | null
}) {
  const engineState = useAudioEngine()
  const { requireAuth } = useAuthGate()
  const isThisSong = engineState.songId === (songId || audioUrl)
  const playing = engineState.playing && isThisSong && engineState.mode === 'full'
  const isBuffering = engineState.buffering && isThisSong
  const progress = isThisSong ? engineState.progress : 0
  const currentTime = isThisSong ? engineState.currentTime : 0
  const duration = isThisSong ? engineState.duration : 0

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [lyricsLoaded, setLyricsLoaded] = useState(false)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const playedRef = useRef(false)

  const loadLyrics = async () => {
    if (lyricsLoaded || !songId) return
    const lines = await fetchLyricLines(songId)
    setLyrics(lines)
    setLyricsLoaded(true)
  }

  const toggle = async () => {
    if (!requireAuth()) return
    void loadLyrics()
    if (isThisSong && engineState.mode === 'full') {
      void togglePlayPause()
      return
    }
    stop()
    playedRef.current = true
    void playFull({
      songId: songId || audioUrl,
      audioUrl,
      title,
      artist,
      artwork,
      startSec: 0,
      autoplay: true,
      source: 'feed-tier1',
    })
  }

  const seekFromX = (clientX: number) => {
    const bar = progressRef.current
    if (!bar || !duration || !isThisSong) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    import('@/lib/audio-engine').then(({ playFullSeek }) => playFullSeek(pct * duration))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    seekFromX(e.clientX)
    const onMove = (ev: MouseEvent) => seekFromX(ev.clientX)
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true)
    seekFromX(e.touches[0].clientX)
    const onMove = (ev: TouchEvent) => seekFromX(ev.touches[0].clientX)
    const onEnd = () => {
      setDragging(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const currentLine = lyrics.find((l) => currentTime >= l.start && currentTime < l.end)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: currentLine ? '12px' : '0' }}>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          style={{
            width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
            background: 'var(--gold)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation', userSelect: 'none', boxSizing: 'border-box',
          }}
        >
          <PlayPauseIcon playing={playing} buffering={isBuffering} size={14} color="var(--bg)" />
        </button>
        <div style={{ flex: 1 }}>
          <div
            ref={progressRef}
            className="margo-seek-scrub"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              minHeight: 'var(--margo-touch-min)', height: '20px', display: 'flex', alignItems: 'center',
              cursor: 'pointer', marginBottom: '2px', boxSizing: 'border-box',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: '2px',
                transition: dragging ? 'none' : 'width 200ms linear',
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--gold)', boxShadow: '0 0 4px rgba(232,197,71,0.6)',
                transition: dragging ? 'none' : 'left 200ms linear',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)' }}>{fmt(currentTime)}</span>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)' }}>{duration > 0 ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      {playing && (
        <div style={{
          minHeight: '32px', padding: '8px 12px', background: 'rgba(232,197,71,0.06)',
          borderRadius: '8px', borderLeft: '2px solid var(--gold)', transition: 'all 200ms ease',
        }}>
          <p style={{
            fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem',
            color: currentLine ? 'var(--gold)' : 'var(--text-muted)', lineHeight: 1.4, margin: 0,
            transition: 'color 200ms ease', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {currentLine ? currentLine.line : <MusicNoteIcon size={14} color="var(--text-muted)" />}
          </p>
        </div>
      )}
    </div>
  )
}
