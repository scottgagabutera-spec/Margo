'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CatalogGrid, CatalogSortOption } from '@/components/catalog-grid'
import { SongCatalogCard } from '@/components/song-catalog-card'
import { ArtistBadge, type ArtistStatus } from '@/components/artist-badge'
import { BackButton } from '@/components/back-button'

const supabase = createClient()

const font = 'var(--font-lora), serif'

interface ArtistSongRow {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  status: string
  created_at: string
  is_ai_generated: boolean
}

interface ArtistHeader {
  username: string
  displayName: string
  avatarUrl: string | null
  isArtist: boolean
  artistStatus: ArtistStatus
}

const SORT_OPTIONS: CatalogSortOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
]

export default function ArtistDiscographyPage() {
  const params = useParams<{ username: string }>()
  const [artist, setArtist] = useState<ArtistHeader | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [songs, setSongs] = useState<ArtistSongRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)

    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_artist, artist_status')
      .eq('username', params.username)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return
        // Not found, or found but not an artist — either way there's no
        // discography to show here, so this route treats both the same.
        if (error || !data || !data.is_artist) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setArtist({
          username: data.username,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          isArtist: data.is_artist,
          artistStatus: data.artist_status ?? null,
        })

        const { data: songRows, error: songErr } = await supabase
          .from('songs')
          .select('id, title, artist_display_name, artwork_url, status, created_at, is_ai_generated')
          .eq('owner_profile_id', data.id)
          .eq('status', 'live')
          .order('created_at', { ascending: false })

        if (!active) return
        if (songErr) {
          console.error('Failed to load discography:', songErr)
        } else {
          setSongs((songRows || []) as ArtistSongRow[])
        }
        setLoading(false)
      })

    return () => { active = false }
  }, [params.username])

  const sorted = useMemo(() => {
    const list = [...songs]
    if (sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title))
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [songs, sort])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>No discography here.</p>
      </div>
    )
  }

  return (
    <CatalogGrid
      items={sorted}
      loading={loading}
      getKey={s => s.id}
      getSearchText={s => s.title}
      searchPlaceholder="Search this discography…"
      sortOptions={SORT_OPTIONS}
      activeSort={sort}
      onSortChange={setSort}
      emptyMessage="Nothing live yet."
      minCardWidth={150}
      topContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <BackButton fallbackHref={artist ? `/profile/${artist.username}` : '/discover'} />
          {artist && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {artist.avatarUrl ? (
                  <img src={artist.avatarUrl} alt={artist.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: font, fontSize: '0.85rem', fontWeight: 700, color: 'var(--bg)' }}>
                    {artist.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <p style={{ fontFamily: font, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {artist.displayName}
                  </p>
                  <ArtistBadge isArtist={artist.isArtist} artistStatus={artist.artistStatus} size={13} />
                </div>
                <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                  Discography
                </p>
              </div>
            </div>
          )}
        </div>
      }
      renderCard={song => (
        <SongCatalogCard
          song={{
            id: song.id,
            title: song.title,
            artist: song.artist_display_name,
            artwork: song.artwork_url,
            status: song.status,
            isAiGenerated: song.is_ai_generated ?? false,
          }}
        />
      )}
    />
  )
}