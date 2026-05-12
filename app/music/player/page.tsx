'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSong } from '@/hooks/useSong'
import { CardExportModal } from '@/components/card-export-modal'

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
  const [cardExportOpen, setCardExportOpen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasCountedPlay = useRef(false)
  // One ref per lyric line — keyed by lyric.id
  const lyricRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const viewportRef = useRef<HTMLDivElement | null>(null)

  // ─── Wire real audio + Media Session ──────────────────
  useEffect(() => {
    const audioUrl = (song as any)?.audioUrl
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audio.preload = "auto"
    audioRef.current = audio
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    // Media Session API — kills Android orange overlay, sets Margo context
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: (song as any)?.title || "Margo",
        artist: (song as any)?.artist || "Trymargo",
        artwork: (song as any)?.artwork
          ? [{ src: (song as any).artwork, sizes: "512x512", type: "image/jpeg" }]
          : [{ src: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      })
      navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true))
      navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false))
    }
    return () => {
      audio.pause()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.setActionHandler("play", null)
        navigator.mediaSession.setActionHandler("pause", null)
      }
    }
  }, [song])

  // ─── Play / pause ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      if (!hasCountedPlay.current && songId) {
        hasCountedPlay.current = true
        import("firebase/database").then(({ ref: dbRef, runTransaction, getDatabase }) => {
          import("@/lib/firebase").then(({ app }) => {
            const db2 = getDatabase(app ?? undefined)
            runTransaction(dbRef(db2, `songs/${songId}/plays`), (cur) => (cur || 0) + 1)
          })
        }).catch(() => {})
      }
      // Wait for enough data before playing — fixes silent first-tap on mobile
      if (audio.readyState >= 3) {
        audio.play().catch(() => setIsPlaying(false))
      } else {
        setIsBuffering(true)
        const onCanPlay = () => {
          setIsBuffering(false)
          audio.play().catch(() => setIsPlaying(false))
          audio.removeEventListener("canplaythrough", onCanPlay)
        }
        audio.addEventListener("canplaythrough", onCanPlay)
      }
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"
    } else {
      audio.pause()
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"
    }
  }, [isPlaying, songId])

  // ─── Sync lyric index to time ─────────────────────────────
  useEffect(() => {
    if (!lyrics.length) return
    const lyric = lyrics.find(l => currentTime >= l.start && currentTime < l.end)
    if (lyric && lyric.id !== currentLyricIndex) setCurrentLyricIndex(lyric.id)
  }, [currentTime, lyrics, currentLyricIndex])

  // ─── Scroll active line to viewport center ────────────────
  // Uses a fixed center-point div as the scroll target so the
  // active lyric always lands in the exact middle of the screen,
  // regardless of line height changes.
  useEffect(() => {
    const viewport = viewportRef.current
    const activeLine = lyricRefs.current.get(currentLyricIndex)
    if (!viewport || !activeLine) return

    const vpRect = viewport.getBoundingClientRect()
    const lineRect = activeLine.getBoundingClientRect()

    // How far the line center is from the viewport center
    const lineCenterY = lineRect.top + lineRect.height / 2
    const vpCenterY = vpRect.top + vpRect.height / 2
    const delta = lineCenterY - vpCenterY

    viewport.scrollBy({ top: delta, behavior: 'smooth' })
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
  const currentLyric = lyrics.find(l => l.id === currentLyricIndex)
  const composeUrl = `/compose?lyric=${encodeURIComponent(currentLyric?.line || '')}&song=${encodeURIComponent((song as any)?.title || '')}&artist=${encodeURIComponent((song as any)?.artist || '')}`

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        /* Hide scrollbar but keep scroll */
        .lyric-viewport::-webkit-scrollbar { display: none; }
        .lyric-viewport { -ms-overflow-style: none; scrollbar-width: none; }

        /* Lyric line wrapper — no padding jump on size change */
        .lyric-line-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 10px 0;
          cursor: pointer;
          border: none;
          background: none;
        }
        .lyric-line-wrap:focus { outline: none; }

        /* The text itself transitions smoothly */
        .lyric-text {
          font-family: var(--font-lora), serif;
          font-style: italic;
          text-align: center;
          margin: 0;
          line-height: 1.4;
          transition:
            color 500ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 500ms cubic-bezier(0.4, 0, 0.2, 1),
            transform 500ms cubic-bezier(0.4, 0, 0.2, 1),
            font-size 500ms cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }

        /* Share sheet */
        .share-sheet-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(10px);
          animation: ss-fade 200ms ease forwards;
        }
        .share-sheet {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 101;
          background: #0f0e14;
          border-top: 1px solid rgba(232,197,71,0.15);
          border-radius: 24px 24px 0 0;
          padding: 28px 20px 48px;
          animation: ss-up 300ms cubic-bezier(0.32,0.72,0,1) forwards;
        }
        @keyframes ss-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ss-up   { from { transform: translateY(100%) } to { transform: translateY(0) } }

        .share-pill {
          width: 36px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.15);
          margin: 0 auto 24px;
        }
        .share-option {
          width: 100%; padding: 16px 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          display: flex; align-items: center; gap: 14px;
          cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease;
          text-decoration: none; margin-bottom: 10px;
        }
        .share-option:hover,
        .share-option:active {
          background: rgba(232,197,71,0.06);
          border-color: rgba(232,197,71,0.22);
        }
        .share-option:last-of-type { margin-bottom: 0; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translateX(-50%)',
          width: '500px', height: '500px',
          background: 'rgba(232,197,71,0.055)',
          borderRadius: '50%', filter: 'blur(100px)',
        }} />
      </div>

      {/* Top progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '2px', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(to right, var(--gold), #f5d878)',
          width: `${progress}%`,
          transition: 'width 100ms linear',
        }} />
      </div>

      {/* Header */}
      <header style={{ position: 'fixed', top: '8px', left: 0, right: 0, zIndex: 40, padding: '16px 24px' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/music" style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
            color: 'var(--text)', textDecoration: 'none',
            transition: 'color 150ms ease', letterSpacing: '0.5px',
            opacity: 0.75,
          }}>← Music</Link>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {(song as any)?.title || '—'}
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>
              {(song as any)?.artist || '—'}
            </p>
          </div>

          <div style={{ width: '60px' }} />
        </div>
      </header>

      {/* ── Top fade mask (above lyrics) ── */}
      <div style={{
        position: 'fixed', top: '72px', left: 0, right: 0, height: '100px',
        background: 'linear-gradient(to bottom, var(--bg) 20%, transparent)',
        pointerEvents: 'none', zIndex: 20,
      }} />

      {/* ── LYRICS VIEWPORT ───────────────────────────────────────
          This div is the scroll container.
          Padding-top and padding-bottom equal half the viewport
          so the first and last lines can reach center.
      ─────────────────────────────────────────────────────────── */}
      <div
        ref={viewportRef}
        className="lyric-viewport"
        style={{
          position: 'fixed',
          top: '72px',
          bottom: '120px',
          left: 0,
          right: 0,
          overflowY: 'scroll',
          zIndex: 10,
          /* Half-viewport padding so first/last lines can center */
          paddingTop: '45vh',
          paddingBottom: '45vh',
        }}
      >
        {lyrics.length === 0 && (
          <p style={{
            fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
            color: 'var(--text-3)', fontSize: '1rem',
            textAlign: 'center', marginTop: '-40vh',
          }}>No lyrics available yet.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {lyrics.map(lyric => {
            const isCurrent = lyric.id === currentLyricIndex
            const isPast    = lyric.id < currentLyricIndex
            const distance  = Math.abs(lyric.id - currentLyricIndex)

            // Opacity falls off with distance, bottoms out at 0.1
            const opacity = isCurrent ? 1 : Math.max(0.1, 0.5 - distance * 0.1)

            // Slight vertical nudge — past lines drift up, upcoming drift down
            const translateY = isCurrent ? 0 : isPast ? -3 : 3

            return (
              <div
                key={lyric.id}
                ref={el => {
                  if (el) lyricRefs.current.set(lyric.id, el)
                  else lyricRefs.current.delete(lyric.id)
                }}
                className="lyric-line-wrap"
                onClick={() => jumpToLyric(lyric.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') jumpToLyric(lyric.id) }}
              >
                <p
                  className="lyric-text"
                  style={{
                    maxWidth: '44rem',
                    padding: '0 24px',
                    fontSize: isCurrent
                      ? 'clamp(1.8rem, 5.5vw, 3.2rem)'
                      : 'clamp(0.95rem, 2.4vw, 1.5rem)',
                    color: isCurrent
                      ? 'var(--gold)'
                      : isPast
                        ? 'rgba(255,255,255,0.22)'
                        : 'var(--text)',
                    opacity,
                    transform: `translateY(${translateY}px)`,
                  }}
                >
                  {lyric.line}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom fade mask (above footer) ── */}
      <div style={{
        position: 'fixed', bottom: '112px', left: 0, right: 0, height: '100px',
        background: 'linear-gradient(to top, var(--bg) 20%, transparent)',
        pointerEvents: 'none', zIndex: 20,
      }} />

      {/* "Tap any line to jump" hint — sits just above bottom controls */}
      <div style={{
        position: 'fixed', bottom: '128px', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 21, pointerEvents: 'none',
      }}>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
          color: 'rgba(232,197,71,0.55)', margin: 0,
        }}>Tap any line to jump</p>
      </div>

      {/* ── Bottom controls ── */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(to top, var(--bg) 75%, transparent)',
        padding: '20px 24px 36px',
      }}>
        <div style={{
          maxWidth: '56rem', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          {/* Play / Pause */}
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
          >{isBuffering ? '◌' : isPlaying ? '⏸' : '▶'}</button>

          {/* Share This Lyric */}
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

      {/* ── Share Sheet ────────────────────────────────────────── */}
      {shareOpen && (
        <>
          <div className="share-sheet-overlay" onClick={() => setShareOpen(false)} />
          <div className="share-sheet">
            <div className="share-pill" />

            {/* Current lyric preview */}
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
              fontSize: '1rem', color: 'var(--gold)',
              textAlign: 'center', marginBottom: '6px', lineHeight: 1.5,
            }}>"{currentLyric?.line}"</p>
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem',
              color: 'var(--text-3)', textAlign: 'center',
              letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px',
            }}>{(song as any)?.title} · {(song as any)?.artist}</p>

            {/* Option 1 — Post to Margo Feed */}
            <Link href={composeUrl} className="share-option" onClick={() => setShareOpen(false)}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>✦</div>
              <div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>
                  Post to Margo Feed
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 0' }}>
                  Share this lyric with your emotion on the feed
                </p>
              </div>
            </Link>

            {/* Option 2 — Share as Card (real CardExportModal) */}
            <button
              className="share-option"
              onClick={() => {
                setShareOpen(false)
                // Small delay so sheet exit animation completes before modal opens
                setTimeout(() => setCardExportOpen(true), 180)
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>🖼</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>
                  Share as Card
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 0' }}>
                  Export a lyric card — choose theme, shape, save or share
                </p>
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

      {/* ── Card Export Modal ─────────────────────────────────── */}
      <CardExportModal
        open={cardExportOpen}
        onOpenChange={setCardExportOpen}
        lyric={currentLyric?.line || ''}
        song={(song as any)?.title || ''}
        artist={(song as any)?.artist || ''}
      />
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
