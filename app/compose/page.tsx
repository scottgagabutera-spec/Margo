'use client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, CardIcon, CloseIcon, MusicNoteIcon, PenLineIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { useIdentity } from '@/hooks/useIdentity'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { MomentCompletion } from '@/components/moment-completion'
import { ComposeSendTo } from '@/components/compose-send-to'
import { ComposeReadyPreview } from '@/components/compose-ready-preview'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { ComposeSearchDropdown } from '@/components/compose-search-dropdown'
import { StageSearchField } from '@/components/stage/stage-search-field'
import { MomentShareStudio } from '@/components/moment-share-studio'
import { MargoSheet } from '@/components/margo-sheet'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle, keyboardSafeSecondaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { POST_LINES_MAX } from '@/lib/post-lines'
import { resolveMargoMomentFromComposeDrafts, emotionToVibeLabel, vibeLabelToEmotion } from '@/lib/moment'
import { persistMomentPost } from '@/lib/moment/persist'
import { trackEvent } from '@/lib/analytics/track'
import { ComposeLyricCard, composeLyricTextStyle } from '@/components/compose-lyric-card'
import { UI_FONT } from '@/lib/fonts'
import { MARGO_EXPRESSION_TAGLINE } from '@/lib/margo-expression'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import {
  clearMomentDraft,
  consumeComposePendingAction,
  consumeComposePendingSendRecipient,
  disarmComposePendingAction,
  hasMeaningfulDraftWork,
  loadMomentDraft,
  saveMomentDraft,
  setComposePendingAction,
  setComposePendingSendRecipient,
  type ComposePendingAction,
  type ComposePendingSendRecipient,
  type MomentDraft,
  type MomentPhase,
} from '@/lib/moment-draft'

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

type CompletionMode = 'send' | 'public' | 'private'

function vibeKeyToLabel(vibe: Vibe | null): string | null {
  if (!vibe) return null
  return emotionToVibeLabel(vibe.toLowerCase())
}

function labelToVibeKey(label: string): Vibe | null {
  const emotion = vibeLabelToEmotion(label)
  if (!emotion) return null
  return emotion.toUpperCase() as Vibe
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
/** Quiet utilities under the Moment card — not destination CTAs. */
const composeToolBtnStyle: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 'var(--margo-touch-min)',
  padding: '6px 4px',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  WebkitTapHighlightColor: 'transparent',
}
const composeToolLabelStyle: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  lineHeight: 1.2,
}
/** Post / Private share one sticky row — same 44px target, no wrap. */
const momentSplitSecondaryStyle: React.CSSProperties = {
  ...keyboardSafeSecondaryBtnStyle,
  flex: 1,
  width: 'auto',
  minWidth: 0,
  whiteSpace: 'nowrap',
  letterSpacing: '0.7px',
  background: 'var(--surface-2)',
}
const momentSplitPrivateStyle: React.CSSProperties = {
  ...momentSplitSecondaryStyle,
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
}

function ComposeDismissButton({
  onClick,
  label = 'Cancel',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <CloseIcon size={18} color="currentColor" />
    </button>
  )
}

const composeOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'var(--nav-height, 72px)',
  left: 0,
  right: 0,
  height: 'calc(var(--margo-vv-height, 100dvh) - var(--nav-height, 72px))',
  zIndex: 80,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  paddingLeft: '24px',
  paddingRight: '24px',
  paddingTop: '12px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

