'use client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, SearchIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { matchLyricLine } from '@/lib/lyric-match'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { useIdentity } from '@/hooks/useIdentity'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { CardExportModal } from '@/components/card-export-modal'
import { ComposeSendTo } from '@/components/compose-send-to'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { ComposeSearchDropdown } from '@/components/compose-search-dropdown'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle, keyboardSafeSecondaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { POST_LINES_MAX, type PostLineSource } from '@/lib/post-lines'
import { ComposeLyricCard, composeLyricTextStyle } from '@/components/compose-lyric-card'
import { SongMeta } from '@/components/song-meta'
import { VibeTag } from '@/components/vibe-tag'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()

type Source = 'margo' | 'genius' | 'apple'

type ComposeLineDraft = {
  lyric: string
  songName: string
  artistName: string
  linkedSongId: string | null
  linkedAudioUrl: string | null
  artwork: string | null
  snippetStart: number | null
  snippetEnd: number | null
  source: Source | null
  geniusId: string | null
}

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
  color: 'var(--text-secondary, var(--text-2))', letterSpacing: '0.5px',
  marginBottom: '32px', padding: '0 12px', minHeight: 'var(--margo-touch-min)',
  display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box',
  transition: 'color 150ms ease',
}

function ComposeInner() {
  const router = useRouter()
  const { user, identity, loading: identityLoading, updateDisplayName } = useIdentity()
  const { requireAuth } = useAuthGate()
  const { isTabActive } = usePrimaryTab()
  const composeLive = isTabActive('compose')
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
  const [showSendTo, setShowSendTo] = useState(false)
  const [sentToName, setSentToName] = useState<string | null>(null)
  const [postedId, setPostedId] = useState<string | null>(null)
  const [completionMode, setCompletionMode] = useState<'public' | 'private' | null>(null)
  const [linkedSongId, setLinkedSongId] = useState<string | null>(null)
  const [linkedAudioUrl, setLinkedAudioUrl] = useState<string | null>(null)
  /** Lines already stacked via “Add another line” (current draft is separate). */
  const [committedLines, setCommittedLines] = useState<ComposeLineDraft[]>([])
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
  const composeRootRef = useRef<HTMLElement | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Must run before any early return (Rules of Hooks). Publishes --margo-keyboard-inset
  // and hides the mobile tab bar while typing / search sheet is open.
  const { keyboardOpen, chromeHidden } = useKeyboardSafeChrome(composeLive)

  const resetComposeViewport = useCallback(() => {
    if (typeof document !== 'undefined') {
      const active = document.activeElement
      if (active instanceof HTMLElement) active.blur()
    }
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
    composeRootRef.current?.scrollIntoView({ block: 'start' })
  }, [])

  useEffect(() => {
    resetComposeViewport()
  }, [step, linePickComplete, resetComposeViewport])

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

    const enterCatalog = async (songId: string, audioUrl: string | null, catalogTitle?: string, catalogArtist?: string) => {
      if (catalogTitle) setSongName(catalogTitle)
      if (catalogArtist) setArtistName(catalogArtist)
      setLinkedSongId(songId)
      setLinkedAudioUrl(audioUrl)
      setLinePickComplete(false)
      setMargoLines([])
      setLinesLoading(true)
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
    }

    if (result.source === 'margo') {
      await enterCatalog(result.margoSongId!, result.audioUrl || null)
      return
    }

    // External (Genius / Apple) — soft-rematch to live catalog when possible
    // so studio uploads still get tier-1 / line-picker treatment.
    setLinkedSongId(null)
    setLinkedAudioUrl(null)
    setLinePickComplete(true)
    setMargoLines([])

    try {
      const hit = await matchLiveCatalogSong(supabase, result.title, result.artist)
      if (hit) {
        setSelectedSong({
          id: hit.id,
          title: hit.title,
          artist: hit.artist,
          artwork: hit.artwork || result.artwork,
          source: 'margo',
          margoSongId: hit.id,
          audioUrl: hit.audioUrl,
        })
        await enterCatalog(hit.id, hit.audioUrl, hit.title, hit.artist)
        return
      }
    } catch (e) {
      console.error('Song rematch failed:', e)
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

  const buildCurrentDraft = useCallback((): ComposeLineDraft => ({
    lyric: lyric.trim(),
    songName: songName.trim(),
    artistName: artistName.trim(),
    linkedSongId,
    linkedAudioUrl,
    artwork: selectedSong?.artwork || null,
    snippetStart,
    snippetEnd,
    source: selectedSong?.source || (linkedSongId ? 'margo' : null),
    geniusId: selectedSong?.source && selectedSong.source !== 'margo' ? selectedSong.id : null,
  }), [lyric, songName, artistName, linkedSongId, linkedAudioUrl, selectedSong, snippetStart, snippetEnd])

  const clearDraftFields = useCallback(() => {
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])
    setSelectedSong(null)
    setArtistName('')
    setSongName('')
    setLyric('')
    setLinkedSongId(null)
    setLinkedAudioUrl(null)
    setSnippetStart(null)
    setSnippetEnd(null)
    setMargoLines([])
    setLinesLoading(false)
    setLinePickComplete(false)
  }, [])

  const handleAddAnotherLine = useCallback(() => {
    if (!requireAuth()) return
    if (!lyric.trim() || !songName.trim() || !artistName.trim()) return
    if (committedLines.length + 1 >= POST_LINES_MAX) return
    setCommittedLines((prev) => [...prev, buildCurrentDraft()])
    clearDraftFields()
    setStep(1)
    resetComposeViewport()
  }, [
    requireAuth, lyric, songName, artistName, committedLines.length,
    buildCurrentDraft, clearDraftFields, resetComposeViewport,
  ])

  const handlePost = useCallback(async (isPrivate: boolean) => {
    if (!requireAuth()) return
    if (!identity || !user) { setPostError('Still setting things up — try again in a moment.'); return }

    const draft = buildCurrentDraft()
    const lines: ComposeLineDraft[] = [...committedLines]
    if (draft.lyric && draft.songName && draft.artistName) {
      lines.push(draft)
    }
    if (lines.length === 0) return
    if (lines.length > POST_LINES_MAX) {
      setPostError(`Moments can hold up to ${POST_LINES_MAX} lines.`)
      return
    }

    setPosting(true)
    setPostError(null)

    const authorId = user.id

    try {
      const resolvedLines: ComposeLineDraft[] = []
      for (const line of lines) {
        let resolvedStart = line.snippetStart
        let resolvedEnd = line.snippetEnd
        if ((resolvedStart == null || resolvedEnd == null) && line.linkedSongId) {
          const match = await matchLyricLine(supabase, line.linkedSongId, line.lyric)
          if (match) {
            resolvedStart = match.startSec
            resolvedEnd = match.endSec
          }
        }
        resolvedLines.push({ ...line, snippetStart: resolvedStart, snippetEnd: resolvedEnd })
      }

      const mirror = resolvedLines[0]
      const { data, error: insertErr } = await supabase
        .from('posts')
        .insert({
          text: mirror.lyric,
          emotion: selectedVibe || null,
          status: isPrivate ? 'private' : 'active',
          flag_count: 0,
          song_id: mirror.linkedSongId || null,
          song_title: mirror.songName,
          artist_name: mirror.artistName,
          artwork_url: mirror.artwork || null,
          genius_id: mirror.geniusId || null,
          author_profile_id: authorId,
          parent_post_id: null,
          lang: navigator.language.split('-')[0] || 'en',
          snippet_start_sec: mirror.snippetStart,
          snippet_end_sec: mirror.snippetEnd,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      const newPostId = data.id
      setPostedId(newPostId)

      const lineRows = resolvedLines.map((line, position) => {
        const source: PostLineSource = line.linkedSongId
          ? 'catalog'
          : (line.source === 'margo' ? 'catalog' : 'external')
        return {
          post_id: newPostId,
          position,
          text: line.lyric,
          song_id: line.linkedSongId || null,
          song_title: line.songName,
          artist_name: line.artistName,
          artwork_url: line.artwork || null,
          snippet_start_sec: line.snippetStart,
          snippet_end_sec: line.snippetEnd,
          source,
        }
      })

      const { error: linesErr } = await supabase.from('post_lines').insert(lineRows)
      if (linesErr) {
        console.error('Failed to insert post_lines:', linesErr)
        // Post row already exists — surface soft error but continue completion.
      }

      fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: mirror.lyric, postId: newPostId }),
      }).catch(() => {})

      setPosting(false)
      setCompletionMode(isPrivate ? 'private' : 'public')
      resetComposeViewport()
    } catch (e) {
      console.error('Failed to post:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [
    requireAuth, identity, user, buildCurrentDraft, committedLines,
    selectedVibe, resetComposeViewport,
  ])


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
    setCompletionMode(null)
    setShowExport(false)
    setShowSendTo(false)
    setSentToName(null)
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
    setCommittedLines([])
  }

  if (completionMode) {
    const isPrivateSave = completionMode === 'private'
    return (
      <main ref={composeRootRef} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', paddingTop: '40px' }}>
          <button
            type="button"
            onClick={resetCompose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: font, fontSize: '0.75rem', color: 'var(--text-secondary, var(--text-2))',
              letterSpacing: '0.5px', minHeight: 'var(--margo-touch-min)', padding: '0 12px',
              display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
              marginBottom: '20px',
            }}
          >Done</button>
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '8px' }}>
            {isPrivateSave ? 'Saved privately.' : 'Send this to someone.'}
          </p>
          <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary, var(--text-2))', marginBottom: '32px', letterSpacing: '0.5px' }}>
            {isPrivateSave
              ? 'Only you can see this — it stays off the Feed.'
              : (sentToName ? 'Sent to ' + sentToName + '.' : 'This Moment is ready to send.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {!isPrivateSave && (
              <button
                type="button"
                onClick={() => { if (postedId) setShowSendTo(true) }}
                style={{
                  padding: '15px 28px', minHeight: 'var(--margo-touch-min)',
                  background: 'var(--gold)', color: 'var(--text-on-gold, var(--bg))',
                  borderRadius: '50px', fontFamily: font, fontWeight: 700,
                  fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                  border: 'none', cursor: postedId ? 'pointer' : 'default',
                  boxShadow: '0 6px 28px var(--gold-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxSizing: 'border-box',
                  opacity: postedId ? 1 : 0.5,
                }}
              >Send to someone</button>
            )}
            <button
              type="button"
              onClick={() => { setShowExport(true) }}
              style={{
                padding: '15px 28px', minHeight: 'var(--margo-touch-min)',
                background: isPrivateSave ? 'var(--gold)' : 'transparent',
                color: isPrivateSave ? 'var(--text-on-gold, var(--bg))' : 'var(--gold)',
                borderRadius: '50px', fontFamily: font, fontWeight: 700,
                fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
                border: isPrivateSave ? 'none' : '1px solid var(--gold-border)',
                cursor: 'pointer',
                boxShadow: isPrivateSave ? '0 6px 28px var(--gold-glow)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >{isPrivateSave ? 'Share as Card' : 'Send as card'}</button>
            <button
              type="button"
              onClick={() => router.push(isPrivateSave ? (identity?.username ? '/profile/' + identity.username : '/feed') : '/feed')}
              style={{
                padding: '13px 28px', minHeight: 'var(--margo-touch-min)',
                background: 'transparent', color: 'var(--text-secondary, var(--text-2))',
                border: '1px solid var(--border-hi)', borderRadius: '50px', fontFamily: font,
                fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >{isPrivateSave ? 'Back to your profile' : 'See it on the Feed'}</button>
          </div>
        </div>
        <CardExportModal
          open={showExport}
          onOpenChange={setShowExport}
          lyric={lyric} song={songName} artist={artistName} postId={postedId || undefined}
        />
        {!isPrivateSave && postedId && (
          <ComposeSendTo
            open={showSendTo}
            onOpenChange={setShowSendTo}
            postId={postedId}
            lyric={lyric}
            song={songName}
            artist={artistName}
            onSent={setSentToName}
          />
        )}
      </main>
    )
  }

  // Show the name banner on step 4 until the person has customized their
  // displayName at least once, or dismissed it for this compose session.
  const showNameBanner = step === 4 && !!identity && identity.displayName === identity.username && !bannerDismissed
  const buttonsBlocked = showNameBanner && editingName
  const showLinePicker = step === 2 && selectedSong?.source === 'margo' && !linePickComplete


  return (
    <main ref={composeRootRef} style={{ minHeight: '100dvh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '25%', left: '25%', width: '384px', height: '384px', background: 'rgba(232,197,71,0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '25%', right: '25%', width: '256px', height: '256px', background: 'rgba(232,197,71,0.08)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: '120px', paddingBottom: 'calc(var(--margo-page-padding-bottom) + 88px)', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── Step 1: Search ── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            {committedLines.length > 0 && (
              <div style={{
                marginBottom: '28px', padding: '14px 16px',
                border: '1px solid var(--border)', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <p style={{
                  fontFamily: font, fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: 'var(--gold)', marginBottom: '10px',
                }}>
                  Moment so far · {committedLines.length}/{POST_LINES_MAX} lines
                </p>
                {committedLines.map((line, i) => (
                  <p key={i} style={{
                    fontFamily: font, fontStyle: 'italic', fontSize: '0.9rem',
                    color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.4,
                  }}>
                    {i + 1}. &ldquo;{line.lyric}&rdquo;
                    <span style={{
                      display: 'block', fontStyle: 'normal', fontSize: '0.6rem',
                      color: 'var(--text-muted)', letterSpacing: '1px',
                      textTransform: 'uppercase', marginTop: '4px',
                    }}>
                      {line.songName} · {line.artistName}
                    </span>
                  </p>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: 0 }}>
                {committedLines.length > 0 ? 'Add another line' : 'Find your lyric'}
              </h1>
            </div>
            <div style={{ position: 'relative', zIndex: 50 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}><SearchIcon size={20} color="var(--text-disabled)" /></span>
                <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by lyric, song or artist..."
                  style={{ width: '100%', height: '64px', paddingLeft: '56px', paddingRight: '24px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', color: 'var(--text)', fontSize: '1rem', fontFamily: font, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <ComposeSearchDropdown
                open={showResults}
                loading={searchLoading}
                results={searchResults}
                onSelect={handleSelectSong}
                onClose={() => setShowResults(false)}
              />
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
                audioUrl={linkedAudioUrl}
                songId={linkedSongId}
                artwork={selectedSong?.artwork || null}
                stickySkip
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
                }}><ArrowLeftIcon size={16} color="currentColor" /> Back</button>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Your line</h1>
                  <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {selectedSong?.source === 'margo' ? 'Change a word if you need to.' : 'Type the lyric'}
                  </p>
                </div>
                <ComposeLyricCard hasAudio={!!linkedAudioUrl}>
                  <textarea value={lyric} onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                    rows={3}
                    style={{
                      ...composeLyricTextStyle,
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }} />
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Song</label>
                      <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '4px 0 6px', fontFamily: UI_FONT, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Artist</label>
                      <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '4px 0 6px', fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <span style={{ fontFamily: UI_FONT, fontSize: '0.65rem', color: 'var(--text-muted)' }}>{lyric.length}/140</span>
                  </div>
                </ComposeLyricCard>
              </>
            )}
          </div>

          {/* ── Step 3: Vibe Selection ── */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <button style={backBtnStyle} onClick={() => {
              if (emotionLoading) emotionAbortRef.current?.abort()
              setStep(2)
            }}><ArrowLeftIcon size={16} color="currentColor" /> Back</button>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: emotionLoading ? 0 : '8px' }}>
                {emotionLoading ? 'Finding the feeling…' : 'How does this feel?'}
              </h1>
              {!emotionLoading && (
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {suggestedVibe ? 'We picked one. Change it if that’s not it.' : 'Pick one.'}
                </p>
              )}
            </div>

            <ComposeLyricCard hasAudio={!!linkedAudioUrl} style={{ marginBottom: '24px' }}>
              <p style={composeLyricTextStyle}>&ldquo;{lyric}&rdquo;</p>
              <div style={{ marginTop: '12px' }}>
                <SongMeta title={songName} artist={artistName} />
              </div>
            </ComposeLyricCard>

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
                        fontSize: '0.7rem', cursor: 'pointer', transition: 'all 150ms ease',
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
                {/* Primary confirm lives in KeyboardSafeCtaBar */}
              </>
            )}
          </div>

          {/* ── Step 4: Preview + Post ── */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <button
              style={{ ...backBtnStyle, opacity: posting ? 0.4 : 1, cursor: posting ? 'not-allowed' : 'pointer' }}
              disabled={posting}
              onClick={() => { if (!posting) setStep(3) }}
            ><ArrowLeftIcon size={16} color="currentColor" /> Back</button>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Ready to send?</h1>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {committedLines.length > 0 ? 'Your multi-line moment is set to go' : 'Your lyric is set to go'}
              </p>
            </div>

            {(committedLines.length > 0) && (
              <div style={{
                marginBottom: '16px', padding: '12px 14px',
                border: '1px solid var(--border)', borderRadius: '12px',
              }}>
                {committedLines.map((line, i) => (
                  <p key={`c-${i}`} style={{
                    fontFamily: font, fontStyle: 'italic', fontSize: '0.9rem',
                    color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.4,
                  }}>
                    &ldquo;{line.lyric}&rdquo;
                  </p>
                ))}
              </div>
            )}

            <ComposeLyricCard hasAudio={!!linkedAudioUrl} style={{ marginBottom: '32px' }}>
              <p style={composeLyricTextStyle}>&ldquo;{lyric}&rdquo;</p>
              <div style={{ marginTop: '12px' }}>
                <SongMeta title={songName} artist={artistName} />
              </div>
              {selectedVibe && (
                <VibeTag label={VIBE_LABELS[selectedVibe]} color="var(--gold)" />
              )}
            </ComposeLyricCard>

            {/* Display name banner — shown until customized once, or dismissed */}
            {showNameBanner && identity && (
              <div style={{ background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
                {!editingName ? (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '4px' }}>
                      You'll send as <strong style={{ color: 'var(--gold)' }}>{identity.displayName}</strong>
                    </p>
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
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
                    <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Choose how your name appears.</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value.slice(0, 30))} maxLength={30} autoFocus
                        style={{ flex: 1, height: '44px', padding: '0 16px', background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '12px', color: 'var(--text)', fontFamily: font, fontSize: '0.9rem', outline: 'none' }} />
                      <button onClick={async () => { if (nameInput.trim()) { await updateDisplayName(nameInput); setEditingName(false); setBannerDismissed(true) } }} disabled={!nameInput.trim()}
                        style={{ padding: '0 20px', height: '44px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '12px', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', opacity: nameInput.trim() ? 1 : 0.4 }}>Confirm</button>
                      <button onClick={() => setEditingName(false)}
                        style={{ padding: '0 16px', height: '44px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', fontFamily: font, fontSize: '0.6rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {postError && (
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: '#ff6b6b', textAlign: 'center', marginBottom: '16px' }}>{postError}</p>
            )}

            {/* Post actions live in KeyboardSafeCtaBar */}
          </div>

        </div>
      </div>

      {/* Sticky primary actions — VisualViewport pins above keyboard */}
      {showLinePicker && !linesLoading && margoLines.length === 0 && (
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden}>
          <button
            type="button"
            onClick={() => {
              setSnippetStart(null)
              setSnippetEnd(null)
              setLinePickComplete(true)
            }}
            style={keyboardSafePrimaryBtnStyle}
          >Continue without hearing it</button>
        </KeyboardSafeCtaBar>
      )}

      {step === 2 && !showLinePicker && (
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleLyricComplete}
              disabled={lyric.trim().length === 0}
              style={{ ...keyboardSafePrimaryBtnStyle, opacity: lyric.trim().length === 0 ? 0.4 : 1 }}
            >Continue</button>
            {committedLines.length + 1 < POST_LINES_MAX && (
              <button
                type="button"
                onClick={handleAddAnotherLine}
                disabled={lyric.trim().length === 0 || !songName.trim() || !artistName.trim()}
                style={{
                  ...keyboardSafeSecondaryBtnStyle,
                  opacity: (lyric.trim().length === 0 || !songName.trim() || !artistName.trim()) ? 0.4 : 1,
                }}
              >Add another line</button>
            )}
          </div>
        </KeyboardSafeCtaBar>
      )}

      {step === 3 && !emotionLoading && (
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden}>
          <button
            type="button"
            onClick={handleConfirmVibe}
            disabled={!selectedVibe}
            style={{
              ...keyboardSafePrimaryBtnStyle,
              opacity: selectedVibe ? 1 : 0.5,
              cursor: selectedVibe ? 'pointer' : 'not-allowed',
              background: selectedVibe ? 'var(--gold)' : 'transparent',
              color: selectedVibe ? 'var(--text-on-gold, var(--bg))' : 'var(--text-muted)',
              border: selectedVibe ? 'none' : '1px solid var(--border)',
              boxShadow: selectedVibe ? keyboardSafePrimaryBtnStyle.boxShadow : 'none',
            }}
          >Continue</button>
        </KeyboardSafeCtaBar>
      )}

      {step === 4 && (
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden}>
          <div style={{ opacity: buttonsBlocked ? 0.4 : 1, pointerEvents: buttonsBlocked ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handlePost(false)}
              disabled={posting || identityLoading}
              style={{ ...keyboardSafePrimaryBtnStyle, opacity: posting ? 0.7 : 1, cursor: posting ? 'not-allowed' : 'pointer' }}
            >{posting ? 'Sending…' : 'Send'}</button>
            <button
              type="button"
              onClick={() => handlePost(true)}
              disabled={posting}
              style={keyboardSafeSecondaryBtnStyle}
            >Keep Private</button>
          </div>
        </KeyboardSafeCtaBar>
      )}
    </main>
  )
}

export default function ComposePage() {
  return <Suspense><ComposeInner /></Suspense>
}

