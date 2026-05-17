'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MargoNav } from '@/components/margo-nav'
import { useSongs, Song } from '@/hooks/useSongs'
import { useSharedLines } from '@/hooks/useSharedLines'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { stopPlayer } from '@/lib/player-store'


function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const VIBES = ['ALL', 'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD']

interface LyricMoment {
  line: string
  start: number
  end: number
  lineId: number
  songId: string
  songTitle: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  vibes: string[]
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)', lineHeight: 1, margin: 0 }}>{formatNum(value)}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px', opacity: gold ? 0.7 : 1 }}>{label}</p>
    </div>
  )
}

function SmallStatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)', margin: 0 }}>{formatNum(value)}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text-3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px', opacity: gold ? 0.7 : 1 }}>{label}</p>
    </div>
  )
}

// ─── Single Lyric Card ────────────────────────────────────────────────
function LyricCard({
  moment,
  visible,
  isPlaying,
  onClick,
  onPlay,
}: {
  moment: LyricMoment
  visible: boolean
  isPlaying: boolean
  onClick: () => void
  onPlay: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="lyric-card"
      onClick={onClick}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.97)',
        padding: '18px 18px',
        background: isPlaying ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isPlaying ? 'rgba(232,197,71,0.25)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'opacity 700ms cubic-bezier(0.4,0,0.2,1), transform 700ms cubic-bezier(0.4,0,0.2,1), border-color 200ms ease, background 200ms ease',
        willChange: 'opacity, transform',
      }}
    >
      <p className="lyric-text" style={{
        fontFamily: 'var(--font-lora), serif',
        fontStyle: 'italic',
        fontSize: '0.95rem',
        color: 'var(--text)',
        lineHeight: 1.55,
        flex: 1,
        margin: 0,
      }}>
        &ldquo;{moment.line}&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {moment.artwork && (
            <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
              <Image src={moment.artwork} alt={moment.songTitle} fill style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{moment.songTitle}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{formatTime(moment.start)}</p>
          </div>
        </div>
        <button
          className="snippet-btn"
          onClick={onPlay}
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
            border: '1px solid rgba(232,197,71,0.25)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 200ms ease',
            padding: 0,
          }}
        >
          <PlayPauseIcon playing={isPlaying} size={16} color="#E8C547" />
        </button>
      </div>
    </div>
  )
}

