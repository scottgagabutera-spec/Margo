'use client'

import { useEffect, useRef, useState } from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CloseIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { searchMargoSongs, type MargoSongHit } from '@/lib/search-margo-songs'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT
const supabase = createClient()

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

  const selectedLabel = catalogSongId
    ? [songTitle, artistName].filter(Boolean).join(' · ')
    : null

  return (
    <div>
      <p style={{
        fontFamily: font,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        margin: '0 0 8px',
      }}>
        From Margo
      </p>
      {selectedLabel ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 8px 0 14px',
          borderRadius: '12px',
          border: '1px solid var(--gold-border)',
          background: 'var(--gold-faint)',
          marginBottom: '12px',
        }}>
          <span style={{
            flex: 1,
            minWidth: 0,
            fontFamily: font,
            fontSize: '0.82rem',
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
                        fontSize: '0.95rem',
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
                        fontSize: '0.7rem',
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
