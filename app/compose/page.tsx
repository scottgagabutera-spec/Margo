'use client'
import { Suspense } from 'react'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { MargoNav } from '@/components/margo-nav'
import { db } from '@/lib/firebase'
import { ref, push, serverTimestamp, get } from 'firebase/database'
import { useUsername } from '@/hooks/useUsername'
import { useLicensedArtists } from '@/hooks/useLicensedArtists'
import { CardExportModal } from '@/components/card-export-modal'

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

const font = 'var(--font-lora), serif'
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
  color: 'var(--text-3)', letterSpacing: '0.5px',
  marginBottom: '32px', padding: 0, display: 'inline-block',
  transition: 'color 150ms ease',
}

function ComposeInner() {
  const router = useRouter()
  const { username, hasConfirmed, hasEdited, confirmUsername, editUsername } = useUsername()
  const { isLicensed } = useLicensedArtists()
  const searchParams = useSearchParams()
  useEffect(() => {
    const lyricParam = searchParams.get('lyric')
    const songParam = searchParams.get('song')
    const artistParam = searchParams.get('artist')
    if (lyricParam && songParam && artistParam) {
      const artworkParam = searchParams.get('artwork')
      setLyric(lyricParam)
      setSongName(songParam)
      setArtistName(artistParam)
      if (artworkParam) setSelectedSong({ id: 'player', title: songParam, artist: artistParam, artwork: artworkParam, source: 'apple' })
      const songIdParam = searchParams.get('songId')
      const audioUrlParam = searchParams.get('audioUrl')
      if (songIdParam) setLinkedSongId(songIdParam)
      if (audioUrlParam) setLinkedAudioUrl(audioUrlParam)
      setStep(3)
    }
  }, [])

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
  const [showExport, setShowExport] = useState(false)
  const [postedId, setPostedId] = useState<string | null>(null)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [linkedSongId, setLinkedSongId] = useState<string | null>(null)
  const [linkedAudioUrl, setLinkedAudioUrl] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const emotionAbortRef = useRef<AbortController | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

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

  const handleSelectSong = useCallback(async (result: SearchResult) => {
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setShowResults(false)
    setLinkedSongId(null)
    setLinkedAudioUrl(null)
    if (isLicensed(result.artist) && db) {
      try {
        const snap = await get(ref(db, 'songs'))
        snap.forEach((child) => {
          const s = child.val()
          const titleMatch = s.title?.toLowerCase().trim() === result.title.toLowerCase().trim()
          const artistMatch = s.artist?.toLowerCase().trim() === result.artist.toLowerCase().trim()
          if (titleMatch && artistMatch) {
            setLinkedSongId(child.key)
            setLinkedAudioUrl(s.audioUrl || null)
          }
        })
      } catch (e) {
        console.error('Song lookup failed:', e)
      }
    }
    setStep(2)
  }, [isLicensed])

  const handleLyricComplete = useCallback(async () => {
    if (lyric.trim().length === 0) return
    if (emotionAbortRef.current) emotionAbortRef.current.abort()
    const controller = new AbortController()
    emotionAbortRef.current = controller
    setEmotionLoading(true)
    setSelectedVibe(null)
    setSuggestedVibe(null)
    setStep(3)
    try {
      const res = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyric }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.emotion) {
        setSuggestedVibe(data.emotion as Vibe)
        setSelectedVibe(data.emotion as Vibe)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error('Emotion fetch failed:', e)
    } finally {
      setEmotionLoading(false)
    }
  }, [lyric])

  const handleVibeSelect = useCallback((vibe: Vibe) => {
    setSelectedVibe(vibe)
  }, [])

  const handleConfirmVibe = useCallback(() => {
    if (!selectedVibe) return
    setStep(4)
  }, [selectedVibe])

  const handlePost = useCallback(async (isPrivate: boolean) => {
    if (!lyric || !songName || !artistName) return
    if (isPrivate) { setShowExport(true); return }

    setPosting(true)
    setPostError(null)

    const tier = isLicensed(artistName) ? 1 : 2
    const post = {
      text: lyric,
      emotion: selectedVibe || null,
      tier,
      mode: 'share',
      status: 'active',
      flagCount: 0,
      knowledge: {
        song: songName,
        artist: artistName,
        artwork: selectedSong?.artwork || null,
        geniusId: selectedSong?.id || null,
      },
      youtubeMeta: null,
      songId: linkedSongId || null,
      audioUrl: linkedAudioUrl || null,
      username: username || null,
      timestamp: serverTimestamp(),
      lang: navigator.language.split('-')[0] || 'en',
    }

    try {
      if (!db) throw new Error('Database not available')
      const result = await push(ref(db, 'posts'), post)
      setPostedId(result.key)

      if (result.key && linkedSongId && db) {
        import('firebase/database').then(({ ref: dbRef, runTransaction }) => {
          if (db) runTransaction(dbRef(db, `songs/${linkedSongId}/lyricUses`), (cur) => (cur || 0) + 1)
        }).catch(() => {})
      }

      if (result.key) {
        fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: lyric }),
        }).then(r => r.json()).then(mod => {
          if (mod.flagged && db) {
            import('firebase/database').then(({ ref: dbRef, update }) => {
              if (db) update(dbRef(db, `posts/${result.key}`), { flagCount: 10 })
            })
          }
        }).catch(() => {})
      }

      setPosting(false)
      setShowSharePrompt(true)
    } catch (e) {
      console.error('Failed to post:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [artistName, songName, lyric, selectedVibe, selectedSong, username, isLicensed, linkedSongId, linkedAudioUrl])

  const resetCompose = () => {
    setStep(1)
    setSearchQuery('')
    setSelectedSong(null)
    setArtistName('')
    setSongName('')
    setLyric('')
    setSelectedVibe(null)
    setSuggestedVibe(null)
    setPostedId(null)
    setShowSharePrompt(false)
    setShowExport(false)
    setLinkedSongId(null)
    setLinkedAudioUrl(null)
    setPosting(false)
    setPostError(null)
  }

  if (showSharePrompt) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '80px' }}>
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '8px' }}>
            Your lyric is live.
          </p>
          <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '32px', letterSpacing: '0.5px' }}>
            Want to share it beyond Margo?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => { setShowExport(true); setShowSharePrompt(false) }}
              style={{
                padding: '15px 28px', background: 'var(--gold)', color: 'var(--bg)',
                borderRadius: '50px', fontFamily: font, fontWeight: 700,
                fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                border: 'none', cursor: 'pointer', boxShadow: '0 6px 28px rgba(232,197,71,0.28)',
              }}
            >Share as Card</button>
            <button
              onClick={() => router.push('/feed')}
              style={{
                padding: '13px 28px', background: 'transparent', color: 'var(--text-3)',
                border: '1px solid var(--border)', borderRadius: '50px', fontFamily: font,
                fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >See it on the Feed</button>
          </div>
        </div>
        <CardExportModal
          open={showExport}
          onOpenChange={(o) => { setShowExport(o); if (!o) router.push('/feed') }}
          lyric={lyric} song={songName} artist={artistName} postId={postedId || undefined}
        />
      </main>
    )
  }

  const showNameBanner = step === 4 && !hasConfirmed
  const buttonsBlocked = showNameBanner && editingName

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <MargoNav />
      <div style={{ position: 'fixed', top: '25%', left: '25%', width: '384px', height: '384px', background: 'rgba(232,197,71,0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '25%', right: '25%', width: '256px', height: '256px', background: 'rgba(232,197,71,0.08)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── Step 1: Search ── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Find your lyric</h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>Search by lyric, song, or artist</p>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-3)' }} />
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  style={{ width: '100%', height: '64px', paddingLeft: '56px', paddingRight: '24px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', color: 'var(--text)', fontSize: '1rem', fontFamily: font, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {showResults && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', zIndex: 50 }}>
                  {searchLoading && <div style={{ textAlign: 'center', padding: '16px', fontFamily: font, color: 'var(--gold)', fontSize: '0.82rem' }}>Searching…</div>}
                  {searchResults.map((result) => (
                    <button key={result.id} onClick={() => handleSelectSong(result)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-faint)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      {result.artwork && <img src={result.artwork} alt={result.title} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: font, color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</p>
                        <p style={{ fontFamily: font, color: 'var(--text-3)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Step 2: Lyric Input ── */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <button style={backBtnStyle} onClick={() => { setStep(1); setSelectedSong(null); setArtistName(''); setSongName('') }}>← Back</button>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Set the stage</h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>Enter the lyric that moves you</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Artist</label>
                <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)}
                  style={{ width: '100%', height: '48px', padding: '0 16px', background: 'var(--gold-faint)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: font, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Song</label>
                <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
                  style={{ width: '100%', height: '48px', padding: '0 16px', background: 'var(--gold-faint)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontFamily: font, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '20px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '256px', height: '128px', background: 'rgba(232,197,71,0.1)', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <textarea value={lyric} onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                placeholder="Type your lyric here..." rows={4}
                style={{ width: '100%', background: 'transparent', fontSize: '1.5rem', fontFamily: font, fontStyle: 'italic', color: 'var(--gold)', textAlign: 'center', lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', position: 'relative', zIndex: 10 }}>
                <span style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)' }}>{lyric.length}/140</span>
                <button onClick={handleLyricComplete} disabled={lyric.trim().length === 0}
                  style={{ padding: '10px 24px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: lyric.trim().length === 0 ? 0.4 : 1 }}>Continue</button>
              </div>
            </div>
          </div>

          {/* ── Step 3: Vibe Selection ── */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            {!emotionLoading && (
              <button style={backBtnStyle} onClick={() => setStep(2)}>← Back</button>
            )}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>
                {emotionLoading ? 'Reading the room…' : 'How does it feel?'}
              </h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>
                {emotionLoading ? 'Finding the right vibe for your lyric' : suggestedVibe ? 'We sensed something — confirm or change it' : 'Pick the vibe that fits'}
              </p>
            </div>

            <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--text)', marginBottom: '8px' }}>&ldquo;{lyric}&rdquo;</p>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>— {artistName}, {songName}</p>
            </div>

            {emotionLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5, animation: 'bounce 1s infinite', animationDelay: i * 150 + 'ms' }} />
                ))}
              </div>
            )}

            {!emotionLoading && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
                  {VIBES.map((vibe) => (
                    <button key={vibe} onClick={() => handleVibeSelect(vibe)}
                      style={{
                        padding: '10px 20px', borderRadius: '50px', fontFamily: font, fontWeight: 600,
                        fontSize: '0.82rem', cursor: 'pointer', transition: 'all 150ms ease',
                        background: selectedVibe === vibe ? 'var(--gold)' : 'transparent',
                        color: selectedVibe === vibe ? 'var(--bg)' : 'var(--gold)',
                        border: selectedVibe === vibe ? '1px solid var(--gold)' : '1px solid var(--gold-border)',
                        position: 'relative',
                      }}>
                      {VIBE_LABELS[vibe]}
                      {suggestedVibe === vibe && selectedVibe !== vibe && (
                        <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--bg)' }} />
                      )}
                    </button>
                  ))}
                </div>
                {/* Confirm vibe button — only active when a vibe is selected */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleConfirmVibe}
                    disabled={!selectedVibe}
                    style={{
                      padding: '14px 36px', background: selectedVibe ? 'var(--gold)' : 'transparent',
                      color: selectedVibe ? 'var(--bg)' : 'var(--text-3)',
                      border: selectedVibe ? 'none' : '1px solid var(--border)',
                      borderRadius: '50px', fontFamily: font, fontWeight: 700,
                      fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                      cursor: selectedVibe ? 'pointer' : 'not-allowed',
                      boxShadow: selectedVibe ? '0 6px 28px rgba(232,197,71,0.28)' : 'none',
                      transition: 'all 200ms ease',
                      opacity: selectedVibe ? 1 : 0.5,
                    }}
                  >{selectedVibe ? `Post with ${VIBE_LABELS[selectedVibe]}` : 'Select a vibe to continue'}</button>
                </div>
              </>
            )}
          </div>

          {/* ── Step 4: Preview + Post ── */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <button style={backBtnStyle} onClick={() => setStep(3)}>← Back</button>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Ready to share?</h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)' }}>Your lyric is set to go</p>
            </div>

            <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '20px', padding: '32px', marginBottom: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '256px', height: '128px', background: 'rgba(232,197,71,0.1)', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.5rem', color: 'var(--gold)', marginBottom: '16px', position: 'relative', zIndex: 1 }}>&ldquo;{lyric}&rdquo;</p>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '16px', position: 'relative', zIndex: 1 }}>— {artistName}, {songName}</p>
              {selectedVibe && (
                <span style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(232,197,71,0.15)', border: '1px solid var(--gold-border)', borderRadius: '50px', fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>{VIBE_LABELS[selectedVibe]}</span>
              )}
            </div>

            {/* Username confirm banner */}
            {showNameBanner && (
              <div style={{ background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
                {!editingName ? (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '4px' }}>
                      You'll post as <strong style={{ color: 'var(--gold)' }}>{username}</strong>
                    </p>
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
                      We gave you this name — it's yours on Margo. You can change it once, right now.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={confirmUsername}
                        style={{ padding: '9px 20px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>Keep It</button>
                      {!hasEdited && (
                        <button onClick={() => { setEditingName(true); setNameInput(username) }}
                          style={{ padding: '9px 20px', background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: '50px', fontFamily: font, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Edit Once</button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '12px' }}>Choose your name — you can only do this once.</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value.slice(0, 30))} maxLength={30} autoFocus
                        style={{ flex: 1, height: '44px', padding: '0 16px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '12px', color: 'var(--text)', fontFamily: font, fontSize: '0.9rem', outline: 'none' }} />
                      <button onClick={() => { if (nameInput.trim()) { editUsername(nameInput); setEditingName(false); confirmUsername() } }} disabled={!nameInput.trim()}
                        style={{ padding: '0 20px', height: '44px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '12px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: nameInput.trim() ? 1 : 0.4 }}>Confirm</button>
                      <button onClick={() => setEditingName(false)}
                        style={{ padding: '0 16px', height: '44px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: '12px', fontFamily: font, fontSize: '0.6rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {postError && (
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: '#ff6b6b', textAlign: 'center', marginBottom: '16px' }}>{postError}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto', opacity: buttonsBlocked ? 0.4 : 1, pointerEvents: buttonsBlocked ? 'none' : 'auto' }}>
              <button onClick={() => handlePost(false)} disabled={posting}
                style={{ padding: '15px 28px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: posting ? 'not-allowed' : 'pointer', boxShadow: '0 6px 28px rgba(232,197,71,0.28)', opacity: posting ? 0.7 : 1, transition: 'opacity 150ms ease' }}>
                {posting ? 'Posting…' : 'Post to Feed'}
              </button>
              <button onClick={() => handlePost(true)} disabled={posting}
                style={{ padding: '13px 28px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-hi)', borderRadius: '50px', fontFamily: font, fontWeight: 600, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                Keep Private
              </button>
            </div>
          </div>

        </div>
      </div>

      <CardExportModal
        open={showExport}
        onOpenChange={(o) => { setShowExport(o); if (!o) router.push('/feed') }}
        lyric={lyric} song={songName} artist={artistName} postId={postedId || undefined}
      />
    </main>
  )
}

export default function ComposePage() {
  return <Suspense><ComposeInner /></Suspense>
}
