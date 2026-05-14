'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MargoNav } from '@/components/margo-nav'
import { useSongs, Song } from '@/hooks/useSongs'
import { useSharedLines } from '@/hooks/useSharedLines'

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// ─── Stat block — number + label always centered as a unit ───────────
function StatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 700,
        color: gold ? 'var(--gold)' : 'var(--text)', lineHeight: 1, margin: 0,
      }}>{formatNum(value)}</p>
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700,
        color: gold ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
        letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px',
        opacity: gold ? 0.7 : 1,
      }}>{label}</p>
    </div>
  )
}

// ─── Small stat block for preview sheet ──────────────────────────────
function SmallStatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '1rem', fontWeight: 700,
        color: gold ? 'var(--gold)' : 'var(--text)', margin: 0,
      }}>{formatNum(value)}</p>
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700,
        color: gold ? 'var(--gold)' : 'var(--text-3)',
        letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px',
        opacity: gold ? 0.7 : 1,
      }}>{label}</p>
    </div>
  )
}

function SongPreview({
  song, onClose, resonated, onResonate, resonateCount
}: {
  song: Song; onClose: () => void; resonated: boolean; onResonate: (id: string) => void; resonateCount: number
}) {
  const { lines } = useSharedLines(song.title, song.artist)
  const isActive = song.status === 'live' || song.status === 'active'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(7,6,10,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeInOverlay 250ms ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .play-btn:hover { transform: scale(1.04); box-shadow: 0 8px 36px rgba(232,197,71,0.4) !important; }
        .close-btn:hover { background: rgba(255,255,255,0.1) !important; }
        .shared-line-row:hover { background: rgba(232,197,71,0.06) !important; border-color: rgba(232,197,71,0.2) !important; }
        @media (min-width: 640px) {
          .preview-sheet { border-radius: 20px 20px 0 0; max-height: 90vh; }
        }
        @media (min-width: 1024px) {
          .preview-sheet { border-radius: 20px; max-width: 520px; margin: auto; max-height: 85vh; }
          .preview-wrap { align-items: center; }
        }
      `}</style>

      <div
        className="preview-wrap"
        onClick={onClose}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <div
          className="preview-sheet"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            width: '100%', overflowY: 'auto', position: 'relative',
            animation: 'slideUp 320ms cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
          </div>

          <div style={{ padding: '20px 28px 40px' }}>
            {/* Close */}
            <button
              className="close-btn"
              onClick={onClose}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease', fontFamily: 'var(--font-lora), serif',
              }}
            >×</button>

            {/* Artwork + info */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
              {song.artwork && (
                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', lineHeight: 1.2 }}>{song.title}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '16px', letterSpacing: '0.5px' }}>{song.artist}</p>
                {/* Stats centered as units */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <SmallStatBlock value={song.plays || 0} label="Plays" />
                  <SmallStatBlock value={resonateCount} label="Resonates" />
                  <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(232,197,71,0.3)' }}>
                    <SmallStatBlock value={song.lyricUses || 0} label="Lyric Uses" gold />
                  </div>
                </div>
              </div>
            </div>

            {/* Top shared line */}
            {lines[0] && (
              <div style={{ padding: '16px 20px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.65 }}>
                  &ldquo;{lines[0].line}&rdquo;
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '10px' }}>
                  Most shared line · {lines[0].uses} {lines[0].uses === 1 ? 'use' : 'uses'}
                </p>
              </div>
            )}

            {/* Resonate button */}
            <button
              onClick={() => onResonate(song.id)}
              style={{
                width: '100%', padding: '14px',
                background: resonated ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (resonated ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.1)'),
                borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px',
                textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms ease',
                color: resonated ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                marginBottom: '12px',
              }}
            >{resonated ? '♥' : '♡'} Resonate</button>

            {/* CTA */}
            {isActive ? (
              <Link href={`/music/player?id=${song.id}${song.audioUrl ? '&au=' + encodeURIComponent(song.audioUrl) : ''}`} className="play-btn" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '16px 28px', background: 'var(--gold)', color: 'var(--bg)',
                borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px',
                textTransform: 'uppercase', textDecoration: 'none',
                minHeight: '52px', transition: 'all 200ms ease',
                boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
              }}>▶ Play Now</Link>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px 28px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px',
                fontFamily: 'var(--font-lora), serif', fontWeight: 700,
                fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--text-3)', minHeight: '52px',
              }}>{song.comingSoonLabel || 'Coming Soon'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SongCard({ song, onPreview }: { song: Song; onPreview: (song: Song) => void }) {
  const isActive = song.status === 'live' || song.status === 'active'
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div
      style={{ cursor: 'pointer' }}
      className="song-card-wrap"
      onClick={() => onPreview(song)}
      onTouchStart={() => { pressTimer.current = setTimeout(() => onPreview(song), 500) }}
      onTouchEnd={() => { if (pressTimer.current) clearTimeout(pressTimer.current) }}
      onTouchMove={() => { if (pressTimer.current) clearTimeout(pressTimer.current) }}
    >
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        {song.artwork ? (
          <Image
            className="song-card-img"
            src={song.artwork} alt={song.title} fill
            style={{ objectFit: 'cover', transition: 'transform 400ms ease' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
        )}
        <div className="song-card-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(7,6,10,0.92) 0%, rgba(7,6,10,0.4) 60%, transparent 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          padding: '16px', opacity: 0, transition: 'opacity 250ms ease',
        }}>
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

export default function MusicPage() {
  const { songs, loading } = useSongs()
  const [preview, setPreview] = useState<Song | null>(null)
  const [search, setSearch] = useState('')

  // ─── Per-user song resonates — single source of truth from Firebase ──
  const [songResonateCounts, setSongResonateCounts] = useState<Record<string, number>>({})
  const [resonatedSongs, setResonatedSongs] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('margoSongResonated') || '[]')) } catch { return new Set() }
  })

  // Load from Firebase on mount — one listener, no duplicates
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
          Object.keys(data).forEach(sid => {
            if (data[sid]?.[myId]) myResonated.add(sid)
          })
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
    // Optimistic update
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

  const { lines: sharedLines, loading: linesLoading } = useSharedLines(featuredSong?.title, featuredSong?.artist)

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

      {/* ── Hero — Featured Song ── */}
      {featuredSong && (
        <section style={{ position: 'relative', height: '88vh', minHeight: '560px', overflow: 'hidden' }}>
          {featuredSong.artwork ? (
            <div style={{ position: 'absolute', inset: 0 }}>
              <Image src={featuredSong.artwork} alt={featuredSong.title} fill style={{ objectFit: 'cover', objectPosition: 'center top' }} priority />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #07060A 0%, rgba(7,6,10,0.8) 40%, rgba(7,6,10,0.2) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(7,6,10,0.7) 0%, transparent 60%)' }} />
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(232,197,71,0.08) 0%, rgba(7,6,10,1) 70%)' }} />
          )}

          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 56px', maxWidth: '72rem', margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '14px', opacity: 0.85 }}>Featured</p>
            <h1 style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: 'clamp(2.8rem, 9vw, 6.5rem)', fontWeight: 400, color: 'var(--text)', lineHeight: 1.02, marginBottom: '10px', letterSpacing: '-0.02em' }}>
              {featuredSong.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', color: 'rgba(255,255,255,0.65)', fontWeight: 400, marginBottom: '28px' }}>{featuredSong.artist}</p>

            {/* Stats — centered as units */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '36px' }}>
              <StatBlock value={featuredSong.plays || 0} label="Plays" />
              <StatBlock value={songResonateCounts[featuredSong.id] || 0} label="Resonates" />
              <div style={{ paddingLeft: '28px', borderLeft: '1px solid rgba(232,197,71,0.3)' }}>
                <StatBlock value={featuredSong.lyricUses || 0} label="Lyric Uses" gold />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`/music/player?id=${featuredSong.id}${featuredSong.audioUrl ? '&au=' + encodeURIComponent(featuredSong.audioUrl) : ''}`}
                className="play-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '16px 36px', background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                  fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px',
                  textTransform: 'uppercase', textDecoration: 'none',
                  minHeight: '52px', width: 'fit-content',
                  boxShadow: '0 6px 28px rgba(232,197,71,0.3)', transition: 'all 200ms ease',
                }}
              >▶ Play Now</Link>

              <button
                onClick={() => toggleSongResonate(featuredSong.id)}
                style={{
                  padding: '16px 28px',
                  background: resonatedSongs.has(featuredSong.id) ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.06)',
                  border: '1px solid ' + (resonatedSongs.has(featuredSong.id) ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.15)'),
                  borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                  fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px',
                  textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms ease',
                  color: resonatedSongs.has(featuredSong.id) ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                  minHeight: '52px',
                }}
              >{resonatedSongs.has(featuredSong.id) ? '♥' : '♡'} Resonate</button>

              <button
                onClick={() => setPreview(featuredSong)}
                style={{
                  padding: '16px 28px', background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px',
                  fontFamily: 'var(--font-lora), serif', fontWeight: 700,
                  fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.7)', minHeight: '52px', cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >Details</button>
            </div>
          </div>
        </section>
      )}

      {/* ── Most Shared Lines ── */}
      {featuredSong && (
        <section style={{ padding: '52px 24px', maxWidth: '72rem', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>
            Most shared lines — {featuredSong.title}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {linesLoading && <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '32px' }}>Loading…</p>}
            {!linesLoading && sharedLines.length === 0 && (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '32px' }}>No lines shared yet — be the first.</p>
            )}
            {sharedLines.map((lyric) => (
              <Link key={lyric.id} href="/compose" style={{ textDecoration: 'none' }}>
                <div className="shared-line-row" style={{
                  padding: '18px 22px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                  transition: 'all 200ms ease', cursor: 'pointer',
                }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6 }}>
                    &ldquo;{lyric.line}&rdquo;
                  </p>
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

      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 24px' }} />

      {/* ── More Songs + Search ── */}
      {songs.length > 1 && (
        <section style={{ padding: '52px 24px', maxWidth: '72rem', margin: '0 auto' }}>
          {/* Header + search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
              More Songs
            </p>
            <input
              className="music-search"
              type="text"
              placeholder="Search songs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                color: 'var(--text)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px',
                padding: '10px 20px', width: '220px', transition: 'border-color 200ms ease',
              }}
            />
          </div>

          {filteredSongs.length === 0 && search && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem', textAlign: 'center', padding: '48px' }}>
              No songs found for &ldquo;{search}&rdquo;
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '28px' }}>
            {filteredSongs.map(song => (
              <SongCard key={song.id} song={song} onPreview={setPreview} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
