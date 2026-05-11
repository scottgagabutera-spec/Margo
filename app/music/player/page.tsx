'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
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
  const [shareOpen, setShareOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)
  const lyricRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Wire real audio
  useEffect(() => {
    const audioUrl = (song as any)?.audioUrl
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audio.preload = 'metadata'
    audioRef.current = audio
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audioRef.current = null
    }
  }, [song])

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) audio.play().catch(() => setIsPlaying(false))
      else audio.pause()
      return
    }
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

  // Sync lyric index
  useEffect(() => {
    if (!lyrics.length) return
    const lyric = lyrics.find(l => currentTime >= l.start && currentTime < l.end)
    if (lyric) setCurrentLyricIndex(lyric.id)
  }, [currentTime, lyrics])

  // Auto-scroll active lyric into center
  useEffect(() => {
    const container = lyricsContainerRef.current
    const activeLine = lyricRefs.current[currentLyricIndex]
    if (!container || !activeLine) return
    const containerCenter = container.clientHeight / 2
    const lineTop = activeLine.offsetTop
    const lineHeight = activeLine.offsetHeight
    container.scrollTo({
      top: lineTop - containerCenter + lineHeight / 2,
      behavior: 'smooth',
    })
  }, [currentLyricIndex])

  const jumpToLyric = useCallback((id: number) => {
    const lyric = lyrics.find(l => l.id === id)
    if (lyric) {
      if (audioRef.current) audioRef.current.currentTime = lyric.start
      setCurrentTime(lyric.start)
      setCurrentLyricIndex(id)
      setIsPlaying(true)
    }
  }, [lyrics])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const currentLyric = lyrics[currentLyricIndex]
  const composeUrl = `/compose?lyric=${encodeURIComponent(currentLyric?.line || '')}&song=${encodeURIComponent((song as any)?.title || '')}&artist=${encodeURIComponent((song as any)?.artist || '')}`

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        .lyric-scroll::-webkit-scrollbar { display: none; }
        .lyric-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .lyric-btn { background: none; border: none; cursor: pointer; width: 100%; padding: 12px 0; }
        .lyric-btn:focus { outline: none; }
        .share-sheet-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          animation: fadeIn 200ms ease;
        }
        .share-sheet {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 101;
          background: #0f0e14;
          border-top: 1px solid rgba(232,197,71,0.15);
          border-radius: 24px 24px 0 0;
          padding: 32px 24px 48px;
          animation: slideUp 280ms cubic-bezier(0.32,0.72,0,1);
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .share-option {
          width: 100%; padding: 18px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          display: flex; align-items: center; gap: 16px;
          cursor: pointer; transition: all 150ms ease;
          text-decoration: none; margin-bottom: 12px;
        }
        .share-option:hover { background: rgba(232,197,71,0.06); border-color: rgba(232,197,71,0.2); }
        .share-option:last-child { margin-bottom: 0; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'rgba(232,197,71,0.06)', borderRadius: '50%', filter: 'blur(120px)' }} />
      </div>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '2px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(to right, var(--gold), #f5d878)', width: `${progress}%`, transition: 'width 100ms linear' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'fixed', top: '8px', left: 0, right: 0, zIndex: 40, padding: '16px 24px' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/music" style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
            color: 'var(--text-3)', textDecoration: 'none',
            transition: 'color 150ms ease', letterSpacing: '0.5px',
          }}>← Music</Link>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{(song as any)?.title || '—'}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{(song as any)?.artist || '—'}</p>
          </div>
          <div style={{ width: '60px' }} />
        </div>
      </header>

      {/* Lyrics — full viewport scroll, centered active line */}
      <main
        ref={lyricsContainerRef}
        className="lyric-scroll"
        style={{
          flex: 1,
          overflowY: 'scroll',
          padding: '140px 24px 200px',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)', marginBottom: '40px', textAlign: 'center',
        }}>Tap any line to jump</p>

        {lyrics.length === 0 && (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '1rem' }}>No lyrics available yet.</p>
        )}

        <div style={{ width: '100%', maxWidth: '48rem', display: 'flex', flexDirection: 'column' }}>
          {lyrics.map((lyric, i) => {
            const isCurrent = lyric.id === currentLyricIndex
            const isPast = lyric.id < currentLyricIndex
            const distance = Math.abs(lyric.id - currentLyricIndex)
            const opacity = isCurrent ? 1 : Math.max(0.12, 0.45 - distance * 0.08)
            return (
              <button
                key={lyric.id}
                ref={el => { lyricRefs.current[i] = el }}
                className="lyric-btn"
                onClick={() => jumpToLyric(lyric.id)}
                style={{ textAlign: 'center' }}
              >
                <p style={{
                  fontFamily: 'var(--font-lora), serif',
                  fontStyle: 'italic',
                  fontSize: isCurrent ? 'clamp(2rem, 6vw, 3.5rem)' : 'clamp(1rem, 2.5vw, 1.6rem)',
                  color: isCurrent ? 'var(--gold)' : isPast ? 'rgba(255,255,255,0.2)' : 'var(--text)',
                  lineHeight: isCurrent ? 1.2 : 1.6,
                  margin: '8px 0',
                  opacity,
                  transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'font-size, opacity, color',
                }}>{lyric.line}</p>
              </button>
            )
          })}
        </div>

        {/* Fade masks top and bottom */}
        <div style={{ position: 'fixed', top: '80px', left: 0, right: 0, height: '120px', background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none', zIndex: 20 }} />
        <div style={{ position: 'fixed', bottom: '120px', left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, var(--bg), transparent)', pointerEvents: 'none', zIndex: 20 }} />
      </main>

      {/* Bottom controls */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
        padding: '24px 24px 40px',
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button
            onClick={() => setIsPlaying(p => !p)}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '1px solid var(--border-hi)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text)', fontSize: '1.1rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease', flexShrink: 0,
            }}
          >{isPlaying ? '⏸' : '▶'}</button>

          <button
            onClick={() => setShareOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '15px 32px',
              background: 'var(--gold)', color: 'var(--bg)',
              borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              minHeight: '52px', boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
              transition: 'all 150ms ease',
            }}
          >Share This Lyric</button>
        </div>
      </footer>

      {/* Share Sheet */}
      {shareOpen && (
        <>
          <div className="share-sheet-overlay" onClick={() => setShareOpen(false)} />
          <div className="share-sheet">
            {/* Current lyric preview */}
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
              fontSize: '1rem', color: 'var(--gold)', textAlign: 'center',
              marginBottom: '8px', lineHeight: 1.5,
            }}>"{currentLyric?.line}"</p>
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem',
              color: 'var(--text-3)', textAlign: 'center',
              letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: '28px',
            }}>{(song as any)?.title} · {(song as any)?.artist}</p>

            {/* Option 1 — Post to Feed */}
            <Link href={composeUrl} className="share-option">
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>✦</div>
              <div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', margin: 0 }}>Post to Margo Feed</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.72rem', color: 'var(--text-3)', margin: '2px 0 0' }}>Share this lyric with your emotion on the feed</p>
              </div>
            </Link>

            {/* Option 2 — Share as Card */}
            <button
              className="share-option"
              onClick={() => {
                setShareOpen(false)
                // Native share with text — card export requires canvas, handled via compose for now
                if (navigator.share) {
                  navigator.share({
                    title: `${(song as any)?.title} — Margo`,
                    text: `"${currentLyric?.line}" — ${(song as any)?.artist}\n\nListen on Margo: https://trymargo.com`,
                    url: 'https://trymargo.com',
                  }).catch(() => {})
                } else {
                  navigator.clipboard?.writeText(`"${currentLyric?.line}" — ${(song as any)?.artist}\n\nhttps://trymargo.com`)
                }
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>↗</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', margin: 0 }}>Share Outside Margo</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.72rem', color: 'var(--text-3)', margin: '2px 0 0' }}>Send via WhatsApp, Instagram, or copy link</p>
              </div>
            </button>

            {/* Cancel */}
            <button
              onClick={() => setShareOpen(false)}
              style={{
                width: '100%', padding: '16px', marginTop: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem',
                color: 'var(--text-3)', letterSpacing: '1px',
              }}
            >Cancel</button>
          </div>
        </>
      )}
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
