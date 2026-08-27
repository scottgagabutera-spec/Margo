'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { StageSearchField } from '@/components/stage/stage-search-field'
import { StageSongChip } from '@/components/stage/stage-song-chip'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { StageSendBar } from '@/components/stage/stage-send-bar'
import MargoLogo from '@/components/MargoLogo'
import { useStageChromePublisher, useStageSearchPublisher, useStageIdlePublisher, useStageMomentPublisher } from '@/lib/stage-chrome'
import { resolveMargoMomentFromStage, canShareImageFiles } from '@/lib/moment'
import { saveMargoMomentImage, shareMargoMomentImage } from '@/lib/moment-export/save-moment-image'
import {
  downloadMargoMomentVideo,
  shareMargoMomentVideo,
  canShareVideoFiles,
} from '@/lib/moment-export/save-moment-video'
import { probeMomentVideoCapability } from '@/lib/moment-export/video/capabilities'
import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import { MomentActionMenu } from '@/components/moment-action-menu'
import { buildMomentExportActionItems, buildMomentShareActionItems } from '@/lib/moment/share-action-items'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT } from '@/lib/fonts'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

const supabase = createClient()

type Source = 'margo' | 'genius' | 'apple'

interface SearchResult extends ComposeSearchHit {}

type Vibe =
  | 'CHILL' | 'HOPE' | 'HEALING' | 'GRATEFUL' | 'SPIRITUAL'
  | 'NOSTALGIA' | 'JOY' | 'LOVE' | 'HYPE' | 'PROUD'
  | 'HEARTBREAK' | 'PAIN' | 'LONELINESS' | 'LOST'
  | 'RAGE' | 'SENDIT' | 'LETOUT'

const VIBE_LABELS: Record<Vibe, string> = {
  CHILL: 'Chill', HOPE: 'Hope', HEALING: 'Healing',
  GRATEFUL: 'Grateful', SPIRITUAL: 'Spiritual', NOSTALGIA: 'Nostalgia',
  JOY: 'Joy', LOVE: 'Love', HYPE: 'Hype', PROUD: 'Proud',
  HEARTBREAK: 'Heartbreak', PAIN: 'Pain', LONELINESS: 'Loneliness',
  LOST: 'Lost', RAGE: 'Rage', SENDIT: 'Send It', LETOUT: 'Let Out',
}

const STAGE_VIBES: Vibe[] = [
  'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA',
  'JOY', 'LOVE', 'HYPE', 'PROUD', 'HEARTBREAK', 'PAIN', 'LONELINESS',
  'LOST', 'RAGE', 'SENDIT', 'LETOUT',
]

const STAGE_VIBE_OPTIONS = STAGE_VIBES.map((v) => VIBE_LABELS[v])

const font = 'var(--font-lora), serif'

function buildComposePrefillUrl(params: {
  lyric: string
  song: string
  artist: string
  artwork?: string | null
  songId?: string | null
  audioUrl?: string | null
  start?: number | null
  end?: number | null
}): string {
  const q = new URLSearchParams()
  q.set('lyric', params.lyric)
  q.set('song', params.song)
  q.set('artist', params.artist)
  if (params.artwork) q.set('artwork', params.artwork)
  if (params.songId) q.set('songId', params.songId)
  if (params.audioUrl) q.set('audioUrl', params.audioUrl)
  if (params.start != null) q.set('start', String(params.start))
  if (params.end != null) q.set('end', String(params.end))
  q.set('phase', 'moment')
  return `/compose?${q.toString()}`
}

