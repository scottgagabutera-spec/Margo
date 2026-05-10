'use client'

import { useState, useCallback, Suspense } from 'react'
import { Search, Music2, Disc3, Heart, MessageCircle, CreditCard } from 'lucide-react'
import { CardExportModal } from '@/components/card-export-modal'
import { MargoNav } from '@/components/margo-nav'
import { db } from '@/lib/firebase'
import { useEchoes } from '@/hooks/useEchoes'
import { ref, push, set, remove, serverTimestamp } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername'
import { useSearchParams } from 'next/navigation'
import { usePost } from '@/hooks/usePost'

type Source = 'genius' | 'apple'

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
}

type Vibe =
  | 'LOVE' | 'HEARTBREAK' | 'HOPE' | 'NOSTALGIA'
  | 'HEALING' | 'JOY' | 'RAGE' | 'LONELINESS'
  | 'SEND IT' | 'LET OUT'

const VIBES: Vibe[] = [
  'LOVE', 'HEARTBREAK', 'HOPE', 'NOSTALGIA',
  'HEALING', 'JOY', 'RAGE', 'LONELINESS',
  'SEND IT', 'LET OUT',
]

const VIBE_LABELS: Record<Vibe, string> = {
  LOVE: 'Love', HEARTBREAK: 'Heartbreak', HOPE: 'Hope', NOSTALGIA: 'Nostalgia',
  HEALING: 'Healing', JOY: 'Joy', RAGE: 'Rage', LONELINESS: 'Loneliness',
  'SEND IT': 'Send It', 'LET OUT': 'Let Out',
}

/* ─── shared style tokens ─────────────────────────────────── */
const font = 'var(--font-lora), serif'
const gold = 'var(--gold)'
const goldFaint = 'var(--gold-faint)'
const goldBorder = 'var(--gold-border)'
const surface = 'var(--surface)'
const border = 'var(--border)'
const text = 'var(--text)'
const text2 = 'var(--text-2)'
const text3 = 'var(--text-3)'
const bg = 'var(--bg)'

