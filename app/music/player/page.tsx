'use client'

import { PlayPauseIcon } from '@/components/play-pause-icon'
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSong } from '@/hooks/useSong'
import { useSongs } from '@/hooks/useSongs'
import { Song } from '@/hooks/useSongs'
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
  const router = useRouter()
  const songId = searchParams.get('id')
  const earlyAudioUrl = searchParams.get('au')
  const { song, lyrics: realLyrics, loading } = useSong(songId)
  const { songs } = useSongs()

  const lyrics: LyricLine[] = realLyrics.length > 0 ? realLyrics : parseLyrics(song?.lyrics)
  const duration = (song as any)?.duration || 180

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [cardExportOpen, setCardExportOpen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [trayDismissed, setTrayDismissed] = useState(false)
  const autoplayParam = searchParams.get('autoplay')
  const [showTapOverlay, setShowTapOverlay] = useState(autoplayParam === '1')

  const [songEnded, setSongEnded] = useState(false)
  const [endedTitle, setEndedTitle] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasCountedPlay = useRef(false)
  const pendingPlay = useRef(false)
  const lyricRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const playAudio = useRef<(() => void) | null>(null)
  const pauseAudio = useRef<(() => void) | null>(null)
  const autoNavRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Next 3 songs — stable, memoized, no flash ─────────────────────
  const nextSongs: Song[] = useMemo(() => {
    const live = songs.filter(s => (s.status === 'live' || s.status === 'active') && s.audioUrl)
    if (live.length === 0) return []
    const idx = live.findIndex(s => s.id === songId)
    const result: Song[] = []
    for (let i = 1; i <= 3; i++) {
      const next = live[(idx + i) % live.length]
      if (next && next.id !== songId) result.push(next)
    }
    return result.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i).slice(0, 3)
  }, [songs, songId])

  const primaryNext: Song | null = nextSongs[0] ?? null

  const navigateToSong = useCallback((s: Song) => {
    if (autoNavRef.current) clearTimeout(autoNavRef.current)
    router.push(`/music/player?id=${s.id}${s.audioUrl ? '&au=' + encodeURIComponent(s.audioUrl) : ''}`)
  }, [router])

  // ─── Reset on song change ───────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentLyricIndex(0)
    setSongEnded(false)
    setTrayOpen(false)
    setTrayDismissed(false)
    hasCountedPlay.current = false
    pendingPlay.current = true
    setIsPlaying(true)
  }, [songId])
  // ─── Audio setup ────────────────────────────────────────────────────
  useEffect(() => {
    const audioUrl = earlyAudioUrl || (song as any)?.audioUrl
    if (!audioUrl) return
    if (audioRef.current) return
    const audio = new Audio(audioUrl)
    audio.preload = 'auto'
    audioRef.current = audio

    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      setSongEnded(true)
      setEndedTitle((song as any)?.title || '')
      setTrayOpen(true)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)

    playAudio.current = () => {
      if (!hasCountedPlay.current && songId) {
        hasCountedPlay.current = true
        const myId = (localStorage.getItem('margoAnonName') || 'anon').replace(/[.#$[\]]/g, '_')
        import('firebase/database').then(({ ref: dbRef, get, set, runTransaction, getDatabase }) => {
          import('@/lib/firebase').then(({ app }) => {
            const db2 = getDatabase(app ?? undefined)
            const playRef = dbRef(db2, `songPlays/${songId}/${myId}`)
            get(playRef).then(snap => {
              if (!snap.exists()) {
                set(playRef, true)
                runTransaction(dbRef(db2, `songs/${songId}/plays`), (cur) => (cur || 0) + 1)
              }
            })
          })
        }).catch(() => {})
      }
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      if (audio.readyState >= 3) {
        audio.play().catch(() => setIsPlaying(false))
      } else {
        setIsBuffering(true)
        const onCanPlay = () => {
          setIsBuffering(false)
          audio.play().catch(() => setIsPlaying(false))
          audio.removeEventListener('canplaythrough', onCanPlay)
        }
        audio.addEventListener('canplaythrough', onCanPlay)
      }
    }
    pauseAudio.current = () => {
      audio.pause()
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    }
    if (pendingPlay.current) { pendingPlay.current = false; playAudio.current?.() }

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audioRef.current = null
      playAudio.current = null
      pauseAudio.current = null
      if (autoNavRef.current) clearTimeout(autoNavRef.current)
    }
  }, [earlyAudioUrl, songId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 15-second early tray trigger ──────────────────────────────────
  useEffect(() => {
    if (trayDismissed || trayOpen || songEnded) return
    const remaining = duration - currentTime
    if (remaining > 0 && remaining <= 15 && isPlaying) {
      setTrayOpen(true)
    }
  }, [currentTime, duration, trayDismissed, trayOpen, songEnded, isPlaying])

  // ─── Auto-navigate 4s after song ends ──────────────────────────────
  useEffect(() => {
    if (!songEnded || !primaryNext) return
    autoNavRef.current = setTimeout(() => {
      navigateToSong(primaryNext)
    }, 4000)
    return () => { if (autoNavRef.current) clearTimeout(autoNavRef.current) }
  }, [songEnded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Media session ──────────────────────────────────────────────────
  useEffect(() => {
    if (!song) return
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: (song as any)?.title || 'Margo',
        artist: (song as any)?.artist || 'Trymargo',
        artwork: (song as any)?.artwork
          ? [{ src: (song as any).artwork, sizes: '512x512', type: 'image/jpeg' }]
          : [{ src: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      })
      navigator.mediaSession.setActionHandler('play', () => { playAudio.current?.() })
      navigator.mediaSession.setActionHandler('pause', () => { pauseAudio.current?.() })
    }
  }, [song])

  useEffect(() => {
    if (isPlaying) playAudio.current?.()
    else pauseAudio.current?.()
  }, [isPlaying])

  // ─── Sync lyric index ───────────────────────────────────────────────
  useEffect(() => {
    if (!lyrics.length) return
    const lyric = lyrics.find(l => currentTime >= l.start && currentTime < l.end)
    if (lyric && lyric.id !== currentLyricIndex) setCurrentLyricIndex(lyric.id)
  }, [currentTime, lyrics, currentLyricIndex])

  // ─── Scroll active lyric to center ─────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current
    const activeLine = lyricRefs.current.get(currentLyricIndex)
    if (!viewport || !activeLine) return
    const vpRect = viewport.getBoundingClientRect()
    const lineRect = activeLine.getBoundingClientRect()
    const delta = (lineRect.top + lineRect.height / 2) - (vpRect.top + vpRect.height / 2)
    viewport.scrollBy({ top: delta, behavior: 'smooth' })
  }, [currentLyricIndex])

  const jumpToLyric = useCallback((id: number) => {
    const lyric = lyrics.find(l => l.id === id)
    if (lyric) {
      if (audioRef.current) audioRef.current.currentTime = lyric.start
      setCurrentTime(lyric.start)
      setCurrentLyricIndex(id)
      setIsPlaying(true)
      setTrayOpen(false)
      setTrayDismissed(true)
      setSongEnded(false)
      if (autoNavRef.current) clearTimeout(autoNavRef.current)
    }
  }, [lyrics])

  const handleLoop = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = 0
    setCurrentTime(0)
    setCurrentLyricIndex(0)
    setIsPlaying(true)
    setTrayOpen(false)
    setTrayDismissed(true)
    setSongEnded(false)
    if (autoNavRef.current) clearTimeout(autoNavRef.current)
  }, [])

  const handleDismiss = useCallback(() => {
    setTrayOpen(false)
    setTrayDismissed(true)
    if (autoNavRef.current) clearTimeout(autoNavRef.current)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const currentLyric = lyrics.find(l => l.id === currentLyricIndex)
  const composeUrl = `/compose?lyric=${encodeURIComponent(currentLyric?.line || '')}&song=${encodeURIComponent((song as any)?.title || '')}&artist=${encodeURIComponent((song as any)?.artist || '')}&artwork=${encodeURIComponent((song as any)?.artwork || '')}&songId=${encodeURIComponent(songId || '')}&audioUrl=${encodeURIComponent((song as any)?.audioUrl || '')}`

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {showTapOverlay && (
        <div onClick={() => { setShowTapOverlay(false); playAudio.current?.(); setIsPlaying(true) }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,6,10,0.88)', backdropFilter: 'blur(8px)', cursor: 'pointer' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#E8C547', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(232,197,71,0.4)', marginBottom: '20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 3.5L19 12L5 20.5V3.5Z" fill="#07060A" /></svg>
          </div>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(244,241,237,0.7)', letterSpacing: '2px', textTransform: 'uppercase' }}>Tap to play</p>
        </div>
      )}
      <style>{`
        .lyric-viewport::-webkit-scrollbar { display: none; }
        .lyric-viewport { -ms-overflow-style: none; scrollbar-width: none; }
        .lyric-line-wrap { width: 100%; display: flex; justify-content: center; padding: 10px 0; cursor: pointer; border: none; background: none; }
        .lyric-line-wrap:focus { outline: none; }
        .lyric-text { font-family: var(--font-lora), serif; font-style: italic; text-align: center; margin: 0; line-height: 1.4; transition: color 500ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1), transform 500ms cubic-bezier(0.4,0,0.2,1), font-size 500ms cubic-bezier(0.4,0,0.2,1); will-change: transform, opacity; }
        .share-sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.65); backdrop-filter: blur(10px); animation: ss-fade 200ms ease forwards; }
        .share-sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; background: #0f0e14; border-top: 1px solid rgba(232,197,71,0.15); border-radius: 24px 24px 0 0; padding: 28px 20px var(--margo-player-share-sheet-padding-bottom); animation: ss-up 300ms cubic-bezier(0.32,0.72,0,1) forwards; }
        @keyframes ss-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ss-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes tray-rise { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .share-pill { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin: 0 auto 24px; }
        .share-option { width: 100%; padding: 16px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: background 150ms ease, border-color 150ms ease; text-decoration: none; margin-bottom: 10px; }
        .share-option:hover, .share-option:active { background: rgba(232,197,71,0.06); border-color: rgba(232,197,71,0.22); }
        .next-song-card { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 200ms ease; text-align: left; font-family: inherit; }
        .next-song-card:hover, .next-song-card:active { background: rgba(232,197,71,0.07); border-color: rgba(232,197,71,0.3); }
        .next-song-card.primary { background: rgba(232,197,71,0.06); border-color: rgba(232,197,71,0.28); }
        .next-song-card.primary:hover { background: rgba(232,197,71,0.1); border-color: rgba(232,197,71,0.5); }
        .tray-action-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 32px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); cursor: pointer; transition: all 150ms ease; color: rgba(255,255,255,0.7); font-size: 1.1rem; font-family: inherit; }
        .tray-action-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); border-color: rgba(255,255,255,0.25); }
        .tray-action-btn span { font-family: var(--font-lora), serif; font-size: 0.52rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.35); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: 'rgba(232,197,71,0.055)', borderRadius: '50%', filter: 'blur(100px)' }} />
      </div>

      {/* Top progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '2px', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(to right, var(--gold), #f5d878)', width: `${progress}%`, transition: 'width 100ms linear' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'fixed', top: '8px', left: 0, right: 0, zIndex: 40, padding: '16px 24px' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/music" style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text)', textDecoration: 'none', opacity: 0.75, letterSpacing: '0.5px' }}>← Music</Link>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{(song as any)?.title || '—'}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: 0 }}>{(song as any)?.artist || '—'}</p>
          </div>
          <div style={{ width: '60px' }} />
        </div>
      </header>

      {/* Top fade */}
      <div style={{ position: 'fixed', top: '72px', left: 0, right: 0, height: '100px', background: 'linear-gradient(to bottom, var(--bg) 20%, transparent)', pointerEvents: 'none', zIndex: 20 }} />

      {/* Lyrics viewport */}
      <div
        ref={viewportRef}
        className="lyric-viewport"
        style={{
          position: 'fixed', top: '72px', bottom: 'var(--margo-player-viewport-bottom)', left: 0, right: 0,
          overflowY: 'scroll', zIndex: 10,
          paddingTop: '45vh', paddingBottom: '45vh',
          opacity: trayOpen ? 0.12 : 1,
          pointerEvents: trayOpen ? 'none' : 'auto',
          transition: 'opacity 500ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {lyrics.length === 0 && (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '1rem', textAlign: 'center', marginTop: '-40vh' }}>No lyrics available yet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {lyrics.map(lyric => {
            const isCurrent = lyric.id === currentLyricIndex
            const isPast = lyric.id < currentLyricIndex
            const distance = Math.abs(lyric.id - currentLyricIndex)
            const opacity = isCurrent ? 1 : Math.max(0.1, 0.5 - distance * 0.1)
            const translateY = isCurrent ? 0 : isPast ? -3 : 3
            return (
              <div
                key={lyric.id}
                ref={el => { if (el) lyricRefs.current.set(lyric.id, el); else lyricRefs.current.delete(lyric.id) }}
                className="lyric-line-wrap"
                onClick={() => jumpToLyric(lyric.id)}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') jumpToLyric(lyric.id) }}
              >
                <p className="lyric-text" style={{
                  maxWidth: '44rem', padding: '0 24px',
                  fontSize: isCurrent ? 'clamp(1.8rem, 5.5vw, 3.2rem)' : 'clamp(0.95rem, 2.4vw, 1.5rem)',
                  color: isCurrent ? 'var(--gold)' : isPast ? 'rgba(255,255,255,0.22)' : 'var(--text)',
                  opacity, transform: `translateY(${translateY}px)`,
                }}>{lyric.line}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{ position: 'fixed', bottom: 'var(--margo-player-fade-bottom)', left: 0, right: 0, height: '100px', background: 'linear-gradient(to top, var(--bg) 20%, transparent)', pointerEvents: 'none', zIndex: 20 }} />

      {/* Tap hint */}
      {!trayOpen && (
        <div style={{ position: 'fixed', bottom: 'var(--margo-player-hint-bottom)', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 21, pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(232,197,71,0.55)', margin: 0 }}>Tap any line to jump</p>
        </div>
      )}

      {/* ── Up Next Tray ── */}
      {trayOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
          background: 'linear-gradient(to top, rgba(7,6,10,0.99) 0%, rgba(7,6,10,0.97) 70%, rgba(7,6,10,0.88) 100%)',
          backdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(232,197,71,0.1)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px var(--margo-player-tray-padding-bottom)',
          animation: 'tray-rise 380ms cubic-bezier(0.32,0.72,0,1) forwards',
        }}>

          {/* Song ended label */}
          {songEnded ? (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '3px', textTransform: 'uppercase', margin: 0, marginBottom: '4px' }}>Song ended</p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1rem', color: 'var(--text)', margin: 0, opacity: 0.8 }}>{endedTitle}</p>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', margin: 0, marginBottom: '16px', opacity: 0.85, textAlign: 'center' }}>Up Next</p>
          )}

          {/* Song cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {nextSongs.length > 0 ? nextSongs.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`next-song-card${i === 0 ? ' primary' : ''}`}
                onClick={() => navigateToSong(s)}
              >
                <div style={{ position: 'relative', width: i === 0 ? '50px' : '42px', height: i === 0 ? '50px' : '42px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                  {s.artwork
                    ? <Image src={s.artwork} alt={s.title} fill style={{ objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'rgba(232,197,71,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--gold)', fontSize: '1rem', opacity: 0.5 }}>♪</span>
                      </div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: i === 0 ? '0.95rem' : '0.82rem', fontWeight: 600, color: i === 0 ? 'var(--text)' : 'rgba(255,255,255,0.6)', margin: 0, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist}</p>
                </div>
                <div style={{ width: i === 0 ? '32px' : '26px', height: i === 0 ? '32px' : '26px', borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 0 ? '0.65rem' : '0.55rem', color: i === 0 ? 'var(--bg)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>▶</div>
              </button>
            )) : (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.88rem', textAlign: 'center', padding: '12px 0' }}>No more songs available</p>
            )}
          </div>

          {/* Loop + Close — centered, prominent */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button type="button" className="tray-action-btn" onClick={handleLoop}>
              ↺<span>Loop</span>
            </button>
            <button type="button" className="tray-action-btn" onClick={handleDismiss}>
              ✕<span>Close</span>
            </button>
          </div>

          {songEnded && primaryNext && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '12px', letterSpacing: '1px' }}>Playing next automatically…</p>
          )}
        </div>
      )}

      {/* Bottom controls — hidden when tray open */}
      {!trayOpen && (
        <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'linear-gradient(to top, var(--bg) 75%, transparent)', padding: '20px 24px var(--margo-player-footer-padding-bottom)' }}>
          <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                if (!playAudio.current && !isPlaying) { pendingPlay.current = true; setIsPlaying(true) }
                else setIsPlaying(p => !p)
              }}
              style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border-hi)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', flexShrink: 0, outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            ><PlayPauseIcon playing={isPlaying} buffering={isBuffering} size={20} color="var(--text)" /></button>
            <button
              onClick={() => setShareOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px 32px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', minHeight: '52px', boxShadow: '0 6px 28px rgba(232,197,71,0.28)', transition: 'all 150ms ease' }}
            >Share This Lyric</button>
          </div>
        </footer>
      )}

      {/* Share Sheet */}
      {shareOpen && (
        <>
          <div className="share-sheet-overlay" onClick={() => setShareOpen(false)} />
          <div className="share-sheet">
            <div className="share-pill" />
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1rem', color: 'var(--gold)', textAlign: 'center', marginBottom: '6px', lineHeight: 1.5 }}>"{currentLyric?.line}"</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>{(song as any)?.title} · {(song as any)?.artist}</p>
            <Link href={composeUrl} className="share-option" onClick={() => setShareOpen(false)}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>✦</div>
              <div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>Post to Margo Feed</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 0' }}>Share this lyric with your emotion on the feed</p>
              </div>
            </Link>
            <button className="share-option" onClick={() => { setShareOpen(false); setTimeout(() => setCardExportOpen(true), 180) }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🖼</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>Share as Card</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 0' }}>Export a lyric card — choose theme, shape, save or share</p>
              </div>
            </button>
            <button onClick={() => setShareOpen(false)} style={{ width: '100%', padding: '16px', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '1px' }}>Cancel</button>
          </div>
        </>
      )}

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
