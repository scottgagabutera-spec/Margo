'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSong } from '@/hooks/useSong'

interface LyricLine {
  id: number
  line: string
  start: number
  end: number
}

function parseLyrics(raw: unknown): LyricLine[] {
  if (Array.isArray(raw)) return raw as LyricLine[]
  return []
}

function PlayerContent() {
  const searchParams = useSearchParams()
  const songId = searchParams.get('id')
  const { song, lyrics: realLyrics, loading } = useSong(songId)

  const lyrics: LyricLine[] = realLyrics.length > 0
    ? realLyrics
    : parseLyrics(song?.lyrics)

  const duration = (song as any)?.duration || 180

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)

  useEffect(() => {
    if (!lyrics.length) return
    const lyric = lyrics.find(l => currentTime >= l.start && currentTime < l.end)
    if (lyric) setCurrentLyricIndex(lyric.id)
  }, [currentTime, lyrics])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) { setIsPlaying(false); return 0 }
          return prev + 0.1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const jumpToLyric = useCallback((id: number) => {
    const lyric = lyrics.find(l => l.id === id)
    if (lyric) {
      setCurrentTime(lyric.start)
      setCurrentLyricIndex(id)
      setIsPlaying(true)
    }
  }, [lyrics])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'rgba(232,197,71,0.06)', borderRadius: '50%', filter: 'blur(120px)' }} />
      </div>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '2px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(to right, var(--gold), var(--gold-warm))', width: `${progress}%`, transition: 'width 100ms linear' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'fixed', top: '8px', left: 0, right: 0, zIndex: 40, padding: '16px 24px' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/music" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
            color: 'var(--text-3)', textDecoration: 'none',
            transition: 'color 150ms ease', letterSpacing: '0.5px',
          }}>← Music</Link>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{song?.title || '—'}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)' }}>{song?.artist || '—'}</p>
          </div>
          <div style={{ width: '60px' }} />
        </div>
      </header>

      {/* Lyrics */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 160px', position: 'relative', zIndex: 10 }}>
        <p style={{ position: 'absolute', top: '88px', fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
          Tap any line to jump
        </p>

        {lyrics.length === 0 && (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '1rem' }}>No lyrics available yet.</p>
        )}

        <div style={{ width: '100%', maxWidth: '48rem', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {lyrics.slice(
            Math.max(0, currentLyricIndex - 3),
            Math.min(lyrics.length, currentLyricIndex + 4)
          ).map(lyric => {
            const isCurrent = lyric.id === currentLyricIndex
            const isPast = lyric.id < currentLyricIndex
            const distance = Math.abs(lyric.id - currentLyricIndex)
            return (
              <button
                key={lyric.id}
                onClick={() => jumpToLyric(lyric.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'center', padding: 0,
                  opacity: isCurrent ? 1 : Math.max(0.15, 0.5 - distance * 0.15),
                  transform: `translateY(${isCurrent ? 0 : isPast ? -4 : 4}px)`,
                  transition: 'opacity 700ms ease, transform 700ms ease',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-lora), serif',
                  fontStyle: 'italic',
                  fontSize: isCurrent ? 'clamp(2rem, 6vw, 4rem)' : 'clamp(1.2rem, 3vw, 2rem)',
                  color: isCurrent ? 'var(--gold)' : isPast ? 'rgba(255,255,255,0.25)' : 'var(--text)',
                  lineHeight: isCurrent ? 1.2 : 1.5,
                  transition: 'color 700ms ease, font-size 700ms ease',
                  margin: 0,
                }}>{lyric.line}</p>
              </button>
            )
          })}
        </div>
      </main>

      {/* Bottom controls */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        padding: '32px 24px 40px',
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '1px solid var(--border-hi)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)', fontSize: '1.1rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
          >{isPlaying ? '⏸' : '▶'}</button>

          {/* Share This Lyric — Tier 1 */}
          <Link
            href={`/compose?lyric=${encodeURIComponent(lyrics[currentLyricIndex]?.line || '')}&song=${encodeURIComponent(song?.title || '')}&artist=${encodeURIComponent(song?.artist || '')}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '15px 32px',
              background: 'var(--gold)', color: 'var(--bg)',
              borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
              textTransform: 'uppercase', textDecoration: 'none',
              minHeight: '52px', boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
              transition: 'all 150ms ease',
            }}
          >Share This Lyric</Link>
        </div>
      </footer>
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  )
}
