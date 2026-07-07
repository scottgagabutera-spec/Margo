'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { CardExportModal } from '@/components/card-export-modal'
import { MargoNav } from '@/components/margo-nav'
import { HeartIcon } from '@/components/heart-icon'
import { db } from '@/lib/firebase'
import { useEchoes } from '@/hooks/useEchoes'
import { ref, push, set, remove, serverTimestamp, runTransaction } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername'
import { useClaimIdentity } from '@/hooks/useClaimIdentity'
import { getMargoActorId } from '@/lib/engagement/session'
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
  | 'CHILL' | 'HOPE' | 'HEALING' | 'GRATEFUL' | 'SPIRITUAL'
  | 'NOSTALGIA' | 'JOY' | 'LOVE' | 'HYPE' | 'PROUD'
  | 'HEARTBREAK' | 'PAIN' | 'LONELINESS' | 'LOST'
  | 'RAGE' | 'SENDIT' | 'LETOUT'

const VIBES: Vibe[] = [
  'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL',
  'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD',
  'HEARTBREAK', 'PAIN', 'LONELINESS', 'LOST',
  'RAGE', 'SENDIT', 'LETOUT',
]

const VIBE_LABELS: Record<Vibe, string> = {
  CHILL: 'Chill', HOPE: 'Hope', HEALING: 'Healing',
  GRATEFUL: 'Grateful', SPIRITUAL: 'Spiritual', NOSTALGIA: 'Nostalgia',
  JOY: 'Joy', LOVE: 'Love', HYPE: 'Hype', PROUD: 'Proud',
  HEARTBREAK: 'Heartbreak', PAIN: 'Pain', LONELINESS: 'Loneliness',
  LOST: 'Lost', RAGE: 'Rage', SENDIT: 'Send It', LETOUT: 'Let Out',
}

