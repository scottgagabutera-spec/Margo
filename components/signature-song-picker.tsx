'use client'

import { useEffect, useRef, useState } from 'react'
import { ComposeSearchDropdown, type ComposeSearchHit } from '@/components/compose-search-dropdown'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CloseIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { createClient } from '@/lib/supabase/client'
import { fetchUnifiedSongSearchHits } from '@/lib/song-search/unified-song-search'
import { playOrToggleSnippet, togglePlayPause } from '@/lib/audio-engine'
import { fallbackSnippetWindow } from '@/lib/lyric-match'
import { matchLyricWindowFromLines } from '@/lib/lyric-match'
import { buildCatalogLyricUnits } from '@/lib/catalog-lyric-unit'
import { useIsBuffering, useIsPlaying, useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useLongPress } from '@/hooks/useLongPress'
import { MargoLongPressHint } from '@/components/margo-long-press-hint'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import type { ComposeLyricLine } from '@/components/compose-line-picker'

const font = UI_FONT
const lyricFont = LYRIC_FONT
const supabase = createClient()

function CatalogPlayButton({
  track,
  snippet,
}: {
  track: { id: string; title: string; artist: string; artwork: string | null; audioUrl: string }
  snippet?: { lineIndex: number; lineText: string; startSec: number; endSec: number } | null
}) {
  const playing = useIsPlaying(track.id)
  const buffering = useIsBuffering(track.id)
  const hasSnippet = !!snippet && snippet.endSec > snippet.startSec
  return (
    <button
      type="button"
      aria-label={playing ? 'Pause' : 'Play this moment'}
      onClick={(e) => {
        e.stopPropagation()
        if (playing) {
          togglePlayPause()
          return
        }
        const window = hasSnippet && snippet
          ? snippet
          : { lineIndex: 0, lineText: '', ...fallbackSnippetWindow() }
        playOrToggleSnippet({
          songId: track.id,
          audioUrl: track.audioUrl,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          lineIndex: window.lineIndex,
          lineText: window.lineText,
          startSec: window.startSec,
          endSec: window.endSec,
          source: 'feed',
        })
      }}
      style={{
        width: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        borderRadius: '50%',
        border: '1px solid var(--gold-border)',
        background: 'var(--gold-faint)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <PlayPauseIcon playing={playing} buffering={buffering} size={16} color="var(--gold)" />
    </button>
  )
}

export function SignatureSongPicker({
  songTitle,
  artistName,
  catalogSongId,
  currentLyric,
  onChange,
  onLyricPick,
  onManageSelectedLine,
}: {
  songTitle: string
  artistName: string
  catalogSongId: string | null
  currentLyric?: string
  onChange: (next: { song: string; artist: string; catalogSongId: string | null }) => void
  onLyricPick?: (lyric: string) => void
  /** When user taps an already-selected catalog line — open action sheet instead of re-picking. */
  onManageSelectedLine?: () => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ComposeSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selected, setSelected] = useState<MargoSongHitLocal | null>(null)
  const [lines, setLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const genRef = useRef(0)

  type MargoSongHitLocal = {
    id: string
    title: string
    artist: string
    artwork: string
    audioUrl: string | null
  }

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      setShowResults(false)
      return
    }
    const gen = ++genRef.current
    setLoading(true)
    setShowResults(true)
    const t = window.setTimeout(() => {
      void fetchUnifiedSongSearchHits(supabase, q, 10).then((rows) => {
        if (gen !== genRef.current) return
        setHits(rows)
        setLoading(false)
      }).catch(() => {
        if (gen !== genRef.current) return
        setHits([])
        setLoading(false)
      })
    }, 220)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!catalogSongId) {
      setSelected(null)
      setLines([])
      return
    }
    if (selected?.id === catalogSongId) return
    let active = true
    void supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, audio_url')
      .eq('id', catalogSongId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return
        setSelected({
          id: data.id,
          title: data.title,
          artist: data.artist_display_name,
          artwork: data.artwork_url || '',
          audioUrl: data.audio_url || null,
        })
      })
    return () => { active = false }
  }, [catalogSongId, selected?.id])

  useEffect(() => {
    if (!catalogSongId) {
      setLines([])
      setLinesLoading(false)
      return
    }
    let active = true
    setLinesLoading(true)
    void supabase
      .from('lyric_lines')
      .select('line_index, text, start_sec, end_sec')
      .eq('song_id', catalogSongId)
      .order('line_index', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) {
          setLines(data.map((row) => ({
            lineIndex: row.line_index,
            text: row.text,
            startSec: row.start_sec,
            endSec: row.end_sec,
          })))
        } else {
          setLines([])
        }
        setLinesLoading(false)
      })
    return () => { active = false }
  }, [catalogSongId])

  const hasSongMeta = !!(catalogSongId || (songTitle.trim() && artistName.trim()))
  const selectedLabel = hasSongMeta
    ? [selected?.title || songTitle, selected?.artist || artistName].filter(Boolean).join(' · ')
    : null

  const pickedSnippet = currentLyric && lines.length > 0
    ? matchLyricWindowFromLines(lines.map((l) => ({
      line_index: l.lineIndex,
      text: l.text,
      start_sec: l.startSec,
      end_sec: l.endSec,
    })), currentLyric)
    : null
  const momentUnit = pickedSnippet
    ? buildCatalogLyricUnits(lines.map((l) => ({
      lineIndex: l.lineIndex,
      text: l.text,
      startSec: l.startSec,
      endSec: l.endSec,
    })), pickedSnippet.lineId)?.window
    : null
  const snippet = momentUnit && momentUnit.endSec > momentUnit.startSec
    ? {
      lineIndex: momentUnit.centerLineIndex,
      lineText: currentLyric || momentUnit.text,
      startSec: momentUnit.startSec,
      endSec: momentUnit.endSec,
    }
    : pickedSnippet && pickedSnippet.endSec > pickedSnippet.startSec
      ? {
        lineIndex: pickedSnippet.lineId,
        lineText: pickedSnippet.lineText,
        startSec: pickedSnippet.startSec,
        endSec: pickedSnippet.endSec,
      }
      : null

  function selectSearchHit(hit: ComposeSearchHit) {
    setQuery('')
    setHits([])
    setShowResults(false)
    if (hit.source === 'margo' && hit.margoSongId) {
      setSelected({
        id: hit.margoSongId,
        title: hit.title,
        artist: hit.artist,
        artwork: hit.artwork || '',
        audioUrl: hit.audioUrl ?? null,
      })
      onChange({ song: hit.title, artist: hit.artist, catalogSongId: hit.margoSongId })
      return
    }
    setSelected(null)
    onChange({ song: hit.title, artist: hit.artist, catalogSongId: null })
  }

  return (
    <div>
      {selectedLabel ? (
        <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: 'var(--margo-touch-min)',
          padding: '4px 8px 4px 8px',
          borderRadius: '12px',
          border: '1px solid var(--gold-border)',
          background: 'var(--gold-faint)',
          marginBottom: '12px',
        }}>
          {selected?.audioUrl ? (
            <CatalogPlayButton
              track={{
                id: selected.id,
                title: selected.title,
                artist: selected.artist,
                artwork: selected.artwork || null,
                audioUrl: selected.audioUrl,
              }}
              snippet={snippet}
            />
          ) : null}
          <span style={{
            flex: 1,
            minWidth: 0,
            fontFamily: font,
            fontSize: TYPE.secondary,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {selectedLabel}
          </span>
          <button
            type="button"
            aria-label="Clear song"
            onClick={() => onChange({ song: '', artist: '', catalogSongId: null })}
            style={{
              width: 'var(--margo-touch-min)',
              height: 'var(--margo-touch-min)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <CloseIcon size={14} color="var(--text-secondary)" />
          </button>
        </div>
        {catalogSongId && linesLoading ? (
          <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            Loading lyrics…
          </p>
        ) : catalogSongId && lines.length > 0 ? (
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            background: 'var(--surface)',
          }}>
            {lines.map((line, index) => (
              <SignatureLineRow
                key={line.lineIndex}
                line={line}
                selected={(currentLyric || '').trim() === line.text.trim()}
                isLast={index === lines.length - 1}
                songTitle={selected?.title || songTitle}
                artistName={selected?.artist || artistName}
                audioUrl={selected?.audioUrl || null}
                songId={selected?.id || catalogSongId}
                artwork={selected?.artwork || null}
                onPick={() => onLyricPick?.(line.text.slice(0, 140))}
                onManageSelected={onManageSelectedLine}
              />
            ))}
          </div>
        ) : !catalogSongId ? (
          <p style={{
            fontFamily: font,
            fontSize: TYPE.secondary,
            color: 'var(--text-muted)',
            margin: '0 0 8px',
            lineHeight: 1.45,
          }}>
            Type or paste your lyric in the box above — same as Compose when the song is not on Margo yet.
          </p>
        ) : null}
        </>
      ) : (
        <>
          <MargoSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search Margo, Genius, or Apple Music"
            ariaLabel="Search songs"
            loading={loading}
          />
          <ComposeSearchDropdown
            open={showResults && query.trim().length >= 2}
            loading={loading}
            results={hits}
            highlightQuery={query}
            onSelect={selectSearchHit}
            onClose={() => setShowResults(false)}
            variant="compose"
          />
        </>
      )}
    </div>
  )
}