function ComposeTopBar({
  onBack,
  backDisabled,
  title,
  trailing,
}: {
  onBack?: () => void
  backDisabled?: boolean
  title?: string
  trailing?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(64px, 1fr) auto minmax(64px, 1fr)',
      alignItems: 'center',
      columnGap: '8px',
      minHeight: 'var(--margo-touch-min)',
      marginBottom: title ? '16px' : '8px',
      flexShrink: 0,
    }}>
      <div>
        {onBack ? (
          <button
            type="button"
            aria-label="Back"
            disabled={backDisabled}
            onClick={onBack}
            style={{
              ...backBtnStyle,
              marginBottom: 0,
              opacity: backDisabled ? 0.4 : 1,
              cursor: backDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowLeftIcon size={16} color="currentColor" /> Back
          </button>
        ) : null}
      </div>
      {title ? (
        <h1 style={{
          fontFamily: font,
          fontStyle: 'italic',
          fontSize: '1.15rem',
          fontWeight: 400,
          color: 'var(--text)',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.25,
          letterSpacing: '0.2px',
        }}>
          {title}
        </h1>
      ) : <span />}
      <div style={{ justifySelf: 'end' }}>{trailing}</div>
    </div>
  )
}
function buildDraftSnapshot(state: {
  entryPoint: string
  phase: MomentPhase
  selectMode: 'picker' | 'write' | null
  committedLines: ComposeLineDraft[]
  lyric: string
  songName: string
  artistName: string
  selectedSong: SearchResult | null
  linkedSongId: string | null
  linkedAudioUrl: string | null
  snippetStart: number | null
  snippetEnd: number | null
  linePickComplete: boolean
  selectedVibe: Vibe | null
  suggestedVibe: Vibe | null
  vibeUserPicked: boolean
  themeId: StageCardThemeId
  parentPostId: string | null
  pendingAction: ComposePendingAction | null
  pendingSendRecipient: ComposePendingSendRecipient | null
  persistedPostId: string | null
  searchQuery: string
}): MomentDraft {
  return {
    version: 1,
    entryPoint: state.entryPoint,
    phase: state.phase,
    selectMode: state.selectMode,
    committedLines: state.committedLines,
    lyric: state.lyric,
    songName: state.songName,
    artistName: state.artistName,
    selectedSong: state.selectedSong
      ? {
          id: state.selectedSong.id,
          title: state.selectedSong.title,
          artist: state.selectedSong.artist,
          artwork: state.selectedSong.artwork,
          source: state.selectedSong.source,
          margoSongId: state.selectedSong.margoSongId,
          audioUrl: state.selectedSong.audioUrl,
          externalListenUrl: state.selectedSong.externalListenUrl,
        }
      : null,
    linkedSongId: state.linkedSongId,
    linkedAudioUrl: state.linkedAudioUrl,
    snippetStart: state.snippetStart,
    snippetEnd: state.snippetEnd,
    linePickComplete: state.linePickComplete,
    vibe: state.selectedVibe,
    vibeSuggested: state.suggestedVibe,
    vibeUserPicked: state.vibeUserPicked,
    themeId: state.themeId,
    parentPostId: state.parentPostId,
    pendingAction: state.pendingAction,
    pendingSendRecipient: state.pendingSendRecipient,
    persistedPostId: state.persistedPostId,
    searchQuery: state.searchQuery,
  }
}

