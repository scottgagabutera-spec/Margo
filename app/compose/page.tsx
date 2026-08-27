'use client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, SearchIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { useIdentity } from '@/hooks/useIdentity'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { MomentCompletion } from '@/components/moment-completion'
import { ComposeSendTo } from '@/components/compose-send-to'
import { ComposeReadyPreview } from '@/components/compose-ready-preview'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { ComposeSearchDropdown } from '@/components/compose-search-dropdown'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle, keyboardSafeSecondaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { POST_LINES_MAX } from '@/lib/post-lines'
import { resolveMargoMomentFromComposeDrafts } from '@/lib/moment'
import { persistMomentPost } from '@/lib/moment/persist'
import { trackEvent } from '@/lib/analytics/track'
import { ComposeLyricCard, composeLyricTextStyle } from '@/components/compose-lyric-card'
import { UI_FONT } from '@/lib/fonts'
import { MARGO_EXPRESSION_TAGLINE } from '@/lib/margo-expression'

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
  externalListenUrl: string | null
}

interface SearchResult {
  id: string
  title: string
  artist: string
  artwork: string
  source: Source
  margoSongId?: string
  audioUrl?: string | null
  externalListenUrl?: string | null
}

type Vibe =
  | 'CHILL' | 'HOPE' | 'HEALING' | 'GRATEFUL' | 'SPIRITUAL'
  | 'NOSTALGIA' | 'JOY' | 'LOVE' | 'HYPE' | 'PROUD'
  | 'HEARTBREAK' | 'PAIN' | 'LONELINESS' | 'LOST'
  | 'RAGE' | 'SENDIT' | 'LETOUT'

// Grouped by emotional family (uplifting, reflective, heavy, release) rather
// than left in the Vibe type's declaration order — reads as intentional
// instead of a random word list, at no extra vertical cost.
const VIBES: Vibe[] = [
  'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'JOY', 'LOVE', 'HYPE', 'PROUD',
  'SPIRITUAL', 'NOSTALGIA',
  'HEARTBREAK', 'PAIN', 'LONELINESS', 'LOST', 'RAGE',
  'SENDIT', 'LETOUT',
]

const VIBE_LABELS: Record<Vibe, string> = {
  CHILL: 'Chill', HOPE: 'Hope', HEALING: 'Healing',
  GRATEFUL: 'Grateful', SPIRITUAL: 'Spiritual', NOSTALGIA: 'Nostalgia',
  JOY: 'Joy', LOVE: 'Love', HYPE: 'Hype', PROUD: 'Proud',
  HEARTBREAK: 'Heartbreak', PAIN: 'Pain', LONELINESS: 'Loneliness',
  LOST: 'Lost', RAGE: 'Rage', SENDIT: 'Send It', LETOUT: 'Let Out',
}

const font = 'var(--font-lora), serif'
const YOUR_LINE_CUE = 'Write your line…'
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
  color: 'var(--text-secondary, var(--text-2))', letterSpacing: '0.5px',
  marginBottom: '32px', padding: '0 12px', minHeight: 'var(--margo-touch-min)',
  display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box',
  transition: 'color 150ms ease',
}
type MomentLineDraft = { lyric: string; songName: string; artistName: string }

type CompletionMode = 'send' | 'public' | 'private'