export function StageLanding() {
  const router = useRouter()
  const { user } = useIdentity()
  const signedIn = !!user && !user.isAnonymous

  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null)
  const [artistName, setArtistName] = useState('')
  const [songName, setSongName] = useState('')
  const [lyric, setLyric] = useState('')
  const [linkedSongId, setLinkedSongId] = useState<string | null>(null)
  const [linkedAudioUrl, setLinkedAudioUrl] = useState<string | null>(null)
  const [snippetStart, setSnippetStart] = useState<number | null>(null)
  const [snippetEnd, setSnippetEnd] = useState<number | null>(null)
  const [margoLines, setMargoLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [linePickComplete, setLinePickComplete] = useState(false)
  const [vibeLabel, setVibeLabel] = useState<string | null>(null)
  const [suggestedVibeLabel, setSuggestedVibeLabel] = useState<string | null>(null)
  const [vibeUserPicked, setVibeUserPicked] = useState(false)
  const [cardThemeId, setCardThemeId] = useState<StageCardThemeId>('gold')
  const [saving, setSaving] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [canExportVideo, setCanExportVideo] = useState(false)
  const [canShareVid, setCanShareVid] = useState(false)
  const [videoUnavailableHint, setVideoUnavailableHint] = useState('Not available on this device')
  const videoAbortRef = useRef<AbortController | null>(null)
  const [momentVisible, setMomentVisible] = useState(false)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)
  const emotionAbortRef = useRef<AbortController | null>(null)

  const showLinePicker = !!selectedSong && selectedSong.source === 'margo' && !linePickComplete
  const isExternalOrManualWrite = !!selectedSong && (
    selectedSong.source !== 'margo' || (linePickComplete && margoLines.length === 0)
  )
  const showWriteLine = isExternalOrManualWrite && !showLinePicker
  const hasMoment = momentVisible && lyric.trim().length > 0 && !!songName && !!artistName
  const canPlay = !!(linkedAudioUrl && linkedSongId && snippetStart != null && snippetEnd != null)

  const stageMoment = hasMoment
    ? resolveMargoMomentFromStage({
        lyric,
        songName,
        artistName,
        artworkUrl: selectedSong?.artwork || null,
        songId: linkedSongId,
        audioUrl: linkedAudioUrl,
        snippetStart,
        snippetEnd,
        vibeLabel,
        source: linkedSongId ? 'catalog' : 'external',
        externalListenUrl: selectedSong?.externalListenUrl ?? null,
      })
    : null
  const listen = stageMoment?.listen ?? null

  const playbackKey = linkedSongId || linkedAudioUrl || ''
  const lineIndex = margoLines.find((l) => l.text === lyric)?.lineIndex ?? 0
  const { playing, buffering } = useSnippetPlaybackUi(canPlay ? playbackKey : null, canPlay ? lineIndex : null)

  useStageChromePublisher(showResults || !!selectedSong)
  useStageSearchPublisher(showResults)
  useStageIdlePublisher(!selectedSong)
  useStageMomentPublisher(hasMoment)

  const fetchEmotion = useCallback(async (text: string) => {
    if (!text.trim()) return
    if (emotionAbortRef.current) emotionAbortRef.current.abort()
    const controller = new AbortController()
    emotionAbortRef.current = controller
    try {
      const res = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyric: text }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.emotion) {
        const vibe = data.emotion as Vibe
        const label = VIBE_LABELS[vibe] || data.emotion
        setSuggestedVibeLabel(label)
        if (!vibeUserPicked) setVibeLabel(label)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
    }
  }, [vibeUserPicked])

  const revealMoment = useCallback((text: string, options?: { animate?: boolean; fetchVibe?: boolean }) => {
    const animate = options?.animate ?? true
    const fetchVibe = options?.fetchVibe ?? true
    if (fetchVibe) setVibeUserPicked(false)
    if (animate) {
      setMomentVisible(false)
      window.requestAnimationFrame(() => {
        setMomentVisible(true)
        if (fetchVibe) void fetchEmotion(text)
      })
    } else {
      setMomentVisible(true)
      if (fetchVibe) void fetchEmotion(text)
    }
  }, [fetchEmotion])

  const runSearch = useCallback(async (value: string) => {
    const gen = ++searchGenRef.current
    setShowResults(true)
    setSearchLoading(true)
    try {
      const [margoHits, geniusRes] = await Promise.all([
        searchMargoSongs(supabase, value),
        fetch('/api/genius?song=' + encodeURIComponent(value)).then(async (res) => {
          if (!res.ok) return { results: [] as Array<Record<string, unknown>> }
          try {
            const data = await res.json()
            if (data?.error) return { results: [] as Array<Record<string, unknown>> }
            return data
          } catch {
            return { results: [] as Array<Record<string, unknown>> }
          }
        }).catch(() => ({ results: [] as Array<Record<string, unknown>> })),
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

      const externalMapped: SearchResult[] = (geniusRes.results || []).map((r: Record<string, unknown>) => {
        const rawSource = String(r.source || '').toLowerCase()
        const source: Source = (rawSource === 'itunes' || rawSource === 'apple') ? 'apple' : 'genius'
        const trackViewUrl = typeof r.trackViewUrl === 'string' ? r.trackViewUrl : null
        const geniusUrl = typeof r.geniusUrl === 'string' ? r.geniusUrl : null
        return {
          id: String(r.id || r.song),
          title: String(r.song || ''),
          artist: String(r.artist || ''),
          artwork: String(r.artwork || ''),
          source,
          externalListenUrl: trackViewUrl || geniusUrl || null,
        }
      }).filter((r: SearchResult) => !margoKeys.has(songMatchKey(r.title, r.artist)))

      setSearchResults([...margoMapped, ...externalMapped].slice(0, 8))
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
      void runSearch(value)
    }, 300)
  }, [runSearch])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (
      selectedSong?.source === 'margo' &&
      !linePickComplete &&
      !linesLoading &&
      margoLines.length === 0 &&
      linkedSongId
    ) {
      setLinePickComplete(true)
    }
  }, [selectedSong?.source, linePickComplete, linesLoading, margoLines.length, linkedSongId])

  const clearSong = useCallback(() => {
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
    setVibeLabel(null)
    setSuggestedVibeLabel(null)
    setVibeUserPicked(false)
    setCardThemeId('gold')
    setMomentVisible(false)
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])
  }, [])

  const enterCatalog = useCallback(async (
    songId: string,
    audioUrl: string | null,
    catalogTitle?: string,
    catalogArtist?: string,
    artwork?: string,
  ) => {
    if (catalogTitle) setSongName(catalogTitle)
    if (catalogArtist) setArtistName(catalogArtist)
    setLinkedSongId(songId)
    setLinkedAudioUrl(audioUrl)
    setLinePickComplete(false)
    setMargoLines([])
    setLinesLoading(true)
    setMomentVisible(false)
    setLyric('')
    setVibeLabel(null)
    setSuggestedVibeLabel(null)
    setVibeUserPicked(false)
    if (artwork) {
      setSelectedSong((prev) => (prev ? { ...prev, artwork } : prev))
    }
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

  const handleSelectSong = useCallback(async (result: SearchResult) => {
    setSelectedSong(result)
    setArtistName(result.artist)
    setSongName(result.title)
    setShowResults(false)
    setSearchQuery('')
    setSnippetStart(null)
    setSnippetEnd(null)
    setMomentVisible(false)
    setLyric('')
    setVibeLabel(null)
    setSuggestedVibeLabel(null)
    setVibeUserPicked(false)

    if (result.source === 'margo') {
      await enterCatalog(result.margoSongId!, result.audioUrl || null, result.title, result.artist, result.artwork)
      return
    }

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
        await enterCatalog(hit.id, hit.audioUrl, hit.title, hit.artist, hit.artwork || result.artwork)
        return
      }
    } catch (e) {
      console.error('Song rematch failed:', e)
    }
  }, [enterCatalog])

  const handleLinePick = useCallback((line: ComposeLyricLine) => {
    const text = (line.text || '').slice(0, 140)
    if (signedIn) {
      router.push(buildComposePrefillUrl({
        lyric: text,
        song: songName,
        artist: artistName,
        artwork: selectedSong?.artwork || null,
        songId: linkedSongId,
        audioUrl: linkedAudioUrl,
        start: line.startSec,
        end: line.endSec,
      }))
      return
    }
    setSnippetStart(line.startSec)
    setSnippetEnd(line.endSec)
    setLyric(text)
    setLinePickComplete(true)
    revealMoment(text, { animate: true, fetchVibe: true })
  }, [
    signedIn, router, songName, artistName, selectedSong?.artwork,
    linkedSongId, linkedAudioUrl, revealMoment,
  ])

  const navigateToCompose = useCallback(() => {
    if (!lyric.trim() || !songName.trim() || !artistName.trim()) return
    router.push(buildComposePrefillUrl({
      lyric: lyric.trim(),
      song: songName.trim(),
      artist: artistName.trim(),
      artwork: selectedSong?.artwork || null,
      songId: linkedSongId,
      audioUrl: linkedAudioUrl,
      start: snippetStart,
      end: snippetEnd,
    }))
  }, [
    router, lyric, songName, artistName, selectedSong?.artwork,
    linkedSongId, linkedAudioUrl, snippetStart, snippetEnd,
  ])

  const handleWriteLineChange = useCallback((value: string) => {
    const next = value.slice(0, 140)
    setLyric(next)
    if (next.trim().length > 0) {
      revealMoment(next.trim(), { animate: !momentVisible, fetchVibe: !momentVisible })
    } else {
      setMomentVisible(false)
      setVibeLabel(null)
      setSuggestedVibeLabel(null)
      setVibeUserPicked(false)
    }
  }, [revealMoment, momentVisible])

  const handlePlay = useCallback(() => {
    if (!canPlay || !linkedAudioUrl) return
    void playSnippet({
      songId: linkedSongId || linkedAudioUrl,
      audioUrl: linkedAudioUrl,
      title: songName,
      artist: artistName,
      artwork: selectedSong?.artwork || null,
      lineIndex,
      lineText: lyric,
      startSec: snippetStart!,
      endSec: snippetEnd!,
      source: 'feed',
    })
  }, [canPlay, linkedAudioUrl, linkedSongId, songName, artistName, selectedSong?.artwork, lineIndex, lyric, snippetStart, snippetEnd])

  const handleSaveImage = useCallback(async () => {
    if (!hasMoment) return
    setSaving(true)
    try {
      const moment = resolveMargoMomentFromStage({
        lyric,
        songName,
        artistName,
        artworkUrl: selectedSong?.artwork || null,
        songId: linkedSongId,
        audioUrl: linkedAudioUrl,
        snippetStart,
        snippetEnd,
        vibeLabel,
        source: linkedSongId ? 'catalog' : 'external',
        externalListenUrl: selectedSong?.externalListenUrl ?? null,
      }, { themeId: cardThemeId })
      await saveMargoMomentImage(moment)
    } finally {
      setSaving(false)
    }
  }, [
    hasMoment, lyric, songName, artistName, selectedSong?.artwork,
    linkedSongId, linkedAudioUrl, snippetStart, snippetEnd, vibeLabel, selectedSong?.externalListenUrl, cardThemeId,
  ])

  const buildExportMoment = useCallback(() => {
    return resolveMargoMomentFromStage({
      lyric,
      songName,
      artistName,
      artworkUrl: selectedSong?.artwork || null,
      songId: linkedSongId,
      audioUrl: linkedAudioUrl,
      snippetStart,
      snippetEnd,
      vibeLabel,
      source: linkedSongId ? 'catalog' : 'external',
      externalListenUrl: selectedSong?.externalListenUrl ?? null,
    }, {
      themeId: cardThemeId,
    })
  }, [
    lyric, songName, artistName, selectedSong?.artwork, linkedSongId,
    linkedAudioUrl, snippetStart, snippetEnd, vibeLabel,
    selectedSong?.externalListenUrl, cardThemeId,
  ])

  const handleShareImage = useCallback(async () => {
    if (!hasMoment) return
    setShareBusy(true)
    try {
      await shareMargoMomentImage(buildExportMoment())
    } finally {
      setShareBusy(false)
    }
  }, [hasMoment, buildExportMoment])

  useEffect(() => {
    setCanShareVid(canShareVideoFiles())
    let cancelled = false
    void probeMomentVideoCapability().then((cap) => {
      if (cancelled) return
      setCanExportVideo(cap.canExport)
      if (cap.reason) setVideoUnavailableHint(cap.reason)
    })
    return () => {
      cancelled = true
      videoAbortRef.current?.abort()
    }
  }, [])

  const runVideoAction = useCallback(async (
    action: (
      moment: ReturnType<typeof buildExportMoment>,
      onProgress?: (message: string) => void,
      signal?: AbortSignal,
    ) => Promise<unknown>,
  ) => {
    if (!hasMoment || !canExportVideo || !canPlay) return
    videoAbortRef.current?.abort()
    const ac = new AbortController()
    videoAbortRef.current = ac
    setSaving(true)
    setVideoProgress('Creating your Moment…')
    try {
      await action(buildExportMoment(), setVideoProgress, ac.signal)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setVideoProgress('Could not create video. Try saving an image instead.')
        await new Promise((r) => setTimeout(r, 2800))
      }
    } finally {
      setSaving(false)
      setVideoProgress(null)
      if (videoAbortRef.current === ac) videoAbortRef.current = null
    }
  }, [hasMoment, canExportVideo, canPlay, buildExportMoment])

  const handleSaveVideo = useCallback(async () => {
    await runVideoAction(downloadMargoMomentVideo)
  }, [runVideoAction])

  const handleShareVideo = useCallback(async () => {
    setShareBusy(true)
    try {
      await runVideoAction(shareMargoMomentVideo)
    } finally {
      setShareBusy(false)
    }
  }, [runVideoAction])

  const canShareImg = canShareImageFiles()

  const saveItems: MomentActionMenuItem[] = buildMomentExportActionItems({
    onExportImage: () => { void handleSaveImage() },
    hasPlayableSnippet: canPlay,
    canExportVideo,
    videoUnavailableHint,
    onExportVideo: () => { void handleSaveVideo() },
  })

  const shareItems = buildMomentShareActionItems({
    canShareImage: canShareImg,
    canShareVideo: canShareVid && canExportVideo && canPlay,
    linksActive: false,
    onShareImage: () => { void handleShareImage() },
    onShareVideo: () => { void handleShareVideo() },
    onShareLink: () => {},
    onCopyLink: () => {},
  })

  return (
    <section style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      {!selectedSong && (
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <MargoLogo wordmarkOnly size={52} />
          </div>
          <p
            style={{
              fontFamily: font,
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            Expression through a line of music.
          </p>
        </div>
      )}

      {!selectedSong ? (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <StageSearchField
            value={searchQuery}
            onChange={handleSearchChange}
            loading={searchLoading}
          />
          <ComposeSearchDropdown
            variant="stage"
            open={showResults}
            loading={searchLoading}
            results={searchResults}
            onSelect={handleSelectSong}
            onClose={() => setShowResults(false)}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <StageSongChip
            title={songName}
            artist={artistName}
            artwork={selectedSong.artwork}
            onClear={clearSong}
          />

          {showLinePicker && (
            <div style={{ width: '100%' }}>
              <ComposeLinePicker
                variant="stage"
                lines={margoLines}
                loading={linesLoading}
                songTitle={songName}
                artistName={artistName}
                audioUrl={linkedAudioUrl}
                songId={linkedSongId}
                artwork={selectedSong.artwork || null}
                stickySkip
                onPick={handleLinePick}
                onSkip={() => {
                  setSnippetStart(null)
                  setSnippetEnd(null)
                  setLinePickComplete(true)
                }}
                onBack={clearSong}
              />
            </div>
          )}

          {showWriteLine && (
            <div style={{ width: '100%' }}>
              <textarea
                value={lyric}
                onChange={(e) => handleWriteLineChange(e.target.value)}
                maxLength={140}
                rows={3}
                placeholder="Type the line…"
                autoFocus={selectedSong.source !== 'margo'}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontFamily: font,
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ textAlign: 'right', fontFamily: UI_FONT, fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                {lyric.length}/140
              </p>
            </div>
          )}

          <div
            style={{
              width: '100%',
              opacity: hasMoment ? 1 : 0,
              transform: hasMoment ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              pointerEvents: hasMoment ? 'auto' : 'none',
              maxHeight: hasMoment ? 'none' : '0',
              overflow: hasMoment ? 'visible' : 'hidden',
            }}
            aria-hidden={!hasMoment}
          >
            {hasMoment && (
              <>
                <StageMomentCard
                  lyric={lyric}
                  songTitle={songName}
                  artistName={artistName}
                  artwork={selectedSong.artwork}
                  vibeLabel={vibeLabel}
                  suggestedVibeLabel={suggestedVibeLabel}
                  vibeOptions={STAGE_VIBE_OPTIONS}
                  onVibeSelect={(label) => {
                    setVibeLabel(label)
                    setVibeUserPicked(true)
                  }}
                  cardThemeId={cardThemeId}
                  onThemeChange={setCardThemeId}
                  canPlay={listen?.canPlayInline ?? false}
                  playing={playing}
                  buffering={buffering}
                  onPlay={handlePlay}
                  listenUrl={listen && !listen.canPlayInline ? listen.externalUrl : null}
                />
                {signedIn ? (
                  <div style={{ width: '100%', marginTop: 'var(--stage-moment-to-actions, 22px)' }}>
                    {videoProgress ? (
                      <p
                        role="status"
                        aria-live="polite"
                        style={{
                          margin: '0 0 10px',
                          fontFamily: font,
                          fontSize: '0.68rem',
                          fontStyle: 'italic',
                          color: 'var(--text-secondary)',
                          textAlign: 'center',
                          lineHeight: 1.4,
                        }}
                      >
                        {videoProgress}
                      </p>
                    ) : null}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      gap: '8px',
                      width: '100%',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}>
                      <MomentActionMenu
                        label="Export"
                        items={saveItems}
                        variant="primary"
                        busy={saving}
                      />
                      <MomentActionMenu
                        label="Share"
                        items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
                        variant="secondary"
                        busy={shareBusy}
                        disabled={shareItems.length === 0}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={navigateToCompose}
                      style={{
                        width: '100%',
                        minHeight: 'var(--margo-touch-min)',
                        padding: '0 20px',
                        borderRadius: '50px',
                        border: 'none',
                        background: 'var(--gold)',
                        color: 'var(--text-on-gold, var(--bg))',
                        fontFamily: UI_FONT,
                        fontSize: '0.56rem',
                        fontWeight: 700,
                        letterSpacing: '0.9px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      Send this line
                    </button>
                  </div>
                ) : (
                  <StageSendBar
                    saveItems={saveItems}
                    shareItems={shareItems}
                    saving={saving}
                    shareBusy={shareBusy}
                    signedIn={false}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
