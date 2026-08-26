'use client'

import { useState, useCallback, useRef, Suspense, useEffect } from 'react'
import { SearchIcon } from '@/components/icons'
import { CardExportModal } from '@/components/card-export-modal'
import { AuthorMeta } from '@/components/username-tag'
import { createClient } from '@/lib/supabase/client'
import { matchLyricLine } from '@/lib/lyric-match'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { useEchoes } from '@/hooks/useEchoes'
import { useIdentity } from '@/hooks/useIdentity'
import { useSearchParams } from 'next/navigation'
import { usePost } from '@/hooks/usePost'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { PostCard } from '@/components/post-card'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { BackButton } from '@/components/back-button'
import { ComposeLyricCard, composeLyricTextStyle } from '@/components/compose-lyric-card'
import { SongMeta } from '@/components/song-meta'
import { VibeTag } from '@/components/vibe-tag'
import { useRouter } from 'next/navigation'
import { resolveMomentLines } from '@/lib/post-lines'
import { isNotificationAllowed } from '@/lib/notification-prefs'
import type { Post } from '@/hooks/usePosts'
import type { Echo } from '@/hooks/useEchoes'

const supabase = createClient()

type Source = 'genius' | 'apple' | 'margo'

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
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
const text2      = 'var(--text-secondary)'
const text3      = 'var(--text-secondary)'
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

/** Map Echo → Post contract consumed by shared PostCard (Step 1). */
function echoToPost(lb: Echo): Post {
  return {
    id: lb.id,
    text: lb.lyric,
    emotion: lb.emotion,
    status: lb.status,
    knowledge: (lb.song || lb.artist || lb.artwork)
      ? { song: lb.song || undefined, artist: lb.artist || undefined, artwork: lb.artwork ?? null }
      : undefined,
    username: lb.username,
    authorUid: lb.authorUid ?? null,
    authorAvatarUrl: lb.authorAvatarUrl ?? null,
    authorDisplayName: lb.displayName ?? null,
    timestamp: lb.timestamp,
    resonates: lb.resonateCount ?? 0,
    replies: lb.echoCount ?? 0,
    songId: lb.songId ?? null,
    audioUrl: lb.audioUrl ?? null,
    snippetStart: lb.snippetStart ?? null,
    snippetEnd: lb.snippetEnd ?? null,
  }
}