function ComposeInner() {
  const { user, identity, loading: identityLoading, updateDisplayName } = useIdentity()
  const { requireAuth } = useAuthGate()
  const { isTabActive } = usePrimaryTab()
  const composeLive = isTabActive('compose')
  const searchParams = useSearchParams()
  const composeStartedRef = useRef(false)
  useEffect(() => {
    if (composeStartedRef.current) return
    composeStartedRef.current = true
    trackEvent('compose_started')
  }, [])

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
  const [postedId, setPostedId] = useState<string | null>(null)
  const [completionMode, setCompletionMode] = useState<CompletionMode | null>(null)
  const [showSendTo, setShowSendTo] = useState(false)
  const [sentToName, setSentToName] = useState<string | null>(null)
  const [linkedSongId, setLinkedSongId] = useState<string | null>(null)
  const [linkedAudioUrl, setLinkedAudioUrl] = useState<string | null>(null)
  /** Lines already stacked via “Add another line” (current draft is separate). */
  const [committedLines, setCommittedLines] = useState<ComposeLineDraft[]>([])
  // Committed lines + the in-progress draft for multi-line compose.
  const momentLines = useMemo<MomentLineDraft[]>(
    () => {
      const lines = committedLines.map((l) => ({ lyric: l.lyric, songName: l.songName, artistName: l.artistName }))
      if (lyric.trim() && songName.trim() && artistName.trim()) {
        lines.push({ lyric, songName, artistName })
      }
      return lines
    },
    [committedLines, lyric, songName, artistName],
  )
  // Exact snippet timing — either passed in directly from the player's
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
  const [searchFocused, setSearchFocused] = useState(false)

  // One-time "Write your line…" reveal — governs animation progress only.
  // Visibility (show/hide) is a separate, render-time check against
  // lyric.length so typing hides it instantly regardless of where the
  // animation was. Keyed on entering a fresh Your-line instance (a new
  // song pick, not every keystroke) so it plays once per draft line, not
  // once per session and not on every character typed.
  const [cueRevealChars, setCueRevealChars] = useState(0)
  const [portalMounted, setPortalMounted] = useState(false)
  useEffect(() => setPortalMounted(true), [])
  useEffect(() => {
    const onMargoCatalog = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
    const onWritingScreen = step === 2 && !(onMargoCatalog && !linePickComplete)
    if (!onWritingScreen) return
    if (lyric.length > 0) { setCueRevealChars(YOUR_LINE_CUE.length); return }
    setCueRevealChars(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setCueRevealChars(i)
      if (i >= YOUR_LINE_CUE.length) window.clearInterval(id)
    }, 45)
    return () => window.clearInterval(id)
  }, [step, selectedSong, linkedSongId, linePickComplete, lyric.length])

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
        const trackViewUrl = typeof r.trackViewUrl === 'string' ? r.trackViewUrl : null
        const geniusUrl = typeof r.geniusUrl === 'string' ? r.geniusUrl : null
        return {
          id: String(r.id || r.song),
          title: r.song,
          artist: r.artist,
          artwork: r.artwork || '',
          source,
          externalListenUrl: trackViewUrl || geniusUrl || null,
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

  const handleLyricSelected = useCallback(() => {
    trackEvent('lyric_selected')
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
    handleLyricSelected()
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
  }, [lyric, handleLyricSelected])

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
    externalListenUrl: selectedSong?.externalListenUrl ?? null,
  }), [lyric, songName, artistName, linkedSongId, linkedAudioUrl, selectedSong, snippetStart, snippetEnd])

  const allLineDrafts = useMemo(() => {
    const lines: ComposeLineDraft[] = [...committedLines]
    const draft = buildCurrentDraft()
    if (draft.lyric && draft.songName && draft.artistName) lines.push(draft)
    return lines
  }, [committedLines, buildCurrentDraft])

  const exportMoment = useMemo(() => {
    const drafts = [...committedLines]
    const draft = buildCurrentDraft()
    if (draft.lyric && draft.songName && draft.artistName) drafts.push(draft)
    return resolveMargoMomentFromComposeDrafts(drafts, {
      postId: postedId,
      vibeLabel: selectedVibe ? VIBE_LABELS[selectedVibe] : null,
      emotion: selectedVibe ? selectedVibe.toLowerCase() : null,
      status: completionMode === 'private' ? 'private' : 'active',
    })
  }, [committedLines, buildCurrentDraft, postedId, selectedVibe, completionMode])

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

  const restoreLineToDraft = useCallback((line: ComposeLineDraft) => {
    setLyric(line.lyric)
    setSongName(line.songName)
    setArtistName(line.artistName)
    setLinkedSongId(line.linkedSongId)
    setLinkedAudioUrl(line.linkedAudioUrl)
    setSnippetStart(line.snippetStart)
    setSnippetEnd(line.snippetEnd)
    setLinePickComplete(true)
    setMargoLines([])
    setLinesLoading(false)
    const src = line.source || (line.linkedSongId ? 'margo' : 'genius')
    setSelectedSong({
      id: line.linkedSongId || line.geniusId || 'draft',
      title: line.songName,
      artist: line.artistName,
      artwork: line.artwork || '',
      source: src,
      margoSongId: line.linkedSongId || undefined,
      audioUrl: line.linkedAudioUrl,
      externalListenUrl: line.externalListenUrl,
    })
  }, [])

  const clearCurrentSongPick = useCallback(() => {
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

  const handleStep1Back = useCallback(() => {
    const onResume = !!selectedSong && (lyric.trim().length > 0 || linePickComplete)
    if (onResume) {
      setStep(2)
      return
    }
    if (committedLines.length > 0) {
      const last = committedLines[committedLines.length - 1]
      setCommittedLines((prev) => prev.slice(0, -1))
      restoreLineToDraft(last)
      setStep(2)
      return
    }
    if (selectedSong) clearCurrentSongPick()
  }, [committedLines, selectedSong, lyric, linePickComplete, restoreLineToDraft, clearCurrentSongPick])

  const handleYourLineBack = useCallback(() => {
    // Margo catalog — always return to line picker (even when lines list is empty).
    const onMargoCatalog = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
    if (onMargoCatalog) {
      setLinePickComplete(false)
      resetComposeViewport()
      return
    }
    setStep(1)
    resetComposeViewport()
  }, [linkedSongId, selectedSong, resetComposeViewport])

  const handleLinePickerBack = useCallback(() => {
    setStep(1)
    clearCurrentSongPick()
  }, [clearCurrentSongPick])

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

  const persistMoment = useCallback(async (status: 'active' | 'private') => {
    if (!requireAuth()) return null
    if (!identity || !user) {
      setPostError('Still setting things up — try again in a moment.')
      return null
    }

    if (postedId) {
      if (status === 'private') {
        const { error } = await supabase
          .from('posts')
          .update({ status: 'private' })
          .eq('id', postedId)
        if (error) throw error
      }
      return postedId
    }

    const lines: ComposeLineDraft[] = [...committedLines]
    const draft = buildCurrentDraft()
    if (draft.lyric && draft.songName && draft.artistName) {
      lines.push(draft)
    }
    if (lines.length === 0) return null
    if (lines.length > POST_LINES_MAX) {
      setPostError(`Moments can hold up to ${POST_LINES_MAX} lines.`)
      return null
    }

    const authorId = user.id
    const { postId: newPostId } = await persistMomentPost(supabase, {
      lines: lines.map((line) => ({
        lyric: line.lyric,
        songName: line.songName,
        artistName: line.artistName,
        linkedSongId: line.linkedSongId,
        linkedAudioUrl: line.linkedAudioUrl,
        artwork: line.artwork,
        snippetStart: line.snippetStart,
        snippetEnd: line.snippetEnd,
        source: line.source,
        geniusId: line.geniusId,
        externalListenUrl: line.externalListenUrl,
      })),
      emotion: selectedVibe || null,
      status,
      authorId,
      lang: navigator.language.split('-')[0] || 'en',
    })

    setPostedId(newPostId)
    trackEvent('moment_created', { status })
    return newPostId
  }, [
    requireAuth, identity, user, postedId, buildCurrentDraft, committedLines,
    selectedVibe,
  ])

  const handleSendToSomeone = useCallback(async () => {
    setPosting(true)
    setPostError(null)
    try {
      const postId = await persistMoment('active')
      if (!postId) {
        setPosting(false)
        return
      }
      setPosting(false)
      trackEvent('send_opened')
      setShowSendTo(true)
    } catch (e) {
      console.error('Failed to persist moment for send:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [persistMoment])

  const handlePostToFeed = useCallback(async () => {
    setPosting(true)
    setPostError(null)
    try {
      const postId = await persistMoment('active')
      if (!postId) {
        setPosting(false)
        return
      }
      setPosting(false)
      trackEvent('moment_posted_public')
      setCompletionMode('public')
      resetComposeViewport()
    } catch (e) {
      console.error('Failed to post to feed:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [persistMoment, resetComposeViewport])

  const handleKeepPrivate = useCallback(async () => {
    setPosting(true)
    setPostError(null)
    try {
      const postId = await persistMoment('private')
      if (!postId) {
        setPosting(false)
        return
      }
      setPosting(false)
      trackEvent('moment_saved_private')
      setCompletionMode('private')
      resetComposeViewport()
    } catch (e) {
      console.error('Failed to save private moment:', e)
      setPostError('Something went wrong. Please try again.')
      setPosting(false)
    }
  }, [persistMoment, resetComposeViewport])

  const handleSendComplete = useCallback((name: string) => {
    trackEvent('moment_sent_dm')
    setSentToName(name)
    setShowSendTo(false)
    setCompletionMode('send')
    resetComposeViewport()
  }, [resetComposeViewport])

  const primaryLine = useMemo(() => {
    const draft = buildCurrentDraft()
    if (draft.lyric && draft.songName && draft.artistName) {
      return { lyric: draft.lyric, song: draft.songName, artist: draft.artistName }
    }
    const last = committedLines[committedLines.length - 1]
    if (last) {
      return { lyric: last.lyric, song: last.songName, artist: last.artistName }
    }
    return { lyric: '', song: '', artist: '' }
  }, [buildCurrentDraft, committedLines])

  if (completionMode) {
    return (
      <MomentCompletion
        mode={completionMode}
        moment={exportMoment}
        onDone={resetCompose}
        sentToName={sentToName}
      />
    )
  }

  // Show the name banner on step 4 until the person has customized their
  // displayName at least once, or dismissed it for this compose session.
  const showNameBanner = step === 4 && !!identity && identity.displayName === identity.username && !bannerDismissed
  const buttonsBlocked = showNameBanner && editingName
  const showStep1Resume = step === 1 && !!selectedSong && (lyric.trim().length > 0 || linePickComplete || committedLines.length > 0)
  const isMargoCatalogFlow = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
  const showLinePicker = step === 2 && isMargoCatalogFlow && !linePickComplete
  const showYourLinePanel = step === 2 && !showLinePicker

  return (
    <main ref={composeRootRef} style={{ minHeight: '100dvh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ paddingTop: 'calc(var(--nav-height, 72px) + 16px)', paddingBottom: 'calc(var(--margo-page-padding-bottom) + 88px)', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── Step 1: Search ── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            {(committedLines.length > 0 || showStep1Resume) && (
              <button
                type="button"
                onClick={handleStep1Back}
                style={backBtnStyle}
              ><ArrowLeftIcon size={16} color="currentColor" /> Back</button>
            )}
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
            {showStep1Resume ? (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--text)', marginBottom: '8px' }}>
                    {committedLines.length > 0 ? 'Add another line' : 'Your song'}
                  </h1>
                  <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {songName}{artistName ? (' · ' + artistName) : ''}
                  </p>
                </div>
                {lyric.trim() ? (
                  <p style={{
                    fontFamily: font, fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text)',
                    textAlign: 'center', margin: '0 0 20px', lineHeight: 1.45,
                  }}>
                    &ldquo;{lyric}&rdquo;
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    width: '100%', minHeight: 'var(--margo-touch-min)', borderRadius: '50px', border: 'none',
                    background: 'var(--gold)', color: 'var(--text-on-gold, var(--bg))',
                    fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer', marginBottom: '10px',
                  }}
                >Continue writing</button>
                <button
                  type="button"
                  onClick={clearCurrentSongPick}
                  style={{
                    width: '100%', minHeight: 'var(--margo-touch-min)', borderRadius: '50px',
                    border: '1px solid var(--border-hi)', background: 'transparent',
                    color: 'var(--text-secondary)', fontFamily: font, fontSize: '0.6rem',
                    letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >Choose a different song</button>
              </div>
            ) : (
              <>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h1 style={{
                fontFamily: font,
                fontStyle: 'italic',
                fontSize: '1.65rem',
                lineHeight: 1.35,
                color: 'var(--text)',
                margin: 0,
                maxWidth: '18rem',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}>
                {committedLines.length > 0 ? 'Add another line' : MARGO_EXPRESSION_TAGLINE}
              </h1>
              {committedLines.length === 0 ? (
                <p style={{
                  fontFamily: UI_FONT,
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.45,
                  margin: '10px 0 0',
                }}>
                  Search a song, pick your line, then send when you&apos;re ready.
                </p>
              ) : null}
            </div>
            <div style={{ position: 'relative', zIndex: 50 }}>
              <style>{`.compose-search-input::placeholder { color: var(--text-disabled); }`}</style>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}><SearchIcon size={20} color="var(--text-disabled)" /></span>
                <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search by lyric, song or artist..."
                  className="compose-search-input"
                  style={{
                    width: '100%', height: '64px', paddingLeft: '56px', paddingRight: '24px',
                    background: searchFocused ? 'var(--gold-faint)' : 'var(--surface-2)',
                    border: `1px solid ${searchFocused ? 'var(--gold-border)' : 'var(--border)'}`,
                    borderRadius: '16px', color: 'var(--text)', fontSize: '1rem', fontFamily: UI_FONT, outline: 'none', boxSizing: 'border-box',
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }} />
              </div>
              <ComposeSearchDropdown
                open={showResults}
                loading={searchLoading}
                results={searchResults}
                onSelect={handleSelectSong}
                onClose={() => setShowResults(false)}
              />
            </div>
              </>
            )}
          </div>

          {/* Step 2 UI is portaled (line picker + Your line) — see below main */}

          {/* ── Step 3: Vibe Selection ── */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <button style={backBtnStyle} onClick={() => {
              if (emotionLoading) emotionAbortRef.current?.abort()
              setStep(2)
            }}><ArrowLeftIcon size={16} color="currentColor" /> Back</button>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--text)', marginBottom: emotionLoading ? 0 : '8px' }}>
                {emotionLoading ? 'Finding the feeling…' : 'How does this feel?'}
              </h1>
              {!emotionLoading && suggestedVibe && (
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Change it if you&apos;d like.
                </p>
              )}
            </div>

            {/* Quiet reminder, not the full Moment — that already showed on
                Your line and shows again on Ready to post. This screen's
                job is the vibes; a fixed-height single-line strip keeps
                the layout predictable no matter how long the lyric is. */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '14px 16px', marginBottom: '20px',
            }}>
              <p style={{
                fontFamily: font, fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text)',
                margin: 0, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                &ldquo;{lyric}&rdquo;
              </p>
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.7rem', color: 'var(--text-secondary)',
                margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {songName}{artistName ? ` · ${artistName}` : ''}
              </p>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
                  {VIBES.map((vibe) => (
                    <button key={vibe} onClick={() => handleVibeSelect(vibe)}
                      style={{
                        minHeight: 'var(--margo-touch-min)', padding: '0 14px', borderRadius: '50px',
                        display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                        fontFamily: font, fontWeight: 600,
                        fontSize: '0.7rem', cursor: 'pointer', transition: 'all 150ms ease',
                        background: selectedVibe === vibe ? 'var(--gold)' : 'transparent',
                        color: selectedVibe === vibe ? 'var(--bg)' : 'var(--text-secondary)',
                        border: selectedVibe === vibe ? '1px solid var(--gold)' : '1px solid var(--border-hi)',
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
              <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--text)', marginBottom: committedLines.length > 0 ? '8px' : 0 }}>Ready to send?</h1>
              {committedLines.length > 0 && (
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Send it to someone, post to Feed, or keep it private.
                </p>
              )}
              {committedLines.length === 0 && (
                <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Send it to someone, post to Feed, or keep it private.
                </p>
              )}
            </div>

            <ComposeReadyPreview
              drafts={allLineDrafts}
              vibeLabel={selectedVibe ? VIBE_LABELS[selectedVibe] : null}
              suggestedVibeLabel={suggestedVibe ? VIBE_LABELS[suggestedVibe] : null}
            />

            {/* Display name banner — shown until customized once, or dismissed */}
            {showNameBanner && identity && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
                {!editingName ? (
                  <>
                    <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text)', marginBottom: '4px' }}>
                      You&apos;ll share as <strong style={{ color: 'var(--gold)' }}>{identity.displayName}</strong>
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
      {showLinePicker && !linesLoading && margoLines.length === 0 && portalMounted && createPortal(
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden} zIndex={85}>
          <button
            type="button"
            onClick={() => {
              setSnippetStart(null)
              setSnippetEnd(null)
              setLinePickComplete(true)
            }}
            style={keyboardSafePrimaryBtnStyle}
          >Continue without hearing it</button>
        </KeyboardSafeCtaBar>,
        document.body,
      )}

      {portalMounted && showLinePicker && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'var(--margo-vv-height, 100dvh)',
          zIndex: 80,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
          paddingLeft: '24px', paddingRight: '24px',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--margo-cta-bar-h, 0px) + var(--margo-tabbar-h, 80px) + 16px)',
          boxSizing: 'border-box',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
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
                handleLyricSelected()
              }}
              onSkip={() => {
                setSnippetStart(null)
                setSnippetEnd(null)
                setLinePickComplete(true)
              }}
              onBack={handleLinePickerBack}
            />
          </div>
        </div>,
        document.body,
      )}

      {showYourLinePanel && portalMounted && createPortal(
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden} zIndex={85}>
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
        </KeyboardSafeCtaBar>,
        document.body,
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
              onClick={() => { void handleSendToSomeone() }}
              disabled={posting || identityLoading}
              style={{ ...keyboardSafePrimaryBtnStyle, opacity: posting ? 0.7 : 1, cursor: posting ? 'not-allowed' : 'pointer' }}
            >{posting ? 'Saving…' : 'Send to someone'}</button>
            <button
              type="button"
              onClick={() => { void handlePostToFeed() }}
              disabled={posting || identityLoading}
              style={keyboardSafeSecondaryBtnStyle}
            >{posting ? 'Posting…' : 'Post to Feed'}</button>
            <button
              type="button"
              onClick={() => { void handleKeepPrivate() }}
              disabled={posting}
              style={{
                ...keyboardSafeSecondaryBtnStyle,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >Keep Private</button>
          </div>
        </KeyboardSafeCtaBar>
      )}

      {step === 4 && postedId && (
        <ComposeSendTo
          open={showSendTo}
          onOpenChange={setShowSendTo}
          postId={postedId}
          lyric={primaryLine.lyric}
          song={primaryLine.song}
          artist={primaryLine.artist}
          onSent={handleSendComplete}
        />
      )}

      {portalMounted && showYourLinePanel && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'var(--margo-vv-height, 100dvh)',
          zIndex: 80,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)',
          paddingLeft: '24px', paddingRight: '24px',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          transition: 'height 150ms ease',
          boxSizing: 'border-box',
        }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                aria-label="Back"
                onClick={handleYourLineBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center',
                  minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
                  padding: '0 8px', margin: '0 -8px', boxSizing: 'border-box',
                }}
              >
                <ArrowLeftIcon size={16} color="currentColor" />
                <span style={{ fontFamily: font, fontSize: '0.82rem', marginLeft: '6px', letterSpacing: '0.5px' }}>Back</span>
              </button>
              {chromeHidden && (
                <span style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', marginLeft: '4px' }}>
                  Your line
                </span>
              )}
            </div>

            {!chromeHidden && (
              <div style={{ flexShrink: 0, textAlign: 'center', margin: '16px 0 24px' }}>
                <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--text)', marginBottom: '8px' }}>Your line</h1>
              </div>
            )}

            <ComposeLyricCard style={{
              flex: 1, minHeight: 0, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              marginTop: chromeHidden ? '12px' : 0,
              padding: chromeHidden ? '16px' : '24px',
              transition: 'padding 150ms ease, margin 150ms ease',
            }}>
              <div style={{
                order: chromeHidden ? 0 : 2,
                flexShrink: 0,
                display: 'flex',
                flexDirection: chromeHidden ? 'row' : 'column',
                gap: '10px',
                marginBottom: chromeHidden ? '10px' : 0,
                marginTop: chromeHidden ? 0 : '16px',
                transition: 'all 150ms ease',
              }}>
                <div style={{ flex: chromeHidden ? '0 0 58%' : '1', minWidth: 0 }}>
                  <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-on-gold-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Song</label>
                  <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(7,6,10,0.18)',
                      padding: '4px 0 6px', fontFamily: UI_FONT, fontWeight: 600, color: 'var(--text-on-gold)', outline: 'none', boxSizing: 'border-box',
                      fontSize: chromeHidden ? '0.8rem' : '0.95rem',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'font-size 150ms ease',
                    }} />
                </div>
                <div style={{ flex: chromeHidden ? '0 0 38%' : '1', minWidth: 0 }}>
                  <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-on-gold-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Artist</label>
                  <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(7,6,10,0.18)',
                      padding: '4px 0 6px', fontFamily: UI_FONT, fontWeight: 400, color: 'var(--text-on-gold-muted)', outline: 'none', boxSizing: 'border-box',
                      fontSize: chromeHidden ? '0.7rem' : '0.75rem',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'font-size 150ms ease',
                    }} />
                </div>
              </div>

              <div style={{ order: 1, position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {lyric.length === 0 && (
                  <span aria-hidden style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    ...composeLyricTextStyle,
                    color: 'var(--text-on-gold-muted)',
                    pointerEvents: 'none',
                  }}>
                    {YOUR_LINE_CUE.slice(0, cueRevealChars)}
                  </span>
                )}
                <textarea value={lyric} onChange={(e) => setLyric(e.target.value.slice(0, 140))}
                  style={{
                    ...composeLyricTextStyle,
                    flex: 1,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                  }} />
              </div>

              <div style={{ order: 3, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', marginTop: chromeHidden ? '4px' : '10px' }}>
                <span style={{ fontFamily: UI_FONT, fontSize: '0.65rem', color: 'var(--text-on-gold-muted)' }}>{lyric.length}/140</span>
              </div>
            </ComposeLyricCard>

            <div style={{
              flexShrink: 0,
              height: chromeHidden
                ? 'var(--margo-cta-bar-h, 0px)'
                : 'calc(var(--margo-cta-bar-h, 0px) + var(--margo-tabbar-h, 80px) + 68px)',
              transition: 'height 150ms ease',
            }} />
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}

export default function ComposePage() {
  return <Suspense><ComposeInner /></Suspense>
}