function SignatureLineRow({
  line,
  selected,
  isLast,
  songTitle,
  artistName,
  audioUrl,
  songId,
  artwork,
  onPick,
  onManageSelected,
}: {
  line: ComposeLyricLine
  selected: boolean
  isLast: boolean
  songTitle: string
  artistName: string
  audioUrl: string | null
  songId: string | null
  artwork: string | null
  onPick: () => void
  onManageSelected?: () => void
}) {
  const { playing, buffering } = useSnippetPlaybackUi(songId || audioUrl || '', line.lineIndex)
  const manageLongPress = useLongPress({
    disabled: !selected || !onManageSelected,
    onLongPress: () => onManageSelected?.(),
  })
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        minHeight: 'var(--margo-touch-min)',
        background: selected ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        boxShadow: selected ? 'inset 3px 0 0 var(--gold)' : 'none',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label={playing ? 'Pause snippet' : 'Play snippet'}
        onClick={() => {
          if (audioUrl && songId && line.endSec > line.startSec) {
            playOrToggleSnippet({
              songId,
              audioUrl,
              title: songTitle,
              artist: artistName,
              artwork,
              lineIndex: line.lineIndex,
              lineText: line.text,
              startSec: line.startSec,
              endSec: line.endSec,
              source: 'feed',
            })
          }
        }}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--gold)" />
      </button>
      <MargoLongPressHint
        active={manageLongPress.pressing}
        progress={manageLongPress.progress}
        style={{ flex: 1, minWidth: 0, borderRadius: '8px' }}
      >
        <button
          type="button"
          aria-label={selected && onManageSelected ? 'Hold for signature options' : 'Select this line'}
          {...manageLongPress.handlers}
          onClick={() => {
            if (manageLongPress.consumeClick()) return
            if (selected && onManageSelected) return
            onPick()
          }}
          style={{
            width: '100%',
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '2px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{
            fontFamily: lyricFont,
            fontStyle: 'italic',
            fontSize: TYPE.lyric,
            color: selected ? 'var(--gold)' : 'var(--text)',
            lineHeight: 1.4,
          }}>
            {line.text}
          </span>
          {selected && onManageSelected ? (
            <span style={{
              display: 'block',
              fontFamily: font,
              fontSize: TYPE.label,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>
              Hold for options
            </span>
          ) : null}
        </button>
      </MargoLongPressHint>
    </div>
  )
}