function LyricBackContent() {
  const router = useRouter()
  const { user } = useIdentity()
  const { requireAuth } = useAuthGate()
  const searchParams = useSearchParams()
  const postId = searchParams.get('postId')
  const echoId = searchParams.get('echoId')
  const catalogOnly = searchParams.get('catalogOnly') === '1'
  // FIX, Aug 1, 2026 (Section 8, item 15): previously echoId was read from
  // the URL but never used — "Responding to" always showed the top-level
  // post even when promoteAndReply linked to a specific echo. Now that
  // posts.parent_post_id supports real arbitrary-depth threading, replying
  // to a specific echo shows THAT echo as the parent, not its top-level
  // ancestor. respondingToId is also what gets written as parent_post_id
  // in handlePost below.
  const respondingToId = echoId || postId
  const { post: respondingTo } = usePost(respondingToId)
  // List Lyric Backs on the post being replied to (works for arbitrary depth).
  // Was useEchoes(postId): broke nesting when legacy ?echoId= was present —
  // PostCard now uses ?postId={replyId}, so respondingToId===postId in that path.
  const { echoes, loading: echoesLoading } = useEchoes(respondingToId)

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
  // Real FK lookup against Supabase songs, mirroring compose/page.tsx —
  // closes the pre-existing gap where lyric-back never linked a song at
  // all, meaning its posts could never be Tier1 / never get a snippet
  // button regardless of the audioUrl fix.
  const [linkedSongId, setLinkedSongId] = useState<string | null>(null)
  const [snippetStart, setSnippetStart] = useState<number | null>(null)
  const [snippetEnd, setSnippetEnd] = useState<number | null>(null)
  const [margoLines, setMargoLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [linePickComplete, setLinePickComplete] = useState(false)
  const [cardData, setCardData] = useState<{
    lyric: string; song: string; artist: string; id: string;
    parentLyric?: string; parentSong?: string; parentArtist?: string;
  } | null>(null)
  const [completionMode, setCompletionMode] = useState<'public' | 'private' | null>(null)
  const [completedParentId, setCompletedParentId] = useState<string | null>(null)
  const [sentSnapshot, setSentSnapshot] = useState<{
    lyric: string; songName: string; artistName: string; vibe: Vibe
  } | null>(null)
  const emotionAbortRef = useRef<AbortController | null>(null)
  const prefillAppliedRef = useRef(false)

  // Prefill from Suggested Lyric Back (or Moment → compose-style query).
  useEffect(() => {
    if (prefillAppliedRef.current) return
    const lyricParam = searchParams.get('lyric')
    const songParam = searchParams.get('song')
    const artistParam = searchParams.get('artist')
    if (!lyricParam || !songParam || !artistParam) return
    prefillAppliedRef.current = true
    setLyric(lyricParam.slice(0, 140))
    setSongName(songParam)
    setArtistName(artistParam)
    const songIdParam = searchParams.get('songId')
    if (songIdParam) {
      setLinkedSongId(songIdParam)
      setSelectedSong({
        id: songIdParam,
        title: songParam,
        artist: artistParam,
        artwork: searchParams.get('artwork') || '',
        source: 'margo',
        audioUrl: searchParams.get('audioUrl'),
      })
      setLinePickComplete(true)
    }
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    if (startParam != null && endParam != null) {
      const start = Number(startParam)
      const end = Number(endParam)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        setSnippetStart(start)
        setSnippetEnd(end)
      }
    }
    setStep(2)
  }, [searchParams])

  const enterCatalogSong = useCallback(async (songId: string, title: string, artist: string, artwork: string, audioUrl?: string | null) => {
    setSelectedSong({
      id: songId,
      title,
      artist,
      artwork: artwork || '',
      source: 'margo',
      audioUrl: audioUrl ?? null,
    })
    setSongName(title)
    setArtistName(artist)
    setLinkedSongId(songId)
    setSnippetStart(null)
    setSnippetEnd(null)
    setLyric('')
    setLinePickComplete(false)
    setMargoLines([])
    setLinesLoading(true)
    setShowResults(false)
    setStep(2)
    try {
      const { data, error } = await supabase
        .from('lyric_lines')
        .select('line_index, text, start_sec, end_sec')
        .eq('song_id', songId)
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
  }, [])

  /* ─── search ─────────────────────────────────────────────── */
  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value)
    if (value.length < 2) { setShowResults(false); setSearchResults([]); return }
    setShowResults(true)
    setSearchLoading(true)
    try {
      if (catalogOnly) {
        const hits = await searchMargoSongs(supabase, value, 8)
        setSearchResults(hits.map((r) => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          artwork: r.artwork || '',
          source: 'margo' as const,
          audioUrl: r.audioUrl,
        })))
      } else {
        // Compose-parity: catalog first, then Genius/Apple with normalized dedupe.
        const [margoHits, geniusRes] = await Promise.all([
          searchMargoSongs(supabase, value, 8),
          fetch(`/api/genius?song=${encodeURIComponent(value)}`)
            .then(async (res) => {
              if (!res.ok) return { results: [] as any[] }
              try {
                const data = await res.json()
                if (data?.error) return { results: [] as any[] }
                return data
              } catch {
                return { results: [] as any[] }
              }
            })
            .catch(() => ({ results: [] as any[] })),
        ])

        const margoMapped: SearchResult[] = margoHits.map((r) => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          artwork: r.artwork || '',
          source: 'margo' as const,
          audioUrl: r.audioUrl,
        }))
        const margoKeys = new Set(margoMapped.map((r) => songMatchKey(r.title, r.artist)))
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
        }).filter((r: SearchResult) => !margoKeys.has(songMatchKey(r.title, r.artist)))

        setSearchResults([...margoMapped, ...externalMapped].slice(0, 10))
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [catalogOnly])

  const handleSelectSong = useCallback(async (result: SearchResult) => {
    setShowResults(false)

    if (result.source === 'margo') {
      await enterCatalogSong(result.id, result.title, result.artist, result.artwork, result.audioUrl)
      return
    }

    try {
      const hit = await matchLiveCatalogSong(supabase, result.title, result.artist)
      if (hit) {
        await enterCatalogSong(hit.id, hit.title, hit.artist, hit.artwork || result.artwork, hit.audioUrl)
        return
      }
    } catch (e) {
      console.error('Song rematch failed:', e)
    }

    // External — free-text lyric (no synced lines).
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setLinkedSongId(null)
    setSnippetStart(null)
    setSnippetEnd(null)
    setLinePickComplete(true)
    setMargoLines([])
    setStep(2)
  }, [enterCatalogSong])

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
    setLinkedSongId(null)
    setSnippetStart(null)
    setSnippetEnd(null)
    setMargoLines([])
    setLinePickComplete(false)
    setCompletionMode(null)
    setCompletedParentId(null)
    setSentSnapshot(null)
  }, [])

  /* ─── post ───────────────────────────────────────────────── */
  const handlePost = useCallback(async (isPrivate: boolean) => {
    if (!requireAuth()) return
    if (posting) return
    if (!lyric || !songName || !artistName) return
    if (!selectedVibe) {
      setPostError('Choose a vibe before sending.')
      return
    }
    if (!user) {
      setPostError('Still setting things up — try again in a moment.')
      return
    }
    setPosting(true)
    setPostError(null)

    const authorId = user.id
    const parentId = respondingToId || null

    let resolvedStart: number | null = snippetStart
    let resolvedEnd: number | null = snippetEnd
    if (linkedSongId && (resolvedStart == null || resolvedEnd == null)) {
      const match = await matchLyricLine(supabase, linkedSongId, lyric)
      if (match) {
        resolvedStart = match.startSec
        resolvedEnd = match.endSec
      }
    }

    try {
      const res = await fetch('/api/posts/lyric-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPostId: parentId,
          isPrivate,
          text: lyric,
          emotion: selectedVibe,
          songId: linkedSongId || null,
          songTitle: songName,
          artistName,
          artworkUrl: !parentId ? (selectedSong?.artwork || null) : null,
          snippetStartSec: resolvedStart,
          snippetEndSec: resolvedEnd,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPostError(typeof payload.error === 'string' ? payload.error : 'Could not send your Lyric Back. Please try again.')
        return
      }

      const replyId = typeof payload.id === 'string' ? payload.id : null
      const replyStatus = payload.status === 'private' ? 'private' : 'public'

      fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lyric, postId: replyId }),
      }).catch(() => {})

      setSentSnapshot({
        lyric,
        songName,
        artistName,
        vibe: selectedVibe,
      })
      setCompletedParentId(parentId)
      setCompletionMode(replyStatus === 'private' ? 'private' : 'public')

      const parentAuthorId = respondingTo?.authorUid
      if (parentId && parentAuthorId && parentAuthorId !== authorId && !isPrivate) {
        try {
          if (await isNotificationAllowed(supabase, parentAuthorId, 'lyricBack')) {
            const { error: notifErr } = await supabase.from('notifications').insert({
              recipient_id: parentAuthorId,
              actor_id: authorId,
              type: 'lyric_back',
              post_id: parentId,
            })
            if (notifErr) console.error('Failed to insert lyric_back notification:', notifErr)
          }
        } catch (err) {
          console.error('Failed to insert lyric_back notification:', err)
        }
      }
    } catch (err) {
      console.error('Failed to post lyric back:', err)
      setPostError('Could not send your Lyric Back. Please try again.')
    } finally {
      setPosting(false)
    }
  }, [
    requireAuth, artistName, songName, lyric, selectedVibe, selectedSong, user,
    respondingToId, respondingTo?.authorUid, posting, linkedSongId, snippetStart, snippetEnd,
  ])

  /* ─── resonate ───────────────────────────────────────────── */
  // Echo resonates now write to the same post_resonates table as
  // top-level post resonates, since every echo is a real posts row with
  // its own id — the three separate resonate concepts flagged in
  // Section 8, item 14 (song-level / post-level / echo-level) collapse
  // to two now: song_resonates (unchanged) and post_resonates (covers
  // both top-level posts and echoes uniformly).
  const toggleResonate = async (echoId: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const myId = user.id
    const already = resonated.has(echoId)
    setResonated(prev => { const n = new Set(prev); already ? n.delete(echoId) : n.add(echoId); return n })
    setResonateCounts(prev => ({
      ...prev,
      [echoId]: Math.max(0,
        (prev[echoId] ?? echoes.find(e => e.id === echoId)?.resonateCount ?? Object.keys(echoes.find(e => e.id === echoId)?.resonates || {}).length)
        + (already ? -1 : 1)
      ),
    }))
    try {
      if (already) {
        const { error } = await supabase
          .from('post_resonates')
          .delete()
          .eq('post_id', echoId)
          .eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('post_resonates')
          .insert({ post_id: echoId, actor_id: myId })
        if (error) throw error
      }
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

  // The whole Moment is what Lyric Back responds to — for a 2/3-line
  // Moment, "Responding to" must show every line, not just the position-0
  // mirror (which is all it showed before). This does not change what a
  // Lyric Back replies to (still the whole post, one reply) — it only
  // fixes what the replier is shown while writing it.
  const respondingToLines = respondingTo ? resolveMomentLines(respondingTo) : []
  const respondingToMulti = respondingToLines.length > 1

  if (completionMode && sentSnapshot) {
    const isPrivateSave = completionMode === 'private'
    const parentHref = completedParentId ? `/post/${completedParentId}` : null
    return (
      <main style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '40px' }}>
          <button
            type="button"
            onClick={resetComposeForm}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: font, fontSize: '0.75rem', color: text2,
              letterSpacing: '0.5px', minHeight: 'var(--margo-touch-min)', padding: '0 12px',
              display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
              marginBottom: '20px',
            }}
          >Done</button>
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.5rem', color: text, marginBottom: '8px' }}>
            {isPrivateSave ? 'Saved privately.' : 'Sent.'}
          </p>
          <p style={{ fontFamily: font, fontSize: '0.82rem', color: text2, marginBottom: '28px', letterSpacing: '0.5px' }}>
            {isPrivateSave
              ? 'Only you can see this Lyric Back.'
              : 'Your Lyric Back was added to the conversation.'}
          </p>
          <ComposeLyricCard style={{ marginBottom: '20px', textAlign: 'left' }}>
            <p style={composeLyricTextStyle}>&ldquo;{sentSnapshot.lyric}&rdquo;</p>
            <div style={{ marginTop: '8px' }}>
              <SongMeta
                title={sentSnapshot.songName}
                artist={sentSnapshot.artistName}
                titleStyle={{ color: 'var(--text-on-gold)' }}
                artistStyle={{ color: 'var(--text-on-gold-muted)' }}
              />
            </div>
            <div style={{ position: 'relative', height: '22px', marginTop: '14px' }}>
              <VibeTag label={VIBE_LABELS[sentSnapshot.vibe]} color="var(--text-on-gold)" variant="dark" />
            </div>
          </ComposeLyricCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {parentHref && (
              <button
                type="button"
                onClick={() => router.push(parentHref)}
                style={{
                  width: '100%', padding: '15px 28px', minHeight: 'var(--margo-touch-min)',
                  background: gold, color: bg, borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none',
                  cursor: 'pointer', boxShadow: '0 6px 28px var(--gold-glow)',
                }}
              >View conversation</button>
            )}
            <button
              type="button"
              onClick={() => router.push('/feed')}
              style={{
                width: '100%', padding: '13px 28px', minHeight: 'var(--margo-touch-min)',
                background: 'transparent', color: text2, border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50px', fontFamily: font, fontSize: '0.6rem',
                letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >Back to Feed</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: bg, position: 'relative' }}>

      {/* Ambient glow — identical to feed */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)' }}>

        <div style={{ marginBottom: '16px' }}>
          <BackButton fallbackHref={respondingToId ? `/post/${respondingToId}` : '/feed'} />
        </div>

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
          <p style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Responding to
          </p>
          {respondingToLines.length === 0 ? (
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', color: text, lineHeight: 1.5, marginBottom: '10px' }}>
              &ldquo;—&rdquo;
            </p>
          ) : (
            respondingToLines.map((line, i) => (
              <div key={line.id || i}>
                {respondingToMulti && i > 0 && (
                  <p style={{
                    margin: '10px 0 8px', fontFamily: font, fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase', color: text3, textAlign: 'center',
                  }}>
                    stitch
                  </p>
                )}
                <div style={respondingToMulti ? { borderLeft: '2px solid rgba(232,197,71,0.25)', paddingLeft: '12px' } : undefined}>
                  <p style={{
                    fontFamily: font, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                    color: text, lineHeight: 1.5, marginBottom: (line.songTitle || line.artistName) ? '6px' : '10px',
                  }}>
                    &ldquo;{line.text}&rdquo;
                  </p>
                  {(line.songTitle || line.artistName) && (
                    <p style={{ fontFamily: font, fontSize: '0.6rem', color: text3, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      {line.songTitle && line.artistName
                        ? `${line.songTitle} · ${line.artistName}`
                        : line.songTitle || line.artistName}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {respondingTo && (
              <AuthorMeta
                authorUid={respondingTo.authorUid}
                fallbackName={respondingTo.username}
                size="compact"
                handlePrefix="by "
              />
            )}
            {parentVibeLabel && (
              <span style={{
                fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
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
              {catalogOnly ? "Find a line from Margo's music" : 'Find your lyric back'}
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}><SearchIcon size={15} color="var(--text-disabled)" /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by lyric, song or artist…"
                style={{
                  width: '100%', height: '44px', paddingLeft: '40px', paddingRight: '14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: text, fontSize: '0.82rem',
                  fontFamily: font, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {catalogOnly && (
              <p style={{ fontFamily: font, fontSize: '0.72rem', color: text3, marginTop: '10px' }}>
                Catalog only — Margo artists
              </p>
            )}
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

          {/* Step 2 — line picker (catalog) or free-text lyric */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            {selectedSong?.source === 'margo' && !linePickComplete ? (
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
                  setMargoLines([])
                  setLinePickComplete(false)
                  setSnippetStart(null)
                  setSnippetEnd(null)
                  setLyric('')
                }}
              />
            ) : (
              <>
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
              </>
            )}
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
                fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
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
              const post = echoToPost(lb)
              const resonateCount = resonateCounts[lb.id] ?? lb.resonateCount ?? 0
              return (
                <PostCard
                  key={lb.id}
                  variant="compact"
                  post={post}
                  resonated={resonated.has(lb.id)}
                  resonateCount={resonateCount}
                  echoCount={lb.echoCount ?? 0}
                  onResonate={toggleResonate}
                  onExport={(p) => {
                    if (!requireAuth()) return
                    setCardData({
                      lyric: p.text || '',
                      song: p.knowledge?.song || '',
                      artist: p.knowledge?.artist || '',
                      id: p.id,
                      parentLyric: respondingTo
                        ? resolveMomentLines(respondingTo).map((l) => l.text).join('  /  ')
                        : undefined,
                      parentSong: respondingTo?.knowledge?.song,
                      parentArtist: respondingTo?.knowledge?.artist,
                    })
                    setShowCard(true)
                  }}
                />
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