'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { matchLiveCatalogSong, searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeLinePicker, type ComposeLyricLine } from '@/components/compose-line-picker'
import { StageSearchField } from '@/components/stage/stage-search-field'
import { StageSongChip } from '@/components/stage/stage-song-chip'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { StageSendBar } from '@/components/stage/stage-send-bar'
import { useStageChromePublisher, useStageSearchPublisher, useStageIdlePublisher } from '@/lib/stage-chrome'
import { HEADLINES, resolveHeadlineVariant, type HeadlineVariant } from '@/lib/stage-headline-variant'
import { saveMomentImage } from '@/lib/moment-export/save-moment-image'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT } from '@/lib/fonts'

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

const font = 'var(--font-lora), serif'
const SUBHEAD = "Pick a line. Send it to someone who'll feel it."

function appleMusicSearchUrl(song: string, artist: string) {
  return 'https://music.apple.com/search?term=' + encodeURIComponent(song + ' ' + artist)
}

export function StageLanding() {
  const { user } = useIdentity()
  const signedIn = !!user && !user.isAnonymous

  const [headlineVariant, setHeadlineVariant] = useState<HeadlineVariant | null>(null)
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
  const [saving, setSaving] = useState(false)
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

  const playbackKey = linkedSongId || linkedAudioUrl || ''
  const lineIndex = margoLines.find((l) => l.text === lyric)?.lineIndex ?? 0
  const { playing, buffering } = useSnippetPlaybackUi(canPlay ? playbackKey : null, canPlay ? lineIndex : null)

  useEffect(() => {
    setHeadlineVariant(resolveHeadlineVariant())
  }, [])

  useStageChromePublisher(showResults || !!selectedSong)
  useStageSearchPublisher(showResults)
  useStageIdlePublisher(!selectedSong)

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
        setVibeLabel(VIBE_LABELS[vibe] || data.emotion)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
    }
  }, [])

  const revealMoment = useCallback((text: string, options?: { animate?: boolean; fetchVibe?: boolean }) => {
    const animate = options?.animate ?? true
    const fetchVibe = options?.fetchVibe ?? true
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
        return {
          id: String(r.id || r.song),
          title: String(r.song || ''),
          artist: String(r.artist || ''),
          artwork: String(r.artwork || ''),
          source,
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
    setSnippetStart(line.startSec)
    setSnippetEnd(line.endSec)
    setLyric(text)
    setLinePickComplete(true)
    revealMoment(text, { animate: true, fetchVibe: true })
  }, [revealMoment])

  const handleWriteLineChange = useCallback((value: string) => {
    const next = value.slice(0, 140)
    setLyric(next)
    if (next.trim().length > 0) {
      revealMoment(next.trim(), { animate: !momentVisible, fetchVibe: !momentVisible })
    } else {
      setMomentVisible(false)
      setVibeLabel(null)
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
      await saveMomentImage({
        lines: [{ lyric, songName, artistName, artworkUrl: selectedSong?.artwork || null }],
        vibeLabel,
        themeId: 'gold',
        shapeId: 'square',
      })
    } finally {
      setSaving(false)
    }
  }, [hasMoment, lyric, songName, artistName, vibeLabel])

  const headline = headlineVariant ? HEADLINES[headlineVariant] : HEADLINES.a

  return (
    <section style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      {!selectedSong && (
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: font,
              fontSize: 'clamp(1.65rem, 5.5vw, 2.35rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '10px',
            }}
          >
            {headline}
          </h1>
          <p
            style={{
              fontFamily: font,
              fontSize: 'clamp(0.82rem, 2.5vw, 0.88rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {SUBHEAD}
          </p>
        </div>
      )}

      {!selectedSong ? (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <StageSearchField
            value={searchQuery}
            onChange={handleSearchChange}
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
              maxHeight: hasMoment ? '2000px' : '0',
              overflow: 'hidden',
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
                  canPlay={canPlay}
                  playing={playing}
                  buffering={buffering}
                  onPlay={handlePlay}
                  listenUrl={!canPlay ? appleMusicSearchUrl(songName, artistName) : null}
                />
                <StageSendBar onSaveImage={handleSaveImage} saving={saving} signedIn={signedIn} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
