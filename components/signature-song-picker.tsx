'use client'

import { useEffect, useRef, useState } from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CloseIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { createClient } from '@/lib/supabase/client'
import { searchMargoSongs, type MargoSongHit } from '@/lib/search-margo-songs'
import { playOrToggleSnippet, togglePlayPause } from '@/lib/audio-engine'
import { fallbackSnippetWindow } from '@/lib/lyric-match'
import { matchLyricWindowFromLines } from '@/lib/lyric-match'
import { buildCatalogLyricUnits } from '@/lib/catalog-lyric-unit'
import { useIsBuffering, useIsPlaying, useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
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
      onClick={() => {
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
}: {
  songTitle: string
  artistName: string
  catalogSongId: string | null
  currentLyric?: string
  onChange: (next: { song: string; artist: string; catalogSongId: string | null }) => void
  onLyricPick?: (lyric: string) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<MargoSongHit[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<MargoSongHit | null>(null)
  const [lines, setLines] = useState<ComposeLyricLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const genRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    const gen = ++genRef.current
    setLoading(true)
    const t = window.setTimeout(() => {
      void searchMargoSongs(supabase, q, 6).then((rows) => {
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

  const selectedLabel = catalogSongId
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
            aria-label="Clear catalog song"
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
        {linesLoading ? (
          <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            Loading lyrics…
          </p>
        ) : lines.length > 0 ? (
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
              />
            ))}
          </div>
        ) : null}
        </>
      ) : (
        <>
          <MargoSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search songs"
            ariaLabel="Search songs"
            loading={loading}
          />
          {hits.length > 0 && (
            <ul style={{
              listStyle: 'none',
              margin: '8px 0 0',
              padding: 0,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'var(--surface)',
            }}>
              {hits.map((hit) => (
                <li key={hit.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(hit)
                      onChange({ song: hit.title, artist: hit.artist, catalogSongId: hit.id })
                      setQuery('')
                      setHits([])
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      minHeight: 'var(--margo-touch-min)',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {hit.artwork ? (
                      <img
                        src={hit.artwork}
                        alt=""
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        flexShrink: 0,
                      }} />
                    )}
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{
                        display: 'block',
                        fontFamily: font,
                        fontSize: TYPE.song,
                        fontWeight: 600,
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {hit.title}
                      </span>
                      <span style={{
                        display: 'block',
                        fontFamily: font,
                        fontSize: TYPE.meta,
                        color: 'var(--text-secondary)',
                      }}>
                        {hit.artist}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
}) {
  const { playing, buffering } = useSnippetPlaybackUi(songId || audioUrl || '', line.lineIndex)
  return (
    <button
      type="button"
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
        onPick()
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        minHeight: 'var(--margo-touch-min)',
        background: selected ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'none',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        boxShadow: selected ? 'inset 3px 0 0 var(--gold)' : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--gold)" />
      </span>
      <span style={{
        fontFamily: lyricFont,
        fontStyle: 'italic',
        fontSize: TYPE.lyric,
        color: selected ? 'var(--gold)' : 'var(--text)',
        lineHeight: 1.4,
      }}>
        {line.text}
      </span>
    </button>
  )
}