function ComposeInner() {
  const { user, identity, loading: identityLoading, updateDisplayName } = useIdentity()
  const { requireAuth, authGateOpen } = useAuthGate()
  const { isTabActive } = usePrimaryTab()
  const composeLive = isTabActive('compose')
  const searchParams = useSearchParams()
  const composeStartedRef = useRef(false)
  const prefillHandledRef = useRef(false)
  const draftRestoredRef = useRef(false)
  const prevAuthGateOpenRef = useRef(false)
  useEffect(() => {
    if (composeStartedRef.current) return
    composeStartedRef.current = true
    trackEvent('compose_started')
  }, [])

  const [entryPoint, setEntryPoint] = useState('pen')
  const [phase, setPhase] = useState<MomentPhase>('find')
  const [selectMode, setSelectMode] = useState<'picker' | 'write' | null>(null)
  const [pendingAction, setPendingActionState] = useState<ComposePendingAction | null>(null)
  const [pendingSendRecipient, setPendingSendRecipientState] = useState<ComposePendingSendRecipient | null>(null)
  const [autoSendPerson, setAutoSendPerson] = useState<{
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null>(null)
  const [themeId, setThemeId] = useState<StageCardThemeId>('gold')
  const [vibeUserPicked, setVibeUserPicked] = useState(false)
  const [parentPostId] = useState<string | null>(searchParams.get('parentPostId'))
  const [showExportStudio, setShowExportStudio] = useState(false)
  const [startOverConfirm, setStartOverConfirm] = useState(false)

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
    if (prefillHandledRef.current) return
    const lyricParam = searchParams.get('lyric')
    const songParam = searchParams.get('song')
    const artistParam = searchParams.get('artist')
    if (lyricParam && songParam && artistParam) {
      prefillHandledRef.current = true
      draftRestoredRef.current = true
      setEntryPoint(searchParams.get('source') || 'landing')
      const artworkParam = searchParams.get('artwork')
      setLyric(lyricParam)
      setSongName(songParam)
      setArtistName(artistParam)
      if (artworkParam) {
        setSelectedSong({
          id: 'player',
          title: songParam,
          artist: artistParam,
          artwork: artworkParam,
          source: 'apple',
        })
      }
      const songIdParam = searchParams.get('songId')
      const audioUrlParam = searchParams.get('audioUrl')
      if (songIdParam) setLinkedSongId(songIdParam)
      if (audioUrlParam) setLinkedAudioUrl(audioUrlParam)
      const startParam = searchParams.get('start')
      const endParam = searchParams.get('end')
      if (startParam) setSnippetStart(parseFloat(startParam))
      if (endParam) setSnippetEnd(parseFloat(endParam))
      setLinePickComplete(true)
      setSelectMode('write')
      setPhase('moment')
      return
    }
    if (draftRestoredRef.current) return
    const saved = loadMomentDraft()
    if (saved && hasMeaningfulDraftWork(saved)) {
      draftRestoredRef.current = true
      prefillHandledRef.current = true
      setEntryPoint(saved.entryPoint)
      setPhase(saved.phase === 'success' ? 'find' : saved.phase)
      setSelectMode(saved.selectMode)
      setCommittedLines(saved.committedLines as ComposeLineDraft[])
      setLyric(saved.lyric)
      setSongName(saved.songName)
      setArtistName(saved.artistName)
      setLinkedSongId(saved.linkedSongId)
      setLinkedAudioUrl(saved.linkedAudioUrl)
      setSnippetStart(saved.snippetStart)
      setSnippetEnd(saved.snippetEnd)
      setLinePickComplete(saved.linePickComplete)
      setSelectedVibe(saved.vibe as Vibe | null)
      setSuggestedVibe(saved.vibeSuggested as Vibe | null)
      setVibeUserPicked(saved.vibeUserPicked)
      setThemeId(saved.themeId)
      if (saved.pendingAction) {
        setPendingActionState(saved.pendingAction)
        setComposePendingAction(saved.pendingAction)
      }
      if (saved.pendingSendRecipient) {
        setPendingSendRecipientState(saved.pendingSendRecipient)
        setComposePendingSendRecipient(saved.pendingSendRecipient)
      }
      setPostedId(saved.persistedPostId ?? null)
      setSearchQuery(saved.searchQuery || '')
      if (saved.selectedSong) {
        setSelectedSong({
          id: saved.selectedSong.id,
          title: saved.selectedSong.title,
          artist: saved.selectedSong.artist,
          artwork: saved.selectedSong.artwork,
          source: saved.selectedSong.source,
          margoSongId: saved.selectedSong.margoSongId,
          audioUrl: saved.selectedSong.audioUrl,
          externalListenUrl: saved.selectedSong.externalListenUrl,
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onMargoCatalog = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
    const onWritingScreen = phase === 'select' && !(onMargoCatalog && !linePickComplete)
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
  }, [phase, selectedSong, linkedSongId, linePickComplete, lyric.length])

  // Must run before any early return (Rules of Hooks). Publishes --margo-keyboard-inset
  // and hides the mobile tab bar while typing / search sheet is open.
  const { keyboardOpen } = useKeyboardSafeChrome(composeLive)

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
  }, [phase, linePickComplete, resetComposeViewport])

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
      setSelectMode('picker')
      setMargoLines([])
      setLinesLoading(true)
      setPhase('select')
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
    setSelectMode('write')
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

    setPhase('select')
  }, [])

  const handleLyricSelected = useCallback(() => {
    trackEvent('lyric_selected')
  }, [])

  const fetchEmotionSuggestion = useCallback(async (text: string, preserveUserVibe: boolean) => {
    if (!text.trim()) return
    if (emotionAbortRef.current) emotionAbortRef.current.abort()
    const controller = new AbortController()
    emotionAbortRef.current = controller
    setEmotionLoading(true)
    if (!preserveUserVibe) {
      setSuggestedVibe(null)
    }
    try {
      const res = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyric: text }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.emotion) {
        setSuggestedVibe(data.emotion as Vibe)
        if (!preserveUserVibe) setSelectedVibe(data.emotion as Vibe)
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') console.error('Emotion fetch failed:', e)
    } finally {
      setEmotionLoading(false)
    }
  }, [])

  const enterMoment = useCallback(() => {
    if (!lyric.trim()) return
    handleLyricSelected()
    setPhase('moment')
    void fetchEmotionSuggestion(lyric, vibeUserPicked)
  }, [lyric, handleLyricSelected, fetchEmotionSuggestion, vibeUserPicked])

  const handleLyricComplete = useCallback(() => {
    enterMoment()
  }, [enterMoment])

  const handleVibeLabelSelect = useCallback((label: string) => {
    const vibe = labelToVibeKey(label)
    if (!vibe) return
    setSelectedVibe(vibe)
    setVibeUserPicked(true)
  }, [])

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
      vibeLabel: selectedVibe ? vibeKeyToLabel(selectedVibe) : null,
      emotion: selectedVibe ? selectedVibe.toLowerCase() : null,
      themeId,
      status: completionMode === 'private' ? 'private' : 'active',
    })
  }, [committedLines, buildCurrentDraft, postedId, selectedVibe, themeId, completionMode])

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

  const handleFindBack = useCallback(() => {
    const onResume = !!selectedSong && (lyric.trim().length > 0 || linePickComplete)
    if (onResume) {
      setPhase('select')
      return
    }
    if (committedLines.length > 0) {
      setPhase('moment')
      return
    }
  }, [committedLines.length, selectedSong, lyric, linePickComplete])

  const handleYourLineBack = useCallback(() => {
    // Margo catalog — always return to line picker (even when lines list is empty).
    const onMargoCatalog = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
    if (onMargoCatalog) {
      setLinePickComplete(false)
      resetComposeViewport()
      return
    }
    setPhase('find')
    resetComposeViewport()
  }, [linkedSongId, selectedSong, resetComposeViewport])

  const handleCancelLine = useCallback(() => {
    if (committedLines.length > 0) {
      clearDraftFields()
      setPhase('moment')
      resetComposeViewport()
      return
    }
    clearCurrentSongPick()
    setSelectMode(null)
    setPhase('find')
    resetComposeViewport()
  }, [committedLines.length, clearDraftFields, clearCurrentSongPick, resetComposeViewport])

  const handleLinePickerBack = useCallback(() => {
    setPhase('find')
    resetComposeViewport()
  }, [resetComposeViewport])

  const handleAddAnotherLine = useCallback(() => {
    if (!lyric.trim() || !songName.trim() || !artistName.trim()) return
    if (committedLines.length + 1 >= POST_LINES_MAX) return
    setCommittedLines((prev) => [...prev, buildCurrentDraft()])
    clearDraftFields()
    setPhase('find')
    resetComposeViewport()
  }, [
    lyric, songName, artistName, committedLines.length,
    buildCurrentDraft, clearDraftFields, resetComposeViewport,
  ])

  const handleChangeSong = useCallback(() => {
    if (lyric.trim() && !window.confirm('Change song? Your current line will be cleared.')) return
    clearCurrentSongPick()
    setSelectMode(null)
    setPhase('find')
    resetComposeViewport()
  }, [lyric, clearCurrentSongPick, resetComposeViewport])

  const handleRemoveCommittedLine = useCallback((index: number) => {
    setCommittedLines((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleStartOver = useCallback(() => {
    const snapshot = buildDraftSnapshot({
      entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
      selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
      selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingAction,
      pendingSendRecipient, persistedPostId: postedId, searchQuery,
    })
    if (!hasMeaningfulDraftWork(snapshot)) {
      resetCompose(true)
      return
    }
    setStartOverConfirm(true)
  }, [
    entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
    selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
    selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingAction,
    pendingSendRecipient, postedId, searchQuery,
  ])

  const confirmStartOver = useCallback(() => {
    setStartOverConfirm(false)
    resetCompose(true)
  }, [])

  const resetCompose = (createAnother = false) => {
    clearMomentDraft()
    setComposePendingAction(null)
    setPhase('find')
    setSelectMode(null)
    setEntryPoint(createAnother ? 'pen' : entryPoint)
    setSearchQuery('')
    setSelectedSong(null)
    setArtistName('')
    setSongName('')
    setLyric('')
    setSelectedVibe(null)
    setSuggestedVibe(null)
    setVibeUserPicked(false)
    setThemeId('gold')
    setPendingActionState(null)
    setPendingSendRecipientState(null)
    setAutoSendPerson(null)
    setPostedId(null)
    setCompletionMode(null)
    setShowSendTo(false)
    setShowExportStudio(false)
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
    setStartOverConfirm(false)
  }

  const persistMoment = useCallback(async (status: 'active' | 'private') => {
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
  }, [identity, user, postedId, buildCurrentDraft, committedLines, selectedVibe])

  const runPendingAction = useCallback((action: ComposePendingAction) => {
    if (action === 'post') {
      void (async () => {
        setPosting(true)
        setPostError(null)
        try {
          const postId = await persistMoment('active')
          if (!postId) { setPosting(false); return }
          setPosting(false)
          trackEvent('moment_posted_public')
          setPhase('success')
          setCompletionMode('public')
          clearMomentDraft()
          resetComposeViewport()
        } catch (e) {
          console.error('Failed to post to feed:', e)
          setPostError('Something went wrong. Please try again.')
          setPosting(false)
        }
      })()
      return
    }
    if (action === 'private') {
      void (async () => {
        setPosting(true)
        setPostError(null)
        try {
          const postId = await persistMoment('private')
          if (!postId) { setPosting(false); return }
          setPosting(false)
          trackEvent('moment_saved_private')
          setPhase('success')
          setCompletionMode('private')
          clearMomentDraft()
          resetComposeViewport()
        } catch (e) {
          console.error('Failed to save private moment:', e)
          setPostError('Something went wrong. Please try again.')
          setPosting(false)
        }
      })()
    }
  }, [persistMoment, resetComposeViewport])

  const gateAction = useCallback((action: ComposePendingAction, runner: () => void) => {
    if (user) {
      runner()
      return
    }
    setPendingActionState(action)
    setComposePendingAction(action)
    saveMomentDraft(buildDraftSnapshot({
      entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
      selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
      selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingAction: action,
      pendingSendRecipient, persistedPostId: postedId, searchQuery,
    }))
    requireAuth({ returnTo: '/compose' })
  }, [
    user, entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
    selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
    selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingSendRecipient,
    postedId, searchQuery, requireAuth,
  ])

  const handleSendToSomeone = useCallback(() => {
    trackEvent('send_opened')
    setPhase('action')
    setShowSendTo(true)
  }, [])

  const handleSendAuthRequired = useCallback((person: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }) => {
    const recipient: ComposePendingSendRecipient = {
      id: person.id,
      username: person.username,
      displayName: person.displayName,
      avatarUrl: person.avatarUrl,
    }
    setPendingActionState('send')
    setComposePendingAction('send')
    setComposePendingSendRecipient(recipient)
    setPendingSendRecipientState(recipient)
    saveMomentDraft(buildDraftSnapshot({
      entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
      selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
      selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId,
      pendingAction: 'send', pendingSendRecipient: recipient,
      persistedPostId: postedId, searchQuery,
    }))
    requireAuth({ returnTo: '/compose' })
  }, [
    entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
    selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
    selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId,
    postedId, searchQuery, requireAuth,
  ])

  const handlePostToFeed = useCallback(() => {
    gateAction('post', () => runPendingAction('post'))
  }, [gateAction, runPendingAction])

  const handleKeepPrivate = useCallback(() => {
    gateAction('private', () => runPendingAction('private'))
  }, [gateAction, runPendingAction])

  const handleAddLineFromMoment = useCallback(() => {
    handleAddAnotherLine()
  }, [handleAddAnotherLine])

  const tryResumePendingAction = useCallback(() => {
    if (!user || identityLoading) return
    const action = consumeComposePendingAction()
    if (!action) return
    setPendingActionState(null)
    if (action === 'send') {
      const recipient = consumeComposePendingSendRecipient()
      setPendingSendRecipientState(null)
      trackEvent('send_opened')
      setPhase('action')
      setShowSendTo(true)
      if (recipient) setAutoSendPerson(recipient)
      return
    }
    runPendingAction(action)
  }, [user, identityLoading, runPendingAction])

  useEffect(() => {
    if (phase === 'moment' && lyric.trim() && !emotionLoading && !selectedVibe && !vibeUserPicked) {
      void fetchEmotionSuggestion(lyric, false)
    }
  }, [phase, lyric, emotionLoading, selectedVibe, vibeUserPicked, fetchEmotionSuggestion])

  useEffect(() => {
    if (completionMode) return
    saveMomentDraft(buildDraftSnapshot({
      entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
      selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
      selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingAction,
      pendingSendRecipient, persistedPostId: postedId, searchQuery,
    }))
  }, [
    completionMode, entryPoint, phase, selectMode, committedLines, lyric, songName, artistName,
    selectedSong, linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, linePickComplete,
    selectedVibe, suggestedVibe, vibeUserPicked, themeId, parentPostId, pendingAction,
    pendingSendRecipient, postedId, searchQuery,
  ])

  useEffect(() => {
    tryResumePendingAction()
  }, [tryResumePendingAction])

  useEffect(() => {
    const wasOpen = prevAuthGateOpenRef.current
    prevAuthGateOpenRef.current = authGateOpen
    if (wasOpen && !authGateOpen && !user) {
      setPendingActionState(null)
      setPendingSendRecipientState(null)
      setAutoSendPerson(null)
    }
  }, [authGateOpen, user])

  const handleAutoSendConsumed = useCallback(() => {
    setAutoSendPerson(null)
    disarmComposePendingAction()
    setPendingActionState(null)
    setPendingSendRecipientState(null)
  }, [])

  const handleSendComplete = useCallback((name: string) => {
    trackEvent('moment_sent_dm')
    setSentToName(name)
    setShowSendTo(false)
    setPhase('success')
    setCompletionMode('send')
    setPendingActionState(null)
    setComposePendingAction(null)
    clearMomentDraft()
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
  const showNameBanner = phase === 'moment' && !!identity && identity.displayName === identity.username && !bannerDismissed
  const buttonsBlocked = showNameBanner && editingName
  const showStep1Resume = phase === 'find' && !!selectedSong && (lyric.trim().length > 0 || linePickComplete || committedLines.length > 0)
  const isMargoCatalogFlow = !!(linkedSongId && (selectedSong?.source === 'margo' || selectedSong?.margoSongId))
  const showLinePicker = phase === 'select' && isMargoCatalogFlow && !linePickComplete
  const showYourLinePanel = phase === 'select' && !showLinePicker

  return (
    <main ref={composeRootRef} style={{ minHeight: '100dvh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{
        paddingTop: 'calc(var(--nav-height, 72px) + 16px)',
        paddingBottom: phase === 'moment' || phase === 'action'
          ? 'calc(var(--margo-cta-bar-h, 120px) + 16px)'
          : 'calc(var(--margo-page-padding-bottom) + 88px)',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ── Step 1: Search ── */}
          <div style={{ display: phase === 'find' ? 'block' : 'none' }}>
            {(committedLines.length > 0 || showStep1Resume) && (
              <ComposeTopBar
                onBack={handleFindBack}
                title={committedLines.length > 0 ? 'Add another line' : undefined}
                trailing={committedLines.length > 0 ? (
                  <ComposeDismissButton onClick={handleCancelLine} label="Cancel adding a line" />
                ) : undefined}
              />
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
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <p style={{
                      flex: 1, minWidth: 0,
                      fontFamily: font, fontStyle: 'italic', fontSize: '0.9rem',
                      color: 'var(--text)', margin: 0, lineHeight: 1.4,
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
                    <ComposeDismissButton onClick={() => handleRemoveCommittedLine(i)} label={`Remove line ${i + 1}`} />
                  </div>
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
                  onClick={() => setPhase('select')}
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
                <p style={{ fontFamily: UI_FONT, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: '10px 0 0' }}>
                  Search a song, pick your line, then send when you&apos;re ready.
                </p>
              ) : null}
            </div>
            <div style={{ position: 'relative', zIndex: 50 }}>
              <StageSearchField
                value={searchQuery}
                onChange={handleSearchChange}
                loading={searchLoading}
              />
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

          {/* ── MOMENT hub ── */}
          <div style={{ display: phase === 'moment' || phase === 'action' ? 'block' : 'none' }}>
            <ComposeTopBar
              onBack={() => { if (!posting) setPhase('select') }}
              backDisabled={posting}
              title="Your Moment"
              trailing={
                <button
                  type="button"
                  onClick={handleStartOver}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)',
                    minHeight: 'var(--margo-touch-min)', padding: '0 8px',
                  }}
                >Start over</button>
              }
            />

            <ComposeReadyPreview
              drafts={allLineDrafts}
              vibeLabel={selectedVibe ? vibeKeyToLabel(selectedVibe) : null}
              suggestedVibeLabel={suggestedVibe ? vibeKeyToLabel(suggestedVibe) : null}
              emotionLoading={emotionLoading}
              onVibeSelect={handleVibeLabelSelect}
              cardThemeId={themeId}
              onThemeChange={setThemeId}
            />

            {committedLines.length > 0 && (
              <div style={{ margin: '20px 0', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <p style={{ fontFamily: font, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)', margin: '0 0 8px' }}>
                  Moment so far · {committedLines.length}/{POST_LINES_MAX} lines
                </p>
                {committedLines.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <p style={{ flex: 1, minWidth: 0, fontFamily: font, fontStyle: 'italic', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                      {i + 1}. &ldquo;{line.lyric}&rdquo;
                    </p>
                    <ComposeDismissButton onClick={() => handleRemoveCommittedLine(i)} label={`Remove line ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'stretch',
                width: '100%',
                margin: '0 0 12px',
                borderTop: '1px solid var(--border)',
                paddingTop: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowExportStudio(true)}
                aria-label="Export"
                style={composeToolBtnStyle}
              >
                <CardIcon size={16} color="currentColor" />
                <span style={composeToolLabelStyle}>Export</span>
              </button>
              <button
                type="button"
                onClick={handleChangeSong}
                aria-label="Change song"
                style={composeToolBtnStyle}
              >
                <MusicNoteIcon size={16} color="currentColor" />
                <span style={composeToolLabelStyle}>Change song</span>
              </button>
              {committedLines.length + 1 < POST_LINES_MAX && (
                <button
                  type="button"
                  onClick={handleAddLineFromMoment}
                  aria-label="Add another line"
                  style={composeToolBtnStyle}
                >
                  <PenLineIcon size={16} color="currentColor" />
                  <span style={composeToolLabelStyle}>Add line</span>
                </button>
              )}
            </div>

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
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen} zIndex={85}>
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
          ...composeOverlayStyle,
          paddingBottom: 'calc(var(--margo-cta-bar-h, 0px) + var(--margo-tabbar-h, 80px) + 16px)',
        }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
            <ComposeTopBar
              onBack={handleLinePickerBack}
              title="Pick the line"
              trailing={<ComposeDismissButton onClick={handleCancelLine} label="Cancel line" />}
            />
            <ComposeLinePicker
              hideHeader
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
                setSelectMode('write')
                handleLyricSelected()
                setPhase('moment')
                void fetchEmotionSuggestion((line.text || '').slice(0, 140), vibeUserPicked)
              }}
              onSkip={() => {
                setSnippetStart(null)
                setSnippetEnd(null)
                setLinePickComplete(true)
                setSelectMode('write')
              }}
              onBack={handleLinePickerBack}
            />
          </div>
        </div>,
        document.body,
      )}

      {showYourLinePanel && portalMounted && createPortal(
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen} zIndex={85} bottomGutter={24}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleLyricComplete}
              disabled={lyric.trim().length === 0}
              style={{
                ...keyboardSafePrimaryBtnStyle,
                flex: '1.2 1 0',
                width: 'auto',
                minWidth: 0,
                padding: '0 12px',
                whiteSpace: 'nowrap',
                opacity: lyric.trim().length === 0 ? 0.4 : 1,
              }}
            >Continue</button>
            {committedLines.length + 1 < POST_LINES_MAX && (
              <button
                type="button"
                onClick={handleAddAnotherLine}
                aria-label="Add another line"
                disabled={lyric.trim().length === 0 || !songName.trim() || !artistName.trim()}
                style={{
                  ...keyboardSafeSecondaryBtnStyle,
                  flex: 1,
                  width: 'auto',
                  minWidth: 0,
                  padding: '0 10px',
                  whiteSpace: 'nowrap',
                  opacity: (lyric.trim().length === 0 || !songName.trim() || !artistName.trim()) ? 0.4 : 1,
                }}
              >Add line</button>
            )}
          </div>
        </KeyboardSafeCtaBar>,
        document.body,
      )}


      {phase === 'moment' && (
        <KeyboardSafeCtaBar keyboardOpen={keyboardOpen} bottomGutter={28}>
          <div style={{ opacity: buttonsBlocked ? 0.4 : 1, pointerEvents: buttonsBlocked ? 'none' : 'auto', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              aria-label="Send to someone"
              onClick={() => { void handleSendToSomeone() }}
              disabled={posting || identityLoading}
              style={{
                ...keyboardSafePrimaryBtnStyle,
                flex: '1.2 1 0',
                width: 'auto',
                minWidth: 0,
                padding: '0 10px',
                whiteSpace: 'nowrap',
                opacity: posting ? 0.7 : 1,
                cursor: posting ? 'not-allowed' : 'pointer',
              }}
            >Send</button>
            <button
              type="button"
              aria-label="Post to Feed"
              onClick={() => { void handlePostToFeed() }}
              disabled={posting || identityLoading}
              style={momentSplitSecondaryStyle}
            >Post</button>
            <button
              type="button"
              aria-label="Keep Private"
              onClick={() => { void handleKeepPrivate() }}
              disabled={posting}
              style={momentSplitPrivateStyle}
            >Private</button>
          </div>
        </KeyboardSafeCtaBar>
      )}

      <ComposeSendTo
        open={showSendTo}
        onOpenChange={(open) => {
          setShowSendTo(open)
          if (!open) {
            setPhase('moment')
            disarmComposePendingAction()
            setPendingActionState(null)
            setPendingSendRecipientState(null)
            setAutoSendPerson(null)
          }
        }}
        persistPost={() => persistMoment('active')}
        lyric={primaryLine.lyric}
        song={primaryLine.song}
        artist={primaryLine.artist}
        onSent={handleSendComplete}
        onAuthRequired={handleSendAuthRequired}
        autoSendPerson={autoSendPerson}
        onAutoSendConsumed={handleAutoSendConsumed}
      />

      <MargoSheet
        open={showExportStudio}
        onOpenChange={setShowExportStudio}
        title="Export your Moment"
        zIndex={200}
        heightMode="auto"
        bottomInset="tabbar-tight"
      >
        <MomentShareStudio moment={exportMoment} compact layout="modal" />
      </MargoSheet>

      {startOverConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(7,6,10,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', maxWidth: '360px', width: '100%' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px' }}>Start over?</p>
            <p style={{ fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.45 }}>This will discard your current Moment.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={confirmStartOver}
                style={{ flex: 1, minHeight: 'var(--margo-touch-min)', borderRadius: '50px', border: 'none', background: 'var(--gold)', color: 'var(--bg)', fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                Start over
              </button>
              <button type="button" onClick={() => setStartOverConfirm(false)}
                style={{ flex: 1, minHeight: 'var(--margo-touch-min)', borderRadius: '50px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: font, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {portalMounted && showYourLinePanel && createPortal(
        <div style={{
          ...composeOverlayStyle,
          paddingBottom: 'var(--margo-cta-bar-h, 120px)',
          overflowY: 'hidden',
        }}>
          <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ComposeTopBar
              onBack={handleYourLineBack}
              title="Your line"
              trailing={<ComposeDismissButton onClick={handleCancelLine} label="Cancel line" />}
            />

            <ComposeLyricCard style={{
              flex: 1, minHeight: 0, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              padding: '20px',
            }}>
              <div style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
                marginBottom: '12px',
              }}>
                <div style={{ flex: '0 0 58%', minWidth: 0 }}>
                  <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-on-gold-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Song</label>
                  <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(7,6,10,0.18)',
                      padding: '4px 0 6px', fontFamily: UI_FONT, fontWeight: 600, color: 'var(--text-on-gold)', outline: 'none', boxSizing: 'border-box',
                      fontSize: '0.9rem',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }} />
                </div>
                <div style={{ flex: '1 1 38%', minWidth: 0 }}>
                  <label style={{ display: 'block', fontFamily: UI_FONT, fontSize: '0.6rem', color: 'var(--text-on-gold-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Artist</label>
                  <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(7,6,10,0.18)',
                      padding: '4px 0 6px', fontFamily: UI_FONT, fontWeight: 400, color: 'var(--text-on-gold-muted)', outline: 'none', boxSizing: 'border-box',
                      fontSize: '0.75rem',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }} />
                </div>
              </div>

              <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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

              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <span style={{ fontFamily: UI_FONT, fontSize: '0.65rem', color: 'var(--text-on-gold-muted)' }}>{lyric.length}/140</span>
              </div>
            </ComposeLyricCard>
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

