'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

type StatsPayload = {
  ready: boolean
  artistFavoriteCount: number
  topSongs: { title: string; artistName: string; count: number }[]
  topAlbums: { title: string; artistName: string; count: number }[]
}

export function ArtistFavoriteMentionsCard({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(true)

  const load = useCallback(async () => {
    if (stats || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/artist/mention-stats')
      const data = (await res.json()) as StatsPayload & { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not load mentions.')
        return
      }
      if (!data.ready) {
        setVisible(false)
        return
      }
      setStats(data)
    } catch {
      setError('Could not load mentions.')
    } finally {
      setLoading(false)
    }
  }, [loading, stats])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void load()
  }

  if (!enabled || !visible) return null

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          textAlign: 'left',
          fontFamily: font,
          fontSize: '0.82rem',
          color: 'var(--gold)',
          background: 'transparent',
          border: '1px solid var(--gold-border)',
          borderRadius: 10,
          padding: '10px 14px',
          cursor: 'pointer',
        }}
      >
        {open ? 'Hide favorite mentions' : 'See favorite mentions'}
      </button>
      {open ? (
        <div
          style={{
            marginTop: 10,
            padding: '14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {loading ? (
            <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Loading…</p>
          ) : error ? (
            <p style={{ fontFamily: font, fontSize: '0.8rem', color: '#ff8080', margin: 0 }}>{error}</p>
          ) : stats ? (
            <>
              <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text)', margin: '0 0 10px' }}>
                {stats.artistFavoriteCount} {stats.artistFavoriteCount === 1 ? 'person has' : 'people have'} you in their favorite artists.
              </p>
              {stats.topSongs?.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>
                    Top favorited songs
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {stats.topSongs.map((s) => (
                      <li key={`${s.title}-${s.count}`}>
                        {s.title} · {s.count}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {stats.topAlbums?.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>
                    Top favorited albums
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {stats.topAlbums.map((a) => (
                      <li key={`${a.title}-${a.count}`}>
                        {a.title} · {a.count}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                <Link href="/help/artist-account/claim-artist-mentions" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                  Claim your artist name
                </Link>
                {' '}to keep links on your profile.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