function LyricBackContent() {
  const { username } = useUsername()
  const searchParams = useSearchParams()
  const postId = searchParams.get('postId')
  const { post: respondingTo } = usePost(postId)
  const { echoes, loading: echoesLoading } = useEchoes(postId)

  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null)
  const [artistName, setArtistName] = useState('')
  const [songName, setSongName] = useState('')
  const [lyric, setLyric] = useState('')
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)
  const [resonated, setResonated] = useState<Set<string>>(new Set())
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [showCard, setShowCard] = useState(false)
  const [cardData, setCardData] = useState<{ lyric: string; song: string; artist: string; id: string } | null>(null)

  /* ─── search ─────────────────────────────────────────────── */
  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value)
    if (value.length < 2) { setShowResults(false); setSearchResults([]); return }
    setShowResults(true)
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/genius?song=${encodeURIComponent(value)}`)
      const data = await res.json()
      setSearchResults((data.results || []).map((r: any) => ({
        id: String(r.id || r.song),
        title: r.song,
        artist: r.artist,
        artwork: r.artwork || '',
        source: r.source as Source,
      })))
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleSelectSong = useCallback((result: SearchResult) => {
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setShowResults(false)
    setStep(2)
  }, [])

  const handleLyricComplete = useCallback(() => {
    if (lyric.trim().length > 0) setStep(3)
  }, [lyric])

  const handleVibeSelect = useCallback((vibe: Vibe) => {
    setSelectedVibe(vibe)
    setStep(4)
  }, [])

  /* ─── post ───────────────────────────────────────────────── */
  const handlePost = useCallback(async (isPrivate: boolean) => {
    if (!db || !lyric || !songName || !artistName || !selectedVibe) return
    try {
      if (postId) {
        await push(ref(db, `posts/${postId}/echoes`), {
          lyric, song: songName, artist: artistName,
          emotion: selectedVibe, username: username || null,
          timestamp: serverTimestamp(), resonates: {},
        })
      } else {
        await push(ref(db, 'posts'), {
          text: lyric, emotion: selectedVibe, mode: 'share',
          status: isPrivate ? 'private' : 'active',
          knowledge: { song: songName, artist: artistName, artwork: selectedSong?.artwork || null },
          username: username || null, timestamp: serverTimestamp(),
        })
      }
    } catch (e) { console.error('Failed to post:', e) }
    setStep(1); setSearchQuery(''); setSelectedSong(null)
    setArtistName(''); setSongName(''); setLyric(''); setSelectedVibe(null)
  }, [artistName, songName, lyric, selectedVibe, selectedSong, username, postId])

  /* ─── promote + reply ────────────────────────────────────── */
  const promoteAndReply = async (echo: typeof echoes[0]) => {
    if (db) {
      try {
        const { ref: dbRef, set: dbSet } = await import('firebase/database')
        await dbSet(dbRef(db, `posts/${echo.id}`), {
          text: echo.lyric,
          knowledge: { song: echo.song, artist: echo.artist },
          emotion: echo.emotion, mode: 'reply',
          username: echo.username, timestamp: echo.timestamp,
          replyToId: postId || 'root',
        })
      } catch (e) { console.error('promote error', e) }
    }
    window.location.href = `/lyric-back?postId=${echo.id}`
  }

  /* ─── resonate ───────────────────────────────────────────── */
  const toggleResonate = async (echoId: string) => {
    if (!db) return
    const rawId = typeof window !== 'undefined'
      ? (localStorage.getItem('margoAnonName') || 'anon') : 'anon'
    const myId = rawId.replace(/[.#$[\]]/g, '_')
    const already = resonated.has(echoId)
    setResonated(prev => { const n = new Set(prev); already ? n.delete(echoId) : n.add(echoId); return n })
    setResonateCounts(prev => ({
      ...prev,
      [echoId]: Math.max(0,
        (prev[echoId] ?? Object.keys(echoes.find(e => e.id === echoId)?.resonates || {}).length)
        + (already ? -1 : 1)
      ),
    }))
    const rRef = ref(db, `analytics/${echoId}/resonates/${myId}`)
    try {
      already ? await remove(rRef) : await set(rRef, true)
    } catch {
      setResonated(prev => { const n = new Set(prev); already ? n.add(echoId) : n.delete(echoId); return n })
      setResonateCounts(prev => ({ ...prev, [echoId]: Math.max(0, (prev[echoId] || 0) + (already ? 1 : -1)) }))
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: bg, position: 'relative' }}>
      <MargoNav />

      {/* Ambient glows */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: '400px', height: '400px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '15%', width: '280px', height: '280px', background: 'rgba(232,197,71,0.06)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── Responding To ─────────────────────────────────── */}
          <div style={{
            background: goldFaint, border: `1px solid ${goldBorder}`,
            borderRadius: '20px', padding: '28px 24px',
            marginBottom: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '240px', height: '100px', background: 'rgba(232,197,71,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <p style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: text3, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
              Responding to
            </p>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.35rem', color: text, lineHeight: 1.5, marginBottom: '10px', position: 'relative', zIndex: 1 }}>
              &ldquo;{respondingTo?.text || '—'}&rdquo;
            </p>
            <p style={{ fontFamily: font, fontSize: '0.82rem', color: text2, marginBottom: '12px', position: 'relative', zIndex: 1 }}>
              — {respondingTo?.knowledge?.artist || ''}{respondingTo?.knowledge?.song ? `, ${respondingTo.knowledge.song}` : ''}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
              {respondingTo?.username && (
                <span style={{ fontFamily: font, fontSize: '0.72rem', color: text3 }}>
                  by {respondingTo.username}
                </span>
              )}
              {respondingTo?.emotion && (
                <span style={{
                  fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
                  color: gold, letterSpacing: '1px', textTransform: 'uppercase',
                  padding: '4px 12px', background: 'rgba(232,197,71,0.12)',
                  border: `1px solid ${goldBorder}`, borderRadius: '50px',
                }}>
                  {respondingTo.emotion}
                </span>
              )}
            </div>
          </div>

          {/* ── Step 1: Search ────────────────────────────────── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: gold, marginBottom: '8px' }}>
                Find your lyric back
              </h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3 }}>
                Search by lyric, song, or artist
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '22px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-3)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  style={{
                    width: '100%', height: '60px', paddingLeft: '52px', paddingRight: '24px',
                    background: goldFaint, border: `1px solid ${goldBorder}`,
                    borderRadius: '16px', color: text, fontSize: '1rem',
                    fontFamily: font, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {showResults && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                  background: surface, border: `1px solid ${border}`,
                  borderRadius: '16px', overflow: 'hidden', zIndex: 50,
                }}>
                  {searchLoading && (
                    <div style={{ textAlign: 'center', padding: '16px', fontFamily: font, color: gold, fontSize: '0.82rem', fontStyle: 'italic' }}>
                      Searching…
                    </div>
                  )}
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectSong(result)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = goldFaint)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      {result.artwork && (
                        <img src={result.artwork} alt={result.title} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: font, color: text, fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</p>
                        <p style={{ fontFamily: font, color: text3, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Step 2: Lyric ─────────────────────────────────── */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: gold, marginBottom: '8px' }}>
                Your lyric back
              </h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3 }}>
                Enter the lyric that says it back
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {(['Artist', 'Song'] as const).map((label) => (
                <div key={label}>
                  <label style={{ display: 'block', fontFamily: font, fontSize: '0.6rem', color: text3, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>{label}</label>
                  <input
                    type="text"
                    value={label === 'Artist' ? artistName : songName}
                    onChange={e => label === 'Artist' ? setArtistName(e.target.value) : setSongName(e.target.value)}
                    style={{ width: '100%', height: '46px', padding: '0 14px', background: goldFaint, border: `1px solid ${border}`, borderRadius: '12px', color: text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '20px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'rgba(232,197,71,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <textarea
                value={lyric}
                onChange={e => setLyric(e.target.value.slice(0, 140))}
                placeholder="Type your lyric here..."
                rows={4}
                style={{
                  width: '100%', background: 'transparent', fontSize: '1.4rem',
                  fontFamily: font, fontStyle: 'italic', color: gold,
                  textAlign: 'center', lineHeight: 1.6, border: 'none', outline: 'none',
                  resize: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', position: 'relative', zIndex: 10 }}>
                <span style={{ fontFamily: font, fontSize: '0.6rem', color: text3 }}>{lyric.length}/140</span>
                <button
                  onClick={handleLyricComplete}
                  disabled={lyric.trim().length === 0}
                  style={{
                    padding: '10px 24px', background: gold, color: bg,
                    borderRadius: '50px', fontFamily: font, fontWeight: 700,
                    fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                    border: 'none', cursor: 'pointer', opacity: lyric.trim().length === 0 ? 0.4 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >Continue</button>
              </div>
            </div>
          </div>

          {/* ── Step 3: Vibe ──────────────────────────────────── */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: gold, marginBottom: '8px' }}>
                How does it feel?
              </h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3 }}>
                Pick the vibe, or skip
              </p>
            </div>
            <div style={{ background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '16px', padding: '22px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.15rem', color: text, marginBottom: '6px' }}>&ldquo;{lyric}&rdquo;</p>
              <p style={{ fontFamily: font, fontSize: '0.78rem', color: text3 }}>— {artistName}, {songName}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              {VIBES.map(vibe => (
                <button
                  key={vibe}
                  onClick={() => handleVibeSelect(vibe)}
                  style={{
                    padding: '10px 20px', borderRadius: '50px', fontFamily: font,
                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 150ms ease',
                    background: selectedVibe === vibe ? gold : 'transparent',
                    color: selectedVibe === vibe ? bg : gold,
                    border: selectedVibe === vibe ? `1px solid ${gold}` : `1px solid ${goldBorder}`,
                  }}
                >{VIBE_LABELS[vibe]}</button>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setStep(4)}
                style={{ background: 'transparent', border: 'none', fontFamily: font, fontSize: '0.82rem', color: text3, cursor: 'pointer', textDecoration: 'underline' }}
              >Skip — no vibe</button>
            </div>
          </div>

          {/* ── Step 4: Confirm ───────────────────────────────── */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: gold, marginBottom: '8px' }}>
                Ready to send it back?
              </h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3 }}>
                Your lyric back is set to go
              </p>
            </div>
            <div style={{ background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '20px', padding: '32px', marginBottom: '28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'rgba(232,197,71,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.4rem', color: gold, marginBottom: '12px', position: 'relative', zIndex: 1 }}>&ldquo;{lyric}&rdquo;</p>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3, marginBottom: '14px', position: 'relative', zIndex: 1 }}>— {artistName}, {songName}</p>
              {selectedVibe && (
                <span style={{
                  display: 'inline-block', padding: '5px 14px',
                  background: 'rgba(232,197,71,0.12)', border: `1px solid ${goldBorder}`,
                  borderRadius: '50px', fontFamily: font, fontSize: '0.6rem',
                  fontWeight: 700, color: gold, letterSpacing: '1px',
                  textTransform: 'uppercase', position: 'relative', zIndex: 1,
                }}>{VIBE_LABELS[selectedVibe]}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
              <button
                onClick={() => handlePost(false)}
                style={{
                  padding: '15px 28px', background: gold, color: bg,
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
                }}
              >Send It</button>
              <button
                onClick={() => handlePost(true)}
                style={{
                  padding: '13px 28px', background: 'transparent',
                  color: text2, border: `1px solid var(--border-hi)`,
                  borderRadius: '50px', fontFamily: font, fontWeight: 600,
                  fontSize: '0.6rem', letterSpacing: '1px',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >Keep Private</button>
            </div>
          </div>

          {/* ── Lyric Backs section ───────────────────────────── */}
          <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: `1px solid rgba(232,197,71,0.1)` }}>
            <p style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: text3, letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '28px' }}>
              Lyric Backs
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {echoesLoading && (
                <p style={{ fontFamily: font, fontStyle: 'italic', color: text3, fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>Loading…</p>
              )}
              {!echoesLoading && echoes.length === 0 && (
                <p style={{ fontFamily: font, fontStyle: 'italic', color: text3, fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
                  No lyric backs yet — be the first.
                </p>
              )}
              {echoes.map(lb => {
                const resonateCount = resonateCounts[lb.id] ?? Object.keys(lb.resonates || {}).length
                const hasResonated = resonated.has(lb.id)
                return (
                  <div
                    key={lb.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${border}`,
                      borderRadius: '18px', padding: '20px 22px',
                      transition: 'border-color 200ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = goldBorder)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                  >
                    {/* Username + emotion */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontFamily: font, fontSize: '0.72rem', color: text3 }}>
                        {lb.username || 'anonymous'}
                      </span>
                      {lb.emotion && (
                        <span style={{
                          fontFamily: font, fontSize: '0.58rem', fontWeight: 700,
                          color: gold, letterSpacing: '1px', textTransform: 'uppercase',
                          padding: '3px 10px', background: 'rgba(232,197,71,0.08)',
                          border: `1px solid ${goldBorder}`, borderRadius: '50px',
                        }}>{lb.emotion}</span>
                      )}
                    </div>

                    {/* Lyric */}
                    <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.1rem', color: text, lineHeight: 1.6, marginBottom: '8px' }}>
                      &ldquo;{lb.lyric}&rdquo;
                    </p>
                    <p style={{ fontFamily: font, fontSize: '0.75rem', color: text3, marginBottom: '18px' }}>
                      — {lb.artist}, {lb.song}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingTop: '14px', borderTop: `1px solid ${border}` }}>
                      {/* Resonate */}
                      <button
                        onClick={() => toggleResonate(lb.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: hasResonated ? gold : 'var(--text-3)',
                          transition: 'color 150ms ease',
                          fontFamily: font,
                        }}
                      >
                        <Heart style={{ width: '15px', height: '15px', fill: hasResonated ? 'currentColor' : 'none', transition: 'fill 150ms ease' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {resonateCount > 0 ? resonateCount : ''} Resonate
                        </span>
                      </button>

                      {/* Lyric Back */}
                      <button
                        onClick={() => promoteAndReply(lb)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: text3, transition: 'color 150ms ease', fontFamily: font,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = gold)}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                      >
                        <MessageCircle style={{ width: '15px', height: '15px' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Lyric Back
                        </span>
                      </button>

                      {/* Card */}
                      <button
                        onClick={() => { setCardData({ lyric: lb.lyric, song: lb.song, artist: lb.artist, id: lb.id }); setShowCard(true) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: text3, transition: 'color 150ms ease', fontFamily: font,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = gold)}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                      >
                        <CreditCard style={{ width: '15px', height: '15px' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Card
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Card export modal */}
      {showCard && (
        <CardExportModal
          open={showCard}
          onOpenChange={setShowCard}
          lyric={cardData?.lyric || ''}
          song={cardData?.song || ''}
          artist={cardData?.artist || ''}
          postId={cardData?.id}
        />
      )}
    </main>
  )
}

export default function LyricBackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--gold)', fontSize: '1rem' }}>Loading…</p>
      </div>
    }>
      <LyricBackContent />
    </Suspense>
  )
}
