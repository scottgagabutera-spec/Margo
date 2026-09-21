'use client'

import { useEffect, useRef, useState } from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CloseIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { createClient } from '@/lib/supabase/client'
import { searchMargoSongs, type MargoSongHit } from '@/lib/search-margo-songs'
import { playFull, togglePlayPause } from '@/lib/audio-engine'
import { useIsBuffering, useIsPlaying } from '@/hooks/useAudioEngine'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT
const supabase = createClient()

function CatalogPlayButton({
  track,
}: {
  track: { id: string; title: string; artist: string; artwork: string | null; audioUrl: string }
}) {
  const playing = useIsPlaying(track.id)
  const buffering = useIsBuffering(track.id)
  return (
    <button
      type="button"
      aria-label={playing ? 'Pause song' : 'Play song'}
      onClick={() => {
        if (playing) {
          togglePlayPause()
          return
        }
        void playFull({
          songId: track.id,
          audioUrl: track.audioUrl,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          autoplay: true,
          source: 'feed-tier1',
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
  onChange,
}: {
  songTitle: string
  artistName: string
  catalogSongId: string | null
  onChange: (next: { song: string; artist: string; catalogSongId: string | null }) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<MargoSongHit[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<MargoSongHit | null>(null)
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

  const selectedLabel = catalogSongId
    ? [selected?.title || songTitle, selected?.artist || artistName].filter(Boolean).join(' · ')
    : null

  return (
    <div>
      <p style={{
        fontFamily: font,
        fontSize: TYPE.label,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        margin: '0 0 8px',
      }}>
        Song on Margo
      </p>
      {selectedLabel ? (
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
      ) : (
        <>
          <MargoSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search Margo songs"
            ariaLabel="Search Margo catalog for a signature song"
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