const EMOTION_COLORS: Record<string, string> = {
  chill: '#60b8ff', hope: '#7B9FFF', healing: '#4ade80', grateful: '#a0e080',
  spiritual: '#c8a0ff', nostalgia: '#E8C547', joy: '#ffc847', love: '#FF6B9D',
  hype: '#ffc847', proud: '#FFB347', heartbreak: '#ff6060', pain: '#ff6060',
  loneliness: '#a0a0ff', lost: '#9A98A4', rage: '#FF6440', sendit: '#00e5c8', letout: '#c864ff',
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

const vibeBtnStyle: React.CSSProperties = {
  padding: '12px 16px',
  minHeight: '44px',
  boxSizing: 'border-box',
  borderRadius: '50px',
  fontFamily: font,
  fontWeight: 700,
  fontSize: '0.6rem',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  position: 'relative',
}

function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

function parseVibeFromString(raw: string | undefined | null): Vibe | null {
  if (!raw) return null
  const key = normalizeEmotion(raw)
  return VIBES.includes(key as Vibe) ? (key as Vibe) : null
}

function LyricBackContent() {
  const { username } = useUsername()
  const { user: claimedUser } = useClaimIdentity()
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
  const [suggestedVibe, setSuggestedVibe] = useState<Vibe | null>(null)
  const [emotionLoading, setEmotionLoading] = useState(false)
  const [emotionError, setEmotionError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [resonated, setResonated] = useState<Set<string>>(new Set())
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [showCard, setShowCard] = useState(false)
  const [cardData, setCardData] = useState<{
    lyric: string; song: string; artist: string; id: string;
    parentLyric?: string; parentSong?: string; parentArtist?: string;
  } | null>(null)
  const emotionAbortRef = useRef<AbortController | null>(null)

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

  const handleLyricComplete = useCallback(async () => {
    if (lyric.trim().length === 0) return
    if (emotionAbortRef.current) emotionAbortRef.current.abort()
    const controller = new AbortController()
    emotionAbortRef.current = controller
    setEmotionLoading(true)
    setEmotionError(null)
    setSelectedVibe(null)
    setSuggestedVibe(null)
    setStep(3)

    const parentVibe = parseVibeFromString(respondingTo?.emotion)
    if (parentVibe) {
      setSuggestedVibe(parentVibe)
      setSelectedVibe(parentVibe)
    }

    try {
      const res = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyric }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.emotion) {
        const detected = parseVibeFromString(data.emotion)
        if (detected) {
          setSuggestedVibe(detected)
          setSelectedVibe(detected)
        } else if (!parentVibe) {
          setEmotionError('Pick the vibe that fits your lyric.')
        }
      } else if (!parentVibe) {
        setEmotionError('Pick the vibe that fits your lyric.')
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError' && !parentVibe) {
        setEmotionError('Could not suggest a vibe — pick one below.')
      }
    } finally {
      setEmotionLoading(false)
    }
  }, [lyric, respondingTo?.emotion])

  const handleVibeSelect = useCallback((vibe: Vibe) => {
    setSelectedVibe(vibe)
    setEmotionError(null)
  }, [])

  const handleConfirmVibe = useCallback(() => {
    if (!selectedVibe) return
    setStep(4)
  }, [selectedVibe])

  const resetComposeForm = useCallback(() => {
    setStep(1)
    setSearchQuery('')
    setSelectedSong(null)
    setArtistName('')
    setSongName('')
    setLyric('')
    setSelectedVibe(null)
    setSuggestedVibe(null)
    setEmotionError(null)
    setPostError(null)
  }, [])

  /* ─── post ───────────────────────────────────────────────── */
  const handlePost = useCallback((isPrivate: boolean) => {
    if (posting) return
    if (!lyric || !songName || !artistName) return
    if (!selectedVibe) {
      setPostError('Choose a vibe before sending.')
      return
    }
    if (!db) {
      setPostError('Could not connect. Please try again.')
      return
    }
    setPosting(true)
    setPostError(null)

    const writePromise = postId
      ? push(ref(db, `posts/${postId}/echoes`), {
          lyric, song: songName, artist: artistName,
          emotion: selectedVibe, username: username || null,
          authorUid: claimedUser?.uid || null,
          timestamp: serverTimestamp(), resonates: {},
        }).then(() => {
          // increment postStats.echoCount atomically
          runTransaction(ref(db!, `postStats/${postId}/echoCount`), (current) => (current || 0) + 1)
          // also increment songStats if this post is linked to a song
          return import('firebase/database').then(({ ref: dbRef, get: dbGet, runTransaction: dbTx }) => {
            if (!db) return
            return dbGet(dbRef(db, `posts/${postId}/songId`)).then(snap => {
              if (snap.exists() && snap.val()) {
                dbTx(dbRef(db!, `songStats/${snap.val()}/echoCount`), (cur) => (cur || 0) + 1)
              }
            })
          })
        })
      : push(ref(db, 'posts'), {
          text: lyric, emotion: selectedVibe, mode: 'share',
          status: isPrivate ? 'private' : 'active',
          knowledge: { song: songName, artist: artistName, artwork: selectedSong?.artwork || null },
          username: username || null,
          authorUid: claimedUser?.uid || null,
          timestamp: serverTimestamp(),
        })

    resetComposeForm()
    setPosting(false)

    writePromise.catch((e) => {
      console.error('Failed to post:', e)
      toast.error('Could not send your lyric back. Please try again.')
    })
  }, [artistName, songName, lyric, selectedVibe, selectedSong, username, claimedUser, postId, posting, resetComposeForm])

  /* ─── promote + reply — navigate first, write in background ─ */
  const promoteAndReply = (echo: typeof echoes[0]) => {
    // Navigate to this echo's lyric-back page — no feed post created
    window.location.href = `/lyric-back?postId=${encodeURIComponent(postId || '')}&echoId=${encodeURIComponent(echo.id)}`
  }

  /* ─── resonate ───────────────────────────────────────────── */
  const toggleResonate = async (echoId: string) => {
    if (!db) return
    const myId = getMargoActorId()
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

  const parentVibeLabel = respondingTo?.emotion
    ? (parseVibeFromString(respondingTo.emotion)
      ? VIBE_LABELS[parseVibeFromString(respondingTo.emotion)!]
      : respondingTo.emotion)
    : null

  return (
    <main style={{ minHeight: '100vh', background: bg, position: 'relative' }}>
      <MargoNav />

      {/* Ambient glow — identical to feed */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: '100px 24px var(--margo-page-padding-bottom)' }}>

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
            {parentVibeLabel && (
              <span style={{
                fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
                borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
                color: EMOTION_COLORS[normalizeEmotion(respondingTo!.emotion!).toLowerCase()] || text3,
              }}>{parentVibeLabel}</span>
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

          {postError && (
            <p style={{
              fontFamily: font, fontSize: '0.82rem', color: '#ff6b6b',
              textAlign: 'center', marginBottom: '16px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,107,107,0.06)',
              border: '1px solid rgba(255,107,107,0.2)',
            }}>
              {postError}
            </p>
          )}

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
                      width: '100%', minHeight: 'var(--margo-touch-min)', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '0 14px', background: 'none', border: 'none', boxSizing: 'border-box',
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
                    style={{ width: '100%', height: 'var(--margo-touch-min)', padding: '0 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: text, fontFamily: font, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
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
                type="button"
                onClick={handleLyricComplete}
                disabled={lyric.trim().length === 0}
                style={{
                  minHeight: 'var(--margo-touch-min)', padding: '0 20px',
                  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                  background: gold, color: bg,
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.5rem', letterSpacing: '1px', textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer', opacity: lyric.trim().length === 0 ? 0.4 : 1,
                }}
              >Continue</button>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            {!emotionLoading && (
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: font, fontSize: '0.82rem', color: text3,
                  letterSpacing: '0.5px', marginBottom: '16px', padding: '0 12px',
                  minHeight: 'var(--margo-touch-min)', display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                }}
              >← Back</button>
            )}
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: emotionLoading ? gold : text, marginBottom: '8px' }}>
              {emotionLoading ? 'Reading the room…' : 'How does it feel?'}
            </p>
            <p style={{ fontFamily: font, fontSize: '0.82rem', color: text3, marginBottom: '14px' }}>
              {emotionLoading
                ? 'Finding the right vibe for your lyric'
                : suggestedVibe
                  ? 'We sensed something — confirm or change it'
                  : 'Pick the vibe that fits'}
            </p>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.88rem', color: text2, marginBottom: '14px' }}>
              &ldquo;{lyric}&rdquo; — {artistName}, {songName}
            </p>

            {emotionLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: gold, opacity: 0.5,
                      animation: 'lb-emotion-pulse 1s ease-in-out infinite',
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            )}

            {!emotionLoading && (
              <>
                {emotionError && (
                  <p style={{ fontFamily: font, fontSize: '0.82rem', color: text2, marginBottom: '12px', textAlign: 'center' }}>
                    {emotionError}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {VIBES.map(vibe => (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => handleVibeSelect(vibe)}
                      style={{
                        ...vibeBtnStyle,
                        background: selectedVibe === vibe ? gold : 'transparent',
                        color: selectedVibe === vibe ? bg : 'rgba(255,255,255,0.45)',
                        border: `1px solid ${selectedVibe === vibe ? gold : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {VIBE_LABELS[vibe]}
                      {suggestedVibe === vibe && selectedVibe !== vibe && (
                        <span style={{
                          position: 'absolute', top: '-4px', right: '-4px',
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: gold, border: `2px solid ${bg}`,
                        }} />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleConfirmVibe}
                  disabled={!selectedVibe}
                  style={{
                    width: '100%', padding: '11px', minHeight: '44px', boxSizing: 'border-box',
                    borderRadius: '50px',
                    fontFamily: font, fontWeight: 700, fontSize: '0.6rem',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    border: 'none', cursor: selectedVibe ? 'pointer' : 'not-allowed',
                    background: selectedVibe ? gold : 'rgba(255,255,255,0.04)',
                    color: selectedVibe ? bg : text3,
                    opacity: selectedVibe ? 1 : 0.5,
                    boxShadow: selectedVibe ? '0 4px 20px rgba(232,197,71,0.25)' : 'none',
                  }}
                >
                  {selectedVibe
                    ? `Continue with ${VIBE_LABELS[selectedVibe]}`
                    : 'Select a vibe to continue'}
                </button>
              </>
            )}
            <style>{`
              @keyframes lb-emotion-pulse {
                0%, 100% { opacity: 0.35; transform: translateY(0); }
                50% { opacity: 1; transform: translateY(-3px); }
              }
            `}</style>
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
                type="button"
                onClick={() => handlePost(false)}
                disabled={posting || !selectedVibe}
                style={{
                  flex: 1, padding: '11px', minHeight: '44px', boxSizing: 'border-box',
                  background: gold, color: bg,
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.5rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                  border: 'none', cursor: posting ? 'not-allowed' : 'pointer',
                  opacity: posting ? 0.6 : 1,
                  boxShadow: '0 4px 20px rgba(232,197,71,0.25)',
                }}
              >{posting ? 'Sending…' : 'Send It'}</button>
              <button
                type="button"
                onClick={() => handlePost(true)}
                disabled={posting || !selectedVibe}
                style={{
                  flex: 1, padding: '11px', minHeight: '44px', boxSizing: 'border-box',
                  background: 'transparent',
                  color: text2, border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50px', fontFamily: font, fontWeight: 600,
                  fontSize: '0.5rem', letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: posting ? 'not-allowed' : 'pointer',
                  opacity: posting ? 0.6 : 1,
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
              const echoVibe = parseVibeFromString(lb.emotion)
              const echoVibeLabel = echoVibe ? VIBE_LABELS[echoVibe] : lb.emotion
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
                      }}>{echoVibeLabel}</span>
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
                      background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
                      minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)', boxSizing: 'border-box',
                      color: hasResonated ? gold : text2,
                      transition: 'color 150ms ease',
                    }}>
                      <span style={{ fontSize: '1rem' }}><HeartIcon filled={hasResonated} size={18} color="currentColor" /></span>
                      <span style={{ fontFamily: font, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {resonateCount > 0 ? resonateCount : 'Resonate'}
                      </span>
                    </button>

                    <button onClick={() => promoteAndReply(lb)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
                      minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)', boxSizing: 'border-box',
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
                        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
                        minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)', boxSizing: 'border-box',
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