// ─── Lyric Discovery Board ────────────────────────────────────────────
function LyricBoard({ songs }: { songs: Song[] }) {
  const [activeVibe, setActiveVibe] = useState('ALL')
  const [allMoments, setAllMoments] = useState<LyricMoment[]>([])
  // 6 slots: desktop 3×2, mobile 2×3
  const SLOT_COUNT = 6
  const [slots, setSlots] = useState<(LyricMoment | null)[]>(Array(SLOT_COUNT).fill(null))
  const [slotVisible, setSlotVisible] = useState<boolean[]>(Array(SLOT_COUNT).fill(false))
  const [focusedMoment, setFocusedMoment] = useState<LyricMoment | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const vibePoolRef = useRef<LyricMoment[]>([])
  const slotQueueRef = useRef<number>(0) // next slot to replace
  const CYCLE_MS = 5500

  // Build all moments from songs with lineVibes
  useEffect(() => {
    const moments: LyricMoment[] = []
    songs.forEach(song => {
      const lineVibes = (song as any).lineVibes as Record<string, string[]> | undefined
      if (!lineVibes || !song.srt) return
      const blocks = song.srt.trim().split(/\n\s*\n/)
      blocks.forEach((block, i) => {
        const parts = block.trim().split('\n')
        if (parts.length < 3) return
        const match = parts[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
        if (!match) return
        const toSec = (h: string, m: string, s: string, ms: string) =>
          parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
        const line = parts.slice(2).join(' ').trim()
        if (line.length < 5) return // skip very short filler
        const vibes = lineVibes[String(i)] || []
        if (vibes.length === 0) return
        moments.push({
          line, lineId: i,
          start: toSec(match[1], match[2], match[3], match[4]),
          end: toSec(match[5], match[6], match[7], match[8]),
          songId: song.id, songTitle: song.title, artist: song.artist,
          artwork: song.artwork, audioUrl: song.audioUrl, vibes,
        })
      })
    })
    // Shuffle
    for (let i = moments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moments[i], moments[j]] = [moments[j], moments[i]]
    }
    setAllMoments(moments)
  }, [songs])

  const getFiltered = useCallback((vibe: string) => {
    return vibe === 'ALL' ? allMoments : allMoments.filter(m => m.vibes.includes(vibe))
  }, [allMoments])

  // Initialize slots when moments or vibe changes
  const initSlots = useCallback((filtered: LyricMoment[]) => {
    const initial = filtered.slice(0, SLOT_COUNT)
    setSlots(initial.map((m, i) => i < initial.length ? m : null))
    // Staggered fade in
    setSlotVisible(Array(SLOT_COUNT).fill(false))
    initial.forEach((_, i) => {
      setTimeout(() => {
        setSlotVisible(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, i * 120)
    })
    slotQueueRef.current = 0
    vibePoolRef.current = [...filtered]
  }, [])

  useEffect(() => {
    if (allMoments.length === 0) return
    const filtered = getFiltered(activeVibe)
    initSlots(filtered)
  }, [allMoments, activeVibe, initSlots, getFiltered])

  // Start cycling
  useEffect(() => {
    if (cycleRef.current) clearInterval(cycleRef.current)
    if (focusedMoment) return

    cycleRef.current = setInterval(() => {
      const pool = vibePoolRef.current
      if (pool.length <= SLOT_COUNT) return

      const slotIdx = slotQueueRef.current % SLOT_COUNT
      slotQueueRef.current++

      // Pick a moment not currently shown
      setSlots(prev => {
        const currentIds = new Set(prev.map(m => m ? `${m.songId}_${m.lineId}` : ''))
        const candidates = pool.filter(m => !currentIds.has(`${m.songId}_${m.lineId}`))
        if (candidates.length === 0) return prev

        const next = candidates[Math.floor(Math.random() * candidates.length)]

        // Fade out that slot
        setSlotVisible(vis => {
          const nv = [...vis]
          nv[slotIdx] = false
          return nv
        })

        // After fade out completes, swap and fade in
        setTimeout(() => {
          setSlots(s => {
            const ns = [...s]
            ns[slotIdx] = next
            return ns
          })
          setTimeout(() => {
            setSlotVisible(vis => {
              const nv = [...vis]
              nv[slotIdx] = true
              return nv
            })
          }, 80)
        }, 650)

        return prev
      })
    }, CYCLE_MS)

    return () => { if (cycleRef.current) clearInterval(cycleRef.current) }
  }, [allMoments, activeVibe, focusedMoment])

  const playSnippet = useCallback((moment: LyricMoment) => {
    if (!moment.audioUrl) return
    const key = `${moment.songId}_${moment.lineId}`

    // Same card — pause and reset
    if (audioRef.current && playingKey === key) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
      setPlayingKey(null)
      stopPlayer()
      return
    }

    // Stop any existing audio globally
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    const audio = new Audio(moment.audioUrl)
    audioRef.current = audio
    audio.preload = 'auto'

    // Register with global manager so other players stop us

    const onLoaded = () => {
      audio.currentTime = moment.start
      audio.play().catch(() => {})
      setPlayingKey(key)
    }

    const onEnded = () => { setPlayingKey(null); stopPlayer() }
    audio.addEventListener('canplay', onLoaded, { once: true })
    audio.addEventListener('ended', onEnded, { once: true })
    audio.load()

    const snippetDuration = Math.min((moment.end - moment.start) * 1000 + 400, 9000)
    setTimeout(() => {
      if (audioRef.current === audio) {
        audio.pause()
        setPlayingKey(null)
        stopPlayer()
      }
    }, snippetDuration + 1500)
  }, [playingKey])

  const handleCardClick = (moment: LyricMoment) => {
    const filtered = getFiltered(activeVibe)
    const idx = filtered.findIndex(m => m.lineId === moment.lineId && m.songId === moment.songId)
    setFocusedIndex(idx >= 0 ? idx : 0)
    setFocusedMoment(moment)
    if (cycleRef.current) { clearInterval(cycleRef.current); cycleRef.current = null }
    playSnippet(moment)
  }

  const handleNext = () => {
    const filtered = getFiltered(activeVibe)
    const next = filtered[(focusedIndex + 1) % filtered.length]
    setFocusedIndex((focusedIndex + 1) % filtered.length)
    setFocusedMoment(next)
    playSnippet(next)
  }

  const handleBack = () => {
    const filtered = getFiltered(activeVibe)
    const prev = filtered[(focusedIndex - 1 + filtered.length) % filtered.length]
    setFocusedIndex((focusedIndex - 1 + filtered.length) % filtered.length)
    setFocusedMoment(prev)
    playSnippet(prev)
  }

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setFocusedMoment(null)
    setPlayingKey(null)
  }

  const handleVibe = (vibe: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setFocusedMoment(null)
    setPlayingKey(null)
    setActiveVibe(vibe)
  }

  const filtered = getFiltered(activeVibe)

  return (
    <section>
      <style>{`
        .lyric-card:hover {
          border-color: rgba(232,197,71,0.2) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        .snippet-btn:hover { background: rgba(232,197,71,0.22) !important; }
        .vibe-pill { transition: all 180ms ease; cursor: pointer; white-space: nowrap; }
        .vibe-pill:hover { border-color: rgba(232,197,71,0.4) !important; color: rgba(255,255,255,0.8) !important; }
        .focus-nav-btn:hover { border-color: rgba(255,255,255,0.2) !important; color: var(--text) !important; }

        /* Pill scroll — mobile single row */
        .vibe-pills-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .vibe-pills-scroll::-webkit-scrollbar { display: none; }

        /* Board grid — uniform row heights so cards never break frame */
        .board-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: minmax(140px, auto);
          gap: 12px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .board-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
        }
        /* Clamp long lyrics so they never overflow card */
        .lyric-text {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes focusIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ padding: '100px 16px 32px', width: '100%', maxWidth: '72rem', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Label */}
        <p style={{
          fontFamily: 'var(--font-lora), serif',
          fontSize: '0.5rem', fontWeight: 700,
          color: 'var(--text-3)',
          letterSpacing: '3px', textTransform: 'uppercase',
          marginBottom: '14px',
        }}>Discover by vibe</p>

        {/* Pills — horizontal scroll, no wrap */}
        <div className="vibe-pills-scroll" style={{ marginBottom: '24px' }}>
          {VIBES.map(v => (
            <button
              key={v}
              className="vibe-pill"
              onClick={() => handleVibe(v)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                background: activeVibe === v ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeVibe === v ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '50px',
                fontFamily: 'var(--font-lora), serif',
                fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: activeVibe === v ? 'var(--bg)' : 'rgba(255,255,255,0.4)',
              }}
            >{v}</button>
          ))}
        </div>

        {/* Board container — the "stage" */}
        <div className="board-stage" style={{
          background: 'rgba(232,197,71,0.025)',
          border: '1px solid rgba(232,197,71,0.22)',
          boxShadow: '0 0 0 1px rgba(232,197,71,0.08), inset 0 1px 0 rgba(232,197,71,0.08)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '0',
          minHeight: '340px',
          position: 'relative',
        }}>

          {filtered.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem' }}>
                No lines tagged for {activeVibe} yet.
              </p>
            </div>
          ) : focusedMoment ? (
            /* ── Focused mode ── */
            <div style={{ animation: 'focusIn 350ms ease forwards' }}>
              <div style={{
                padding: '32px 28px',
                background: 'rgba(232,197,71,0.04)',
                border: '1px solid rgba(232,197,71,0.18)',
                borderRadius: '16px',
                marginBottom: '16px',
                position: 'relative',
              }}>
                <button
                  onClick={handleClose}
                  style={{
                    position: 'absolute', top: '16px', right: '16px',
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.45)', fontSize: '1rem',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-lora), serif',
                  }}
                >×</button>

                <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                  {focusedMoment.artwork && (
                    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden' }}>
                      <Image src={focusedMoment.artwork} alt={focusedMoment.songTitle} fill style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: 'var(--font-lora), serif',
                      fontStyle: 'italic',
                      fontSize: 'clamp(1.1rem, 3vw, 1.55rem)',
                      fontWeight: 600, color: 'var(--text)',
                      lineHeight: 1.45, marginBottom: '12px',
                    }}>
                      &ldquo;{focusedMoment.line}&rdquo;
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-lora), serif',
                      fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)',
                      letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '18px',
                    }}>
                      {focusedMoment.songTitle} · {focusedMoment.artist} · {formatTime(focusedMoment.start)}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="snippet-btn"
                        onClick={() => playSnippet(focusedMoment)}
                        style={{
                          padding: '10px 20px',
                          background: playingKey === `${focusedMoment.songId}_${focusedMoment.lineId}` ? 'rgba(232,197,71,0.18)' : 'rgba(232,197,71,0.1)',
                          border: '1px solid rgba(232,197,71,0.3)',
                          borderRadius: '50px',
                          fontFamily: 'var(--font-lora), serif',
                          fontSize: '0.58rem', fontWeight: 700,
                          letterSpacing: '1px', textTransform: 'uppercase',
                          color: 'var(--gold)', cursor: 'pointer',
                          transition: 'background 200ms ease',
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                        }}
                      >
                        {playingKey === `${focusedMoment.songId}_${focusedMoment.lineId}` ? (
                          <>
                            <PlayPauseIcon playing={true} size={14} color="#E8C547" />
                            Pause
                          </>
                        ) : (
                          <>
                            <PlayPauseIcon playing={false} size={14} color="#E8C547" />
                            Play Snippet
                          </>
                        )}
                      </button>
                      <Link
                        href={`/music/player?id=${focusedMoment.songId}${focusedMoment.audioUrl ? '&au=' + encodeURIComponent(focusedMoment.audioUrl) : ''}&t=${Math.floor(focusedMoment.start)}`}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--gold)',
                          borderRadius: '50px',
                          fontFamily: 'var(--font-lora), serif',
                          fontSize: '0.58rem', fontWeight: 700,
                          letterSpacing: '1px', textTransform: 'uppercase',
                          color: 'var(--bg)', textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >Full Karaoke →</Link>
                    </div>
                  </div>
                </div>

                {/* Vibe tags */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {focusedMoment.vibes.map(v => (
                    <span key={v} style={{
                      padding: '3px 10px',
                      background: 'rgba(232,197,71,0.07)',
                      border: '1px solid rgba(232,197,71,0.18)',
                      borderRadius: '50px',
                      fontFamily: 'var(--font-lora), serif',
                      fontSize: '0.46rem', fontWeight: 700,
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      color: 'var(--gold)',
                    }}>{v}</span>
                  ))}
                </div>
              </div>

              {/* Back / Next */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="focus-nav-btn"
                  onClick={handleBack}
                  style={{
                    padding: '10px 28px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.58rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                    transition: 'all 180ms ease',
                  }}
                >← Back</button>
                <button
                  className="focus-nav-btn"
                  onClick={handleNext}
                  style={{
                    padding: '10px 28px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.58rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                    transition: 'all 180ms ease',
                  }}
                >Next →</button>
              </div>
            </div>
          ) : (
            /* ── Cycling board ── */
            <div className="board-grid">
              {slots.map((moment, idx) =>
                moment ? (
                  <LyricCard
                    key={`${moment.songId}_${moment.lineId}_${idx}`}
                    moment={moment}
                    visible={slotVisible[idx]}
                    isPlaying={playingKey === `${moment.songId}_${moment.lineId}`}
                    onClick={() => handleCardClick(moment)}
                    onPlay={(e) => { e.stopPropagation(); playSnippet(moment) }}
                  />
                ) : (
                  <div key={`empty_${idx}`} style={{ minHeight: '150px', borderRadius: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Song Preview Sheet ───────────────────────────────────────────────
function SongPreview({ song, onClose, resonated, onResonate, resonateCount }: {
  song: Song; onClose: () => void; resonated: boolean; onResonate: (id: string) => void; resonateCount: number
}) {
  const { lines } = useSharedLines(song.title, song.artist)
  const isActive = song.status === 'live' || song.status === 'active'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(7,6,10,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeInOverlay 250ms ease forwards' }}>
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .play-btn:hover { transform: scale(1.04); box-shadow: 0 8px 36px rgba(232,197,71,0.4) !important; }
        .close-btn:hover { background: rgba(255,255,255,0.1) !important; }
        .shared-line-row:hover { background: rgba(232,197,71,0.06) !important; border-color: rgba(232,197,71,0.2) !important; }
        @media (min-width: 1024px) { .preview-sheet { border-radius: 20px; max-width: 520px; margin: auto; max-height: 85vh; } .preview-wrap { align-items: center; } }
      `}</style>
      <div className="preview-wrap" onClick={onClose} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className="preview-sheet" onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)', border: '1px solid rgba(255,255,255,0.08)', width: '100%', overflowY: 'auto', position: 'relative', animation: 'slideUp 320ms cubic-bezier(0.34,1.56,0.64,1) forwards', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ padding: '20px 28px 40px' }}>
            <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', fontFamily: 'var(--font-lora), serif' }}>×</button>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
              {song.artwork && (
                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', lineHeight: 1.2 }}>{song.title}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '16px', letterSpacing: '0.5px' }}>{song.artist}</p>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <SmallStatBlock value={song.plays || 0} label="Plays" />
                  <SmallStatBlock value={resonateCount} label="Resonates" />
                  <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(232,197,71,0.3)' }}>
                    <SmallStatBlock value={song.lyricUses || 0} label="Lyric Uses" gold />
                  </div>
                </div>
              </div>
            </div>
            {lines[0] && (
              <div style={{ padding: '16px 20px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.65 }}>&ldquo;{lines[0].line}&rdquo;</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '10px' }}>Most shared line · {lines[0].uses} {lines[0].uses === 1 ? 'use' : 'uses'}</p>
              </div>
            )}
            <button onClick={() => onResonate(song.id)} style={{ width: '100%', padding: '14px', background: resonated ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (resonated ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.1)'), borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms ease', color: resonated ? 'var(--gold)' : 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>{resonated ? '♥' : '♡'} Resonate</button>
            {isActive ? (
              <Link href={`/music/player?id=${song.id}${song.audioUrl ? '&au=' + encodeURIComponent(song.audioUrl) : ''}`} className="play-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 28px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'none', minHeight: '52px', transition: 'all 200ms ease', boxShadow: '0 6px 28px rgba(232,197,71,0.28)' }}>▶ Play Now</Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-3)', minHeight: '52px' }}>{song.comingSoonLabel || 'Coming Soon'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Song Card ────────────────────────────────────────────────────────
function SongCard({ song, onPreview }: { song: Song; onPreview: (song: Song) => void }) {
  const isActive = song.status === 'live' || song.status === 'active'
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <div style={{ cursor: 'pointer' }} className="song-card-wrap" onClick={() => onPreview(song)} onTouchStart={() => { pressTimer.current = setTimeout(() => onPreview(song), 500) }} onTouchEnd={() => { if (pressTimer.current) clearTimeout(pressTimer.current) }} onTouchMove={() => { if (pressTimer.current) clearTimeout(pressTimer.current) }}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        {song.artwork ? (
          <Image className="song-card-img" src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover', transition: 'transform 400ms ease' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
        )}
        <div className="song-card-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,10,0.92) 0%, rgba(7,6,10,0.4) 60%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '16px', opacity: 0, transition: 'opacity 250ms ease' }}>
          {isActive ? (
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'var(--bg)', boxShadow: '0 4px 20px rgba(232,197,71,0.4)', marginBottom: '8px' }}>▶</div>
          ) : (
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', padding: '5px 12px', border: '1px solid rgba(232,197,71,0.3)', borderRadius: '50px', background: 'rgba(232,197,71,0.08)', marginBottom: '8px' }}>{song.comingSoonLabel || 'Coming Soon'}</span>
          )}
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>View Details</p>
        </div>
        {!isActive && <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,6,10,0.5)', filter: 'grayscale(60%)' }} />}
      </div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-3)', marginBottom: '3px', lineHeight: 1.3 }}>{song.title}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '8px' }}>{song.artist}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', color: 'var(--text-3)' }}>{formatNum(song.plays || 0)} plays</span>
        {isActive && song.lyricUses ? (
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--gold)' }}>{formatNum(song.lyricUses)} lyric uses</span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function MusicPage() {
  const { songs, loading } = useSongs()
  const [preview, setPreview] = useState<Song | null>(null)
  const [search, setSearch] = useState('')

  const [songResonateCounts, setSongResonateCounts] = useState<Record<string, number>>({})
  const [resonatedSongs, setResonatedSongs] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('margoSongResonated') || '[]')) } catch { return new Set() }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const myId = (localStorage.getItem('margoAnonName') || 'anon').replace(/[.#$[\]]/g, '_')
    let unsub: (() => void) | null = null
    import('firebase/database').then(({ ref: dbRef, onValue: dbOnValue, getDatabase }) => {
      import('@/lib/firebase').then(({ app }) => {
        const db2 = getDatabase(app ?? undefined)
        unsub = dbOnValue(dbRef(db2, 'songResonates'), (snap) => {
          const data = snap.val() || {}
          const myResonated = new Set<string>()
          Object.keys(data).forEach(sid => { if (data[sid]?.[myId]) myResonated.add(sid) })
          const counts: Record<string, number> = {}
          Object.keys(data).forEach(sid => { counts[sid] = Object.keys(data[sid] || {}).length })
          setSongResonateCounts(counts)
          setResonatedSongs(myResonated)
          try { localStorage.setItem('margoSongResonated', JSON.stringify([...myResonated])) } catch {}
        })
      })
    }).catch(() => {})
    return () => { unsub?.() }
  }, [])

  const toggleSongResonate = useCallback((songId: string) => {
    if (typeof window === 'undefined') return
    const myId = (localStorage.getItem('margoAnonName') || 'anon').replace(/[.#$[\]]/g, '_')
    const already = resonatedSongs.has(songId)
    setResonatedSongs(prev => {
      const next = new Set(prev)
      already ? next.delete(songId) : next.add(songId)
      try { localStorage.setItem('margoSongResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    import('firebase/database').then(({ ref: dbRef, set: dbSet, remove: dbRemove, getDatabase }) => {
      import('@/lib/firebase').then(({ app }) => {
        const db2 = getDatabase(app ?? undefined)
        const songResonateRef = dbRef(db2, `songResonates/${songId}/${myId}`)
        already ? dbRemove(songResonateRef) : dbSet(songResonateRef, true)
      })
    }).catch(() => {})
  }, [resonatedSongs])

  const featuredSong = songs.length
    ? songs.reduce((a, b) => ((b.lyricUses || 0) > (a.lyricUses || 0) ? b : a))
    : null

  const filteredSongs = songs
    .filter(s => s.id !== featuredSong?.id)
    .filter(s => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q))
    })

  const { lines: sharedLines } = useSharedLines(featuredSong?.title, featuredSong?.artist)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MargoNav />
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .song-card-wrap { transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .song-card-wrap:hover { transform: translateY(-6px); }
        .song-card-wrap:hover .song-card-overlay { opacity: 1 !important; }
        .song-card-wrap:hover .song-card-img { transform: scale(1.06); }
        .play-btn:hover { transform: scale(1.04); box-shadow: 0 8px 36px rgba(232,197,71,0.4) !important; }
        .shared-line-row:hover { background: rgba(232,197,71,0.06) !important; border-color: rgba(232,197,71,0.2) !important; }
        .music-search:focus { border-color: rgba(232,197,71,0.4) !important; outline: none; }
      `}</style>

      <MargoNav />

      {preview && (
        <SongPreview
          song={preview}
          onClose={() => setPreview(null)}
          resonated={resonatedSongs.has(preview.id)}
          onResonate={toggleSongResonate}
          resonateCount={songResonateCounts[preview.id] || 0}
        />
      )}

      {/* ── Lyric Discovery Board ── */}
      <LyricBoard songs={songs} />

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)', margin: '40px 16px 0' }} />

      {/* ── Hero — Featured Song ── */}
      {featuredSong && (
        <section style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 16px' }}>
          {/* Artwork — clean, no overlay text */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', minHeight: '280px', borderRadius: '20px 20px 0 0', overflow: 'hidden', marginBottom: '0' }}>
            {featuredSong.artwork ? (
              <Image src={featuredSong.artwork} alt={featuredSong.title} fill style={{ objectFit: 'cover', objectPosition: 'center top' }} priority />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.02))' }} />
            )}
            {/* Subtle bottom fade only — no text on top */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(7,6,10,0.6) 0%, transparent 100%)' }} />
            {/* Featured badge top-left */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '5px 14px', background: 'rgba(7,6,10,0.7)', border: '1px solid rgba(232,197,71,0.35)', borderRadius: '50px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.48rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '2.5px', textTransform: 'uppercase', margin: 0 }}>Featured</p>
            </div>
          </div>

          {/* Info block — below the artwork, clean */}
          <div style={{
            background: 'linear-gradient(to bottom, rgba(20,17,28,0.97), rgba(14,12,18,0.99))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTop: 'none',
            borderRadius: '0 0 20px 20px',
            padding: '24px 28px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(1.5rem, 4vw, 2.6rem)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1, marginBottom: '4px' }}>{featuredSong.title}</h2>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{featuredSong.artist}</p>
              </div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingTop: '4px' }}>
                <StatBlock value={featuredSong.plays || 0} label="Plays" />
                <StatBlock value={songResonateCounts[featuredSong.id] || 0} label="Resonates" />
                {(featuredSong.lyricUses || 0) > 0 && (
                  <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(232,197,71,0.25)' }}>
                    <StatBlock value={featuredSong.lyricUses || 0} label="Lyric Uses" gold />
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href={`/music/player?id=${featuredSong.id}${featuredSong.audioUrl ? '&au=' + encodeURIComponent(featuredSong.audioUrl) : ''}`} className="play-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 6px 28px rgba(232,197,71,0.28)', transition: 'all 200ms ease' }}>▶ Play Now</Link>
              <button onClick={() => toggleSongResonate(featuredSong.id)} style={{ padding: '12px 20px', background: resonatedSongs.has(featuredSong.id) ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (resonatedSongs.has(featuredSong.id) ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.15)'), borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms ease', color: resonatedSongs.has(featuredSong.id) ? 'var(--gold)' : 'rgba(255,255,255,0.7)' }}>{resonatedSongs.has(featuredSong.id) ? '♥' : '♡'} Resonate</button>
              <button onClick={() => setPreview(featuredSong)} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', transition: 'all 200ms ease' }}>Details</button>
            </div>
          </div>
        </section>
      )}

      {/* ── Most Shared Lines ── */}
      {featuredSong && sharedLines.length > 0 && (
        <section style={{ padding: '48px 16px', maxWidth: '72rem', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
            Most shared lines — {featuredSong.title}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sharedLines.map((lyric) => (
              <Link key={lyric.id} href="/compose" style={{ textDecoration: 'none' }}>
                <div className="shared-line-row" style={{ padding: '18px 22px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', transition: 'all 200ms ease', cursor: 'pointer' }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6 }}>&ldquo;{lyric.line}&rdquo;</p>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', margin: 0 }}>{lyric.uses}</p>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', color: 'var(--gold)', opacity: 0.6, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>uses</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 16px' }} />

      {/* ── More Songs ── */}
      {songs.length > 1 && (
        <section style={{ padding: '48px 16px', maxWidth: '72rem', margin: '0 auto' }}>
          <style>{`
            .more-songs-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
              gap: 24px;
            }
            @media (max-width: 480px) {
              .more-songs-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 16px !important;
              }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>More Songs</p>
            <input className="music-search" type="text" placeholder="Search songs…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '10px 20px', width: '200px', transition: 'border-color 200ms ease' }} />
          </div>
          {filteredSongs.length === 0 && search && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '48px' }}>No songs found for &ldquo;{search}&rdquo;</p>
          )}
          <div className="more-songs-grid">
            {filteredSongs.map(song => (
              <SongCard key={song.id} song={song} onPreview={setPreview} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
