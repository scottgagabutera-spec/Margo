'use client'
import { ShareIcon, CardIcon } from '@/components/icons'
import { BackButton } from '@/components/back-button'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSong } from '@/hooks/useSong'
import { useSongs } from '@/hooks/useSongs'
import { Song } from '@/hooks/useSongs'
import { CardExportModal } from '@/components/card-export-modal'
import { KaraokeUpNextTray } from '@/components/karaoke-up-next'
import { SongMeta } from '@/components/song-meta'
import { useAudioEngine, useAudioCurrentTime } from '@/hooks/useAudioEngine'
import { playFull, togglePlayPause, stop, playFullSeek, setQueue, fullSongToQueueItem, isFullQueueItem, getAudioEngineState, getQueueNavigationState, switchToFullSong } from '@/lib/audio-engine'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AtmosphereLayer } from '@/components/atmosphere-layer'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'

interface LyricLine {
  id: number
  line: string
  start: number
  end: number
}

// This is the permanent canonical content route for a song — /song/[id].
// Unlike the old /music/player?id=&au= page, everything the page needs
// (title, artist, audio URL, lyrics) comes from useSong(id) via the path
// param alone. No audio URL travels through the URL anymore, and there's
// no Suspense boundary needed since useParams() (unlike useSearchParams())
// doesn't require one.
//
// The optional ?t=<seconds> query param is still supported for deep
// links from search results (jump straight to a matching lyric line on
// load) — that's the one case where a query param still earns its
// place, since it's a transient "where to start," not part of the
// route's identity.
export default function SongPage() {
  const params = useParams()
  const songId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string | undefined
  const searchParams = useSearchParams()
  const startAtParam = searchParams.get('t')
  const router = useRouter()
  const { song, lyrics, loading } = useSong(songId ?? null)
  const { songs } = useSongs()
  const { requireAuth } = useAuthGate()

  // ── Engine state ─────────────────────────────────────────────────
  const engineState = useAudioEngine()
  const currentTime = useAudioCurrentTime()
  const isPlaying = engineState.playing && engineState.songId === songId
  const isBuffering = engineState.buffering && engineState.songId === songId

  const duration = song?.durationSec || 180

  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [cardExportOpen, setCardExportOpen] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [trayDismissed, setTrayDismissed] = useState(false)
  const [showTapOverlay, setShowTapOverlay] = useState(true)
  const [songEnded, setSongEnded] = useState(false)
  const [endedTitle, setEndedTitle] = useState('')
  const audioUrl = song?.audioUrl
  const songTitle = song?.title || ''
  const songArtist = song?.artist || ''
  const songArtwork = song?.artwork ?? null

  const lyricRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const autoNavRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track which songId we've already issued playFull for — prevents end-state boolean logic
  const playedSongIdRef = useRef<string | null>(null)
  // Only honor the ?t= deep link once per page load, not on every render
  const startAtAppliedRef = useRef(false)
  /** True once playback has passed mid-song — distinguishes natural end from pause-at-start. */
  const reachedEndZoneRef = useRef(false)

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

  const navigateToSong = useCallback((s: Song) => {
    if (autoNavRef.current) clearTimeout(autoNavRef.current)
    if (s.audioUrl) {
      switchToFullSong({
        id: s.id,
        audioUrl: s.audioUrl,
        title: s.title,
        artist: s.artist,
        artwork: s.artwork ?? null,
        atmosphere: livingAtmosphereOrNull(s.atmosphere),
      })
    }
    router.replace(`/song/${s.id}`)
  }, [router])

  // ─── Reset on song change (skip stop when session queue advanced here) ─
  useEffect(() => {
    const st = getAudioEngineState()
    const fromSessionQueue = st.mode === 'full' && st.songId === songId

    if (fromSessionQueue) {
      playedSongIdRef.current = songId
      startAtAppliedRef.current = true
      reachedEndZoneRef.current = false
      setCurrentLyricIndex(0)
      setSongEnded(false)
      setTrayOpen(false)
      setTrayDismissed(false)
      setShowTapOverlay(false)
      return
    }

    stop()
    playedSongIdRef.current = null
    startAtAppliedRef.current = false
    reachedEndZoneRef.current = false
    setCurrentLyricIndex(0)
    setSongEnded(false)
    setTrayOpen(false)
    setTrayDismissed(false)
    setShowTapOverlay(true)
  }, [songId])

  const startPlayback = useCallback(() => {
    if (!requireAuth()) return
    if (!songId || !audioUrl) return
    setShowTapOverlay(false)
    playedSongIdRef.current = songId
    const startSec = !startAtAppliedRef.current && startAtParam ? Number(startAtParam) || 0 : 0
    startAtAppliedRef.current = true

    // Seed session queue: this track + catalog Up Next (full items only).
    const items = [
      fullSongToQueueItem({
        id: songId,
        audioUrl,
        title: songTitle,
        artist: songArtist,
        artwork: songArtwork,
        atmosphere: livingAtmosphereOrNull(song?.atmosphere),
      }),
      ...nextSongs
        .filter((s) => !!s.audioUrl)
        .map((s) =>
          fullSongToQueueItem({
            id: s.id,
            audioUrl: s.audioUrl!,
            title: s.title,
            artist: s.artist,
            artwork: s.artwork ?? null,
            atmosphere: livingAtmosphereOrNull(s.atmosphere),
          }),
        ),
    ]
    setQueue(items, 0)

    void playFull({
      songId,
      audioUrl,
      title: songTitle,
      artist: songArtist,
      artwork: songArtwork,
      startSec,
      autoplay: true,
      source: 'karaoke',
      atmosphere: livingAtmosphereOrNull(song?.atmosphere),
    })
  }, [requireAuth, audioUrl, songId, songArtist, songArtwork, songTitle, startAtParam, nextSongs, song?.atmosphere])

  // Follow engine → URL only when the engine advances (auto next).
  // Do not yank the user back if they picked a different song while one is playing.
  const lastEngineSongRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const engineSong = engineState.songId
    const prevEngineSong = lastEngineSongRef.current
    lastEngineSongRef.current = engineSong
    if (prevEngineSong === undefined) return
    const engineMoved = prevEngineSong !== engineSong
    if (engineState.mode !== 'full' || !engineSong) return
    if (engineSong === songId) return
    if (!engineMoved) return
    const inQueue = engineState.queue.some(
      (i) => isFullQueueItem(i) && i.songId === engineSong,
    )
    if (inQueue) {
      if (autoNavRef.current) clearTimeout(autoNavRef.current)
      router.replace(`/song/${engineSong}`)
    }
  }, [engineState.songId, engineState.mode, engineState.queue, songId, router])

  // After Play & Lyrics starts this track, attach catalog Up Next to the queue.
  useEffect(() => {
    if (!songId) return
    const st = getAudioEngineState()
    if (st.mode !== 'full' || st.songId !== songId) return
    const have = new Set(
      st.queue.filter(isFullQueueItem).map((i) => i.songId),
    )
    const extras = nextSongs
      .filter((s) => !!s.audioUrl && !have.has(s.id))
      .map((s) =>
        fullSongToQueueItem({
          id: s.id,
          audioUrl: s.audioUrl!,
          title: s.title,
          artist: s.artist,
          artwork: s.artwork ?? null,
          atmosphere: livingAtmosphereOrNull(s.atmosphere),
        }),
      )
    if (extras.length === 0) return
    setQueue([...st.queue, ...extras], st.queueIndex)
  }, [songId, nextSongs])

  // ─── Detect natural end when nothing left in session queue (D4 stop) ─
  useEffect(() => {
    if (duration > 0 && currentTime > duration * 0.5) {
      reachedEndZoneRef.current = true
    }
  }, [currentTime, duration, songId])

  useEffect(() => {
    if (songEnded || !songId) return
    if (engineState.mode !== 'full' || engineState.playing) return
    if (engineState.songId !== songId) return
    if (playedSongIdRef.current !== songId) return
    if (!reachedEndZoneRef.current) return
    const { canNext } = getQueueNavigationState(engineState.queue, engineState.queueIndex)
    // onended resets currentTime/progress to 0 while staying in full mode
    if (!canNext && engineState.progress === 0 && engineState.currentTime === 0) {
      setSongEnded(true)
      setEndedTitle(song?.title || '')
      setTrayOpen(true)
    }
  }, [
    engineState.mode,
    engineState.playing,
    engineState.songId,
    engineState.progress,
    engineState.currentTime,
    engineState.queue,
    engineState.queueIndex,
    songId,
    songEnded,
    song,
  ])

  // ─── 15-second early tray trigger ──────────────────────────────────
  useEffect(() => {
    if (trayDismissed || trayOpen || songEnded) return
    const remaining = duration - currentTime
    if (remaining > 0 && remaining <= 15 && isPlaying) {
      setTrayOpen(true)
    }
  }, [currentTime, duration, trayDismissed, trayOpen, songEnded, isPlaying])

  // (Auto-advance is engine queueNext on full onended — no router timer.)

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
      // Seek via engine — no direct audioRef access
      playFullSeek(lyric.start)
      setCurrentLyricIndex(id)
      setTrayOpen(false)
      setTrayDismissed(true)
      setSongEnded(false)
      if (autoNavRef.current) clearTimeout(autoNavRef.current)
    }
  }, [lyrics, duration])

  const handleLoop = useCallback(() => {
    playFullSeek(0)
    setCurrentLyricIndex(0)
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
  // start/end are the currently-playing lyric line's exact real timing —
  // passing them through means compose can skip snippet-matching
  // entirely for this entry point and store them as-is.
  const composeUrl = `/compose?lyric=${encodeURIComponent(currentLyric?.line || '')}&song=${encodeURIComponent(song?.title || '')}&artist=${encodeURIComponent(song?.artist || '')}&artwork=${encodeURIComponent(song?.artwork || '')}&songId=${encodeURIComponent(songId || '')}&audioUrl=${encodeURIComponent(song?.audioUrl || '')}&start=${currentLyric?.start ?? ''}&end=${currentLyric?.end ?? ''}&phase=moment&source=karaoke`

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {showTapOverlay && (
        <div
          onClick={() => void startPlayback()}
          className="margo-tap-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px var(--gold-glow)', marginBottom: '20px' }}>
            <PlayPauseIcon playing={false} size={28} color="var(--bg)" />
          </div>
          <p style={{ fontFamily: UI_FONT, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Tap to play</p>
        </div>
      )}
      <style>{`
        .lyric-viewport::-webkit-scrollbar { display: none; }
        .lyric-viewport { -ms-overflow-style: none; scrollbar-width: none; }
        .lyric-line-wrap { width: 100%; min-height: var(--margo-touch-min); display: flex; align-items: center; justify-content: center; padding: 10px 0; cursor: pointer; border: none; background: none; box-sizing: border-box; }
        .lyric-line-wrap:focus { outline: none; }
        .lyric-text { font-family: var(--font-lora), serif; font-style: italic; text-align: center; margin: 0; line-height: 1.4; transition: color 500ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1), transform 500ms cubic-bezier(0.4,0,0.2,1), font-size 500ms cubic-bezier(0.4,0,0.2,1); will-change: transform, opacity; }
        .share-sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(7,6,10,0.92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: ss-fade 200ms ease forwards; }
        @media (max-width: 639px) {
          .share-sheet-overlay { background: var(--margo-scrim) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        }
        .share-sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; background: var(--surface); border-top: 1px solid var(--gold-border); border-radius: 24px 24px 0 0; padding: 28px 20px var(--margo-player-share-sheet-padding-bottom); animation: ss-up 300ms cubic-bezier(0.32,0.72,0,1) forwards; }
        @keyframes ss-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ss-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .share-pill { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin: 0 auto 24px; }
        .share-option { width: 100%; padding: 16px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: background 150ms ease, border-color 150ms ease; text-decoration: none; margin-bottom: 10px; }
        .share-option:hover, .share-option:active { background: var(--gold-faint); border-color: var(--gold-border); }
      `}</style>

      {/* Atmosphere room. Still is a faint wash; living rooms mount only while playing. */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <AtmosphereLayer variant="karaoke" songId={songId} />
      </div>

      {/* Top progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '2px', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 100ms linear' }} />
      </div>

      {/* Header — immersive Mode B: shell chrome is hidden; this is the only top exit */}
      <header style={{ position: 'fixed', top: '8px', left: 0, right: 0, zIndex: 40, padding: '16px 24px' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton fallbackHref="/discover" />
          <div style={{ textAlign: 'center', minWidth: 0, flex: 1, padding: '0 8px' }}>
            <SongMeta
              title={song?.title}
              artist={song?.artist}
              aiGenerated={!!song?.isAiGenerated}
              titleStyle={{ justifyContent: 'center' }}
              artistStyle={{ textAlign: 'center' }}
            />
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
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem', textAlign: 'center', marginTop: '-40vh' }}>No lyrics available yet.</p>
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
          <p style={{ fontFamily: UI_FONT, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', margin: 0, opacity: 0.7 }}>Tap any line to jump</p>
        </div>
      )}

      {trayOpen && (
        <KaraokeUpNextTray
          songEnded={songEnded}
          endedTitle={endedTitle}
          songs={nextSongs}
          onPlaySong={navigateToSong}
          onLoop={handleLoop}
          onClose={handleDismiss}
        />
      )}

      {/* Bottom controls — hidden when tray open */}
      {!trayOpen && (
        <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'linear-gradient(to top, var(--bg) 75%, transparent)', padding: '20px 24px var(--margo-player-footer-padding-bottom)' }}>
          <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                if (engineState.mode === 'idle' || engineState.songId !== songId) {
                  void startPlayback()
                } else {
                  void togglePlayPause()
                }
              }}
              style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border-hi)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', flexShrink: 0, outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            ><PlayPauseIcon playing={isPlaying} buffering={isBuffering} size={20} color="var(--text)" /></button>
            <button
              onClick={() => setShareOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px 32px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', minHeight: '52px', boxShadow: '0 6px 28px var(--gold-glow)', transition: 'all 150ms ease' }}
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
            <p style={{ fontFamily: LYRIC_FONT, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text)', textAlign: 'center', marginBottom: '16px', lineHeight: 1.45 }}>"{currentLyric?.line}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto 24px', maxWidth: '280px' }}>
              <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)' }}>
                {song?.artwork ? (
                  <Image src={song.artwork} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--gold-faint)' }} />
                )}
              </div>
              <SongMeta title={song?.title} artist={song?.artist} aiGenerated={!!song?.isAiGenerated} />
            </div>
            <Link href={composeUrl} className="share-option" onClick={() => setShareOpen(false)}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShareIcon size={20} color="var(--gold)" />
              </div>
              <div>
                <p style={{ fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>Send a line</p>
                <p style={{ fontFamily: UI_FONT, fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>Send this line to someone</p>
              </div>
            </Link>
            <button
              className="share-option"
              onClick={() => {
                if (!requireAuth()) return
                setShareOpen(false)
                setTimeout(() => setCardExportOpen(true), 180)
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CardIcon size={20} color="var(--text)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', margin: 0 }}>Share as Card</p>
                <p style={{ fontFamily: UI_FONT, fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>Export a lyric card — choose theme, shape, save or share</p>
              </div>
            </button>
            <button onClick={() => setShareOpen(false)} style={{ width: '100%', padding: '16px', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI_FONT, fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Cancel</button>
          </div>
        </>
      )}

      <CardExportModal
        open={cardExportOpen}
        onOpenChange={setCardExportOpen}
        lyric={currentLyric?.line || ''}
        song={song?.title || ''}
        artist={song?.artist || ''}
        artwork={song?.artwork || null}
      />
    </div>
  )
}