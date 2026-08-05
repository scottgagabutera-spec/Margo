'use client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { matchLyricLine } from '@/lib/lyric-match'
import { searchMargoSongs } from '@/lib/search-margo-songs'
import { useIdentity } from '@/hooks/useIdentity'
import { CardExportModal } from '@/components/card-export-modal'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { useAuthGate } from '@/components/supabase-auth-provider'

type Source = 'margo' | 'genius' | 'apple'

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
  margoSongId?: string
  audioUrl?: string | null
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
  marginBottom: '32px', padding: '0 12px', minHeight: 'var(--margo-touch-min)',
  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
  transition: 'color 150ms ease',
}

function sourceLabel(s: Source) {
  if (s === 'margo') return 'On Margo'
  if (s === 'genius') return 'Genius'
  return 'Apple Music'
}

function songKey(title: string, artist: string) {
  return title.trim().toLowerCase() + '|' + artist.trim().toLowerCase()
}

function ComposeInner() {
  const router = useRouter()
  const { user, identity, loading: identityLoading, updateDisplayName } = useIdentity()
  const { requireAuth } = useAuthGate()
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
      // Exact snippet timing from the player's share sheet — already
      // known precisely there (it's the currently-playing lyric line),
      // so no matching needed at all for this entry point.
      const startParam = searchParams.get('start')
      const endParam = searchParams.get('end')
      if (startParam) setSnippetStart(parseFloat(startParam))
      if (endParam) setSnippetEnd(parseFloat(endParam))
      if (songIdParam) setLinePickComplete(true)
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
  // Exact snippet timing — either passed in directly from the player's
  // share sheet (exact), or matched at post time against the linked
  // song's real lyric_lines via matchLyricLine (best-effort, may be null
  // if nothing matches confidently).
  const [snippetStart, setSnippetStart] = useState<number | null>(null)
  const [snippetEnd, setSnippetEnd] = useState<number | null>(null)
  const [margoLines, setMargoLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [linePickComplete, setLinePickComplete] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const emotionAbortRef = useRef<AbortController | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const runSearch = useCallback(async (value: string) => {
    const gen = ++searchGenRef.current
    setShowResults(true)
    setSearchLoading(true)
    try {
      const [margoHits, geniusRes] = await Promise.all([
        searchMargoSongs(supabase, value),
        fetch('/api/genius?song=' + encodeURIComponent(value)).then(async (res) => {
          if (!res.ok) return { results: [] as any[] }
          try {
            const data = await res.json()
            if (data?.error) return { results: [] as any[] }
            return data
          } catch {
            return { results: [] as any[] }
          }
        }).catch(() => ({ results: [] as any[] })),
      ])

      if (gen !== searchGenRef.current) return

      const margoMapped: SearchResult[] = margoHits.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        artwork: song.artwork || '',
        source: 'margo' as const,
        margoSongId: song.id,
        audioUrl: song.audioUrl,
      }))

      const margoKeys = new Set(margoMapped.map((r) => songKey(r.title, r.artist)))

      const externalMapped: SearchResult[] = (geniusRes.results || []).map((r: any) => {
        const rawSource = String(r.source || '').toLowerCase()
        const source: Source = (rawSource === 'itunes' || rawSource === 'apple') ? 'apple' : 'genius'
        return {
          id: String(r.id || r.song),
          title: r.song,
          artist: r.artist,
          artwork: r.artwork || '',
          source,
        }
      }).filter((r: SearchResult) => !margoKeys.has(songKey(r.title, r.artist)))

      setSearchResults([...margoMapped, ...externalMapped].slice(0, 10))
    } catch {
      if (gen !== searchGenRef.current) return
      setSearchResults([])
    } finally {
      if (gen === searchGenRef.current) setSearchLoading(false)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (value.length < 2) {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
        searchTimerRef.current = null
      }
      searchGenRef.current++
      setShowResults(false)
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null
      runSearch(value)
    }, 300)
  }, [runSearch])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleSelectSong = useCallback(async (result: SearchResult) => {
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setShowResults(false)
    setSnippetStart(null)
    setSnippetEnd(null)

    if (result.source === 'margo') {
      setLinkedSongId(result.margoSongId!)
      setLinkedAudioUrl(result.audioUrl || null)
      setLinePickComplete(false)
      setMargoLines([])
      setLinesLoading(true)
      setStep(2)
      try {
        const { data, error } = await supabase
          .from('lyric_lines')
          .select('line_index, text, start_sec, end_sec')
          .eq('song_id', result.margoSongId!)
          .order('line_index', { ascending: true })

        if (!error && data) {
          setMargoLines(data.map((row) => ({
            lineIndex: row.line_index,
            text: row.text,
            startSec: row.start_sec,
            endSec: row.end_sec,
          })))
        } else {
          setMargoLines([])
        }
      } catch (e) {
        console.error('Lyric lines fetch failed:', e)
        setMargoLines([])
      } finally {
        setLinesLoading(false)
      }
      return
    }

    // External (Genius / Apple) — clear direct links, then attempt
    // title+artist lookup against the live Margo catalog.
    setLinkedSongId(null)
    setLinkedAudioUrl(null)
    setLinePickComplete(true)
    setMargoLines([])

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, audio_url')
        .eq('status', 'live')
        .ilike('title', result.title.trim())
        .ilike('artist_display_name', result.artist.trim())
        .maybeSingle()

      if (!error && data) {
        setLinkedSongId(data.id)
        setLinkedAudioUrl(data.audio_url || null)
      }
    } catch (e) {
      console.error('Song lookup failed:', e)
    }

    setStep(2)
  }, [])

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
    if (!requireAuth()) return
    if (!lyric || !songName || !artistName) return
    if (isPrivate) { setShowExport(true); return }
    if (!identity || !user) { setPostError('Still setting things up — try again in a moment.'); return }

    setPosting(true)
    setPostError(null)

    // Confirmed via useIdentity.ts: IdentityUser sets both `id` and `uid`
    // to the same Supabase auth id (a deliberate compatibility shim), so
    // user.id is always correct here — no ambiguity after all.
    const authorId = user.id

    // Resolve snippet timing. Exact values already set (from the player's
    // share link or a Margo line pick) take priority and skip matching.
    // Otherwise, if a real song is linked (external post-hoc path), run
    // the shared matcher against its actual lyric_lines.
    let resolvedStart = snippetStart
    let resolvedEnd = snippetEnd
    if ((resolvedStart == null || resolvedEnd == null) && linkedSongId) {
      const match = await matchLyricLine(supabase, linkedSongId, lyric)
      if (match) {
        resolvedStart = match.startSec
        resolvedEnd = match.endSec
      }
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('posts')
        .insert({
          text: lyric,
          emotion: selectedVibe || null,
          status: 'active',
          flag_count: 0,
          song_id: linkedSongId || null,
          song_title: songName,
          artist_name: artistName,
          artwork_url: selectedSong?.artwork || null,
          genius_id: selectedSong?.source === 'margo' ? null : (selectedSong?.id || null),
          author_profile_id: authorId,
          parent_post_id: null,
          lang: navigator.language.split('-')[0] || 'en',
          snippet_start_sec: resolvedStart,
          snippet_end_sec: resolvedEnd,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      const newPostId = data.id
      setPostedId(newPostId)

      // song_stats.lyric_uses is now incremented automatically by the
      // post_song_link_insert trigger whenever a post with a real song_id
      // is created — no manual runTransaction needed here anymore
      // (previously two separate Firebase transactions against
      // songs/{id}/lyricUses and songStats/{id}/lyricUses).

      // Moderation still runs entirely server-side via /api/moderate —
      // the client just fires the request with the real postId and
      // doesn't need the response back.
      fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lyric, postId: newPostId }),
      }).catch(() => {})

      setPosting(false)
      setShowSharePrompt(true)
    } catch (e) {
      console.error('Failed to post:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [requireAuth, artistName, songName, lyric, selectedVibe, selectedSong, identity, user, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd])

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
    setSnippetStart(null)
    setSnippetEnd(null)
    setMargoLines([])
    setLinesLoading(false)
    setLinePickComplete(false)
    setPosting(false)
    setPostError(null)
    setBannerDismissed(false)
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

  // Show the name banner on step 4 until the person has customized their
  // displayName at least once, or dismissed it for this compose session.
  const showNameBanner = step === 4 && !!identity && identity.displayName === identity.username && !bannerDismissed
  const buttonsBlocked = showNameBanner && editingName
  const showLinePicker = step === 2 && selectedSong?.source === 'margo' && !linePickComplete


  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '25%', left: '25%', width: '384px', height: '384px', background: 'rgba(232,197,71,0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '25%', right: '25%', width: '256px', height: '256px', background: 'rgba(232,197,71,0.08)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: '120px', paddingBottom: 'var(--margo-page-padding-bottom)', paddingLeft: '24px', paddingRight: '24px' }}>
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
                <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  style={{ width: '100%', height: '64px', paddingLeft: '56px', paddingRight: '24px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', color: 'var(--text)', fontSize: '1rem', fontFamily: font, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {showResults && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', zIndex: 50 }}>
                  {searchLoading && <div style={{ textAlign: 'center', padding: '16px', fontFamily: font, color: 'var(--gold)', fontSize: '0.82rem' }}>Searching…</div>}
                  {searchResults.map((result) => (
                    <button key={result.source + '-' + result.id} onClick={() => handleSelectSong(result)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-faint)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      {result.artwork && <img src={result.artwork} alt={result.title} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: font, color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</p>
                        <p style={{ fontFamily: font, color: 'var(--text-3)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.artist}</p>
                      </div>
                      <span style={{
                        flexShrink: 0,
                        fontSize: '0.5rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        padding: '2px 8px',
                        borderRadius: '50px',
                        fontFamily: font,
                        color: result.source === 'margo' ? 'var(--gold)' : 'var(--text-3)',
                        border: result.source === 'margo' ? '1px solid var(--gold-border)' : '1px solid var(--border)',
                      }}>{sourceLabel(result.source)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Step 2: Line picker (Margo) or lyric input ── */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            {showLinePicker ? (
              <ComposeLinePicker
                lines={margoLines}
                loading={linesLoading}
                songTitle={songName}
                artistName={artistName}
                onPick={(line) => {
                  setSnippetStart(line.startSec)
                  setSnippetEnd(line.endSec)
                  setLyric((line.text || '').slice(0, 140))
                  setLinePickComplete(true)
                }}
                onSkip={() => {
                  setSnippetStart(null)
                  setSnippetEnd(null)
                  setLinePickComplete(true)
                }}
                onBack={() => {
                  setStep(1)
                  setSelectedSong(null)
                  setArtistName('')
                  setSongName('')
                  setLinkedSongId(null)
                  setLinkedAudioUrl(null)
                  setMargoLines([])
                  setLinePickComplete(false)
                  setSnippetStart(null)
                  setSnippetEnd(null)
                }}
              />
            ) : (
              <>
                <button style={backBtnStyle} onClick={() => {
                  if (selectedSong?.source === 'margo') {
                    setLinePickComplete(false)
                  } else {
                    setStep(1)
                    setSelectedSong(null)
                    setArtistName('')
                    setSongName('')
                    setLinkedSongId(null)
                    setLinkedAudioUrl(null)
                    setSnippetStart(null)
                    setSnippetEnd(null)
                  }
                }}>← Back</button>
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
                {snippetStart != null && snippetEnd != null && selectedSong?.source === 'margo' && (
                  <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--gold)', opacity: 0.85, textAlign: 'center', marginBottom: '12px' }}>
                    Snippet locked to a Margo lyric line
                  </p>
                )}
                <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '20px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '256px', height: '128px', background: 'rgba(232,197,71,0.1)', filter: 'blur(40px)', pointerEvents: 'none' }} />
                  <textarea value={lyric} onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                    placeholder="Type your lyric here..." rows={4}
                    style={{ width: '100%', background: 'transparent', fontSize: '1.5rem', fontFamily: font, fontStyle: 'italic', color: 'var(--gold)', textAlign: 'center', lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none', position: 'relative', zIndex: 10, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', position: 'relative', zIndex: 10 }}>
                    <span style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)' }}>{lyric.length}/140</span>
                    <button onClick={handleLyricComplete} disabled={lyric.trim().length === 0}
                      style={{ minHeight: 'var(--margo-touch-min)', padding: '0 24px', display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: lyric.trim().length === 0 ? 0.4 : 1 }}>Continue</button>
                  </div>
                </div>
              </>
            )}
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
                        minHeight: 'var(--margo-touch-min)', padding: '0 20px', borderRadius: '50px',
                        display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                        fontFamily: font, fontWeight: 600,
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
                      minHeight: 'var(--margo-touch-min)', padding: '0 36px',
                      display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                      background: selectedVibe ? 'var(--gold)' : 'transparent',
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

            {/* Display name banner — shown until customized once, or dismissed */}
            {showNameBanner && identity && (
              <div style={{ background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
                {!editingName ? (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '4px' }}>
                      You'll post as <strong style={{ color: 'var(--gold)' }}>{identity.displayName}</strong>
                    </p>
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
                      We gave you this name — it's yours on Margo. You can change how it's shown anytime.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => setBannerDismissed(true)}
                        style={{ padding: '9px 20px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>Keep It</button>
                      <button onClick={() => { setEditingName(true); setNameInput(identity.displayName) }}
                        style={{ padding: '9px 20px', background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: '50px', fontFamily: font, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '12px' }}>Choose how your name appears on posts.</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value.slice(0, 30))} maxLength={30} autoFocus
                        style={{ flex: 1, height: '44px', padding: '0 16px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '12px', color: 'var(--text)', fontFamily: font, fontSize: '0.9rem', outline: 'none' }} />
                      <button onClick={async () => { if (nameInput.trim()) { await updateDisplayName(nameInput); setEditingName(false); setBannerDismissed(true) } }} disabled={!nameInput.trim()}
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
              <button onClick={() => handlePost(false)} disabled={posting || identityLoading}
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

