'use client'

import { useState, useCallback, Suspense } from 'react'
import { Search } from 'lucide-react'
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

const EMOTION_COLORS: Record<string, string> = {
  love: '#FF6B9D', heartbreak: '#ff6060', hope: '#7B9FFF',
  nostalgia: '#E8C547', healing: '#4ade80', joy: '#ffc847',
  rage: '#FF6440', loneliness: '#a0a0ff', sendit: '#00e5c8', letout: '#c864ff',
}

/* ─── style tokens — one source of truth ─────────────────── */
const font       = 'var(--font-lora), serif'
const gold       = 'var(--gold)'
const surface    = 'var(--surface)'
const border     = 'var(--border)'
const text       = 'var(--text)'
const text2      = 'var(--text-2)'
const text3      = 'var(--text-3)'
const bg         = 'var(--bg)'

function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

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
  const [cardData, setCardData] = useState<{
    lyric: string; song: string; artist: string; id: string;
    parentLyric?: string; parentSong?: string; parentArtist?: string;
  } | null>(null)

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

  /* ─── promote + reply — navigate first, write in background ─ */
  const promoteAndReply = (echo: typeof echoes[0]) => {
    window.location.href = `/lyric-back?postId=${echo.id}`
    if (db) {
      import('firebase/database').then(({ ref: dbRef, set: dbSet }) => {
        dbSet(dbRef(db, `posts/${echo.id}`), {
          text: echo.lyric,
          knowledge: { song: echo.song, artist: echo.artist },
          emotion: echo.emotion, mode: 'reply',
          username: echo.username, timestamp: echo.timestamp,
          replyToId: postId || 'root',
        }).catch(e => console.error('promote error', e))
      })
    }
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

      {/* Ambient glow — identical to feed */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: '100px 24px 80px' }}>

        {/* ── Responding To — tier-1 style, gold accent ─────── */}
        <div style={{
          background: 'rgba(232,197,71,0.04)',
          border: '1px solid rgba(232,197,71,0.22)',
          borderRadius: '20px', padding: '20px',
          position: 'relative', overflow: 'hidden',
          marginBottom: '20px',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '60%', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(232,197,71,0.5), transparent)',
          }} />
          <p style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 700, color: text3, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Responding to
          </p>
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', color: text, lineHeight: 1.5, marginBottom: '10px' }}>
            &ldquo;{respondingTo?.text || '—'}&rdquo;
          </p>
          {(respondingTo?.knowledge?.song || respondingTo?.knowledge?.artist) && (
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
              {respondingTo.knowledge.song && respondingTo.knowledge.artist
                ? `${respondingTo.knowledge.song} · ${respondingTo.knowledge.artist}`
                : respondingTo.knowledge.song || respondingTo.knowledge.artist}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {respondingTo?.username && (
              <span style={{ fontFamily: font, fontSize: '0.6rem', color: text3 }}>by {respondingTo.username}</span>
            )}
            {respondingTo?.emotion && (
              <span style={{
                fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
                color: EMOTION_COLORS[normalizeEmotion(respondingTo.emotion).toLowerCase()] || text3,
              }}>{respondingTo.emotion}</span>
            )}
          </div>
        </div>

        {/* ── Compose box — standard card style ─────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px', padding: '20px',
          position: 'relative', overflow: 'hidden',
          marginBottom: '32px',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '60%', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
          }} />

          {/* Step 1 */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: text, marginBottom: '16px' }}>
              Find your lyric back
            </p>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--text-3)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by lyric, song or artist..."
                style={{
                  width: '100%', height: '44px', paddingLeft: '40px', paddingRight: '14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: text, fontSize: '0.82rem',
                  fontFamily: font, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {showResults && (
              <div style={{ marginTop: '6px', background: surface, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
                {searchLoading && (
                  <div style={{ padding: '12px 14px', fontFamily: font, color: gold, fontSize: '0.78rem', fontStyle: 'italic' }}>Searching…</div>
                )}
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectSong(result)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {result.artwork && (
                      <img src={result.artwork} alt={result.title} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: font, color: text, fontSize: '0.88rem', fontWeight: 600, marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</p>
                      <p style={{ fontFamily: font, color: text3, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: text, marginBottom: '16px' }}>
              Your lyric back
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {(['Artist', 'Song'] as const).map(label => (
                <div key={label}>
                  <label style={{ display: 'block', fontFamily: font, fontSize: '0.5rem', color: text3, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '5px' }}>{label}</label>
                  <input
                    type="text"
                    value={label === 'Artist' ? artistName : songName}
                    onChange={e => label === 'Artist' ? setArtistName(e.target.value) : setSongName(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: text, fontFamily: font, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <textarea
              value={lyric}
              onChange={e => setLyric(e.target.value.slice(0, 140))}
              placeholder="Type your lyric here..."
              rows={3}
              style={{
                width: '100%', background: 'rgba(232,197,71,0.04)',
                border: '1px solid rgba(232,197,71,0.22)',
                borderRadius: '10px', padding: '14px',
                fontSize: '1.1rem', fontFamily: font, fontStyle: 'italic',
                color: gold, lineHeight: 1.6, outline: 'none',
                resize: 'none', boxSizing: 'border-box', marginBottom: '10px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: font, fontSize: '0.5rem', color: text3 }}>{lyric.length}/140</span>
              <button
                onClick={handleLyricComplete}
                disabled={lyric.trim().length === 0}
                style={{
                  padding: '7px 18px', background: gold, color: bg,
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.5rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer', opacity: lyric.trim().length === 0 ? 0.4 : 1,
                }}
              >Continue</button>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: text, marginBottom: '14px' }}>
              How does it feel?
            </p>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.88rem', color: text3, marginBottom: '14px' }}>
              &ldquo;{lyric}&rdquo; — {artistName}, {songName}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {VIBES.map(vibe => (
                <button
                  key={vibe}
                  onClick={() => handleVibeSelect(vibe)}
                  style={{
                    padding: '4px 10px', borderRadius: '50px', fontFamily: font,
                    fontWeight: 700, fontSize: '0.55rem', letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer', transition: 'all 150ms ease',
                    background: selectedVibe === vibe ? gold : 'transparent',
                    color: selectedVibe === vibe ? bg : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${selectedVibe === vibe ? gold : 'rgba(255,255,255,0.1)'}`,
                  }}
                >{VIBE_LABELS[vibe]}</button>
              ))}
            </div>
            <button
              onClick={() => setStep(4)}
              style={{ background: 'transparent', border: 'none', fontFamily: font, fontSize: '0.6rem', color: text3, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >Skip — no vibe</button>
          </div>

          {/* Step 4 */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: text, marginBottom: '14px' }}>
              Ready to send it back?
            </p>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: text, lineHeight: 1.5, marginBottom: '8px' }}>&ldquo;{lyric}&rdquo;</p>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
              {songName} · {artistName}
            </p>
            {selectedVibe && (
              <span style={{
                display: 'inline-block', marginBottom: '20px',
                fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
                color: EMOTION_COLORS[normalizeEmotion(selectedVibe).toLowerCase()] || text3,
              }}>{VIBE_LABELS[selectedVibe]}</span>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handlePost(false)}
                style={{
                  flex: 1, padding: '11px', background: gold, color: bg,
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.5rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(232,197,71,0.25)',
                }}
              >Send It</button>
              <button
                onClick={() => handlePost(true)}
                style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  color: text2, border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50px', fontFamily: font, fontWeight: 600,
                  fontSize: '0.5rem', letterSpacing: '1.5px',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >Keep Private</button>
            </div>
          </div>
        </div>

        {/* ── Lyric Backs — same card system as feed ────────── */}
        <div>
          <p style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 700, color: text3, letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '20px' }}>
            Lyric Backs
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {echoesLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '40px 0' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, opacity: 0.5 }} />
                ))}
              </div>
            )}
            {!echoesLoading && echoes.length === 0 && (
              <p style={{ fontFamily: font, fontStyle: 'italic', color: text3, fontSize: '0.9rem', textAlign: 'center', padding: '32px 0' }}>
                No lyric backs yet — be the first.
              </p>
            )}
            {echoes.map(lb => {
              const emotionKey = normalizeEmotion(lb.emotion || '').toLowerCase()
              const emotionColor = EMOTION_COLORS[emotionKey] || text3
              const resonateCount = resonateCounts[lb.id] ?? Object.keys(lb.resonates || {}).length
              const hasResonated = resonated.has(lb.id)
              return (
                <div
                  key={lb.id}
                  style={{
                    /* Identical to feed PostCard */
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px', padding: '20px',
                    position: 'relative', overflow: 'hidden',
                    transition: 'border-color 200ms ease',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '60%', height: '1px',
                    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
                  }} />

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: font, fontSize: '0.55rem', fontWeight: 700, color: bg }}>
                          {(lb.username || '??').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontFamily: font, fontSize: '0.82rem', fontWeight: 600, color: text, marginBottom: '1px' }}>
                          {lb.username || 'Anonymous'}
                        </p>
                      </div>
                    </div>
                    {lb.emotion && (
                      <span style={{
                        fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                        letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
                        borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
                        color: emotionColor,
                      }}>{lb.emotion}</span>
                    )}
                  </div>

                  {/* Lyric */}
                  <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: text, lineHeight: 1.5, marginBottom: '12px' }}>
                    &ldquo;{lb.lyric}&rdquo;
                  </p>

                  {/* Song credit */}
                  <p style={{ fontFamily: font, fontSize: '0.6rem', color: text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
                    {lb.song} · {lb.artist}
                  </p>

                  {/* Actions — exactly matches feed PostCard */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <button onClick={() => toggleResonate(lb.id)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      color: hasResonated ? gold : text2,
                      transition: 'color 150ms ease',
                    }}>
                      <span style={{ fontSize: '1rem' }}>{hasResonated ? '♥' : '♡'}</span>
                      <span style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {resonateCount > 0 ? resonateCount : 'Resonate'}
                      </span>
                    </button>

                    <button onClick={() => promoteAndReply(lb)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      color: text2, transition: 'color 150ms ease',
                    }}>
                      <span style={{ fontSize: '1rem' }}>↩</span>
                      <span style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Lyric Back</span>
                    </button>

                    {/* Card — was "Share" in old feed, now "Card" everywhere, same ↗ icon */}
                    <button
                      onClick={() => {
                        setCardData({
                          lyric: lb.lyric, song: lb.song, artist: lb.artist, id: lb.id,
                          parentLyric: respondingTo?.text,
                          parentSong: respondingTo?.knowledge?.song,
                          parentArtist: respondingTo?.knowledge?.artist,
                        })
                        setShowCard(true)
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                        color: text2, transition: 'color 150ms ease',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>↗</span>
                      <span style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Card</span>
                    </button>

                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {showCard && (
        <CardExportModal
          open={showCard}
          onOpenChange={setShowCard}
          lyric={cardData?.lyric || ''}
          song={cardData?.song || ''}
          artist={cardData?.artist || ''}
          postId={cardData?.id}
          parentLyric={cardData?.parentLyric}
          parentSong={cardData?.parentSong}
          parentArtist={cardData?.parentArtist}
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
