'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSongs } from '@/hooks/useSongs'
import { CatalogGrid } from '@/components/catalog-grid'
import { supabase } from '@/lib/supabase'

interface ArtistPreview {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

function ArtistCatalogCard({ artist, songCount }: { artist: ArtistPreview; songCount: number }) {
  const name = artist.displayName || artist.username || '?'
  return (
    <Link href={`/profile/${artist.username || ''}`} style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
      <div style={{
        width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden',
        margin: '0 auto 10px', border: '1px solid rgba(232,197,71,0.25)',
        background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(232,197,71,0.05))',
      }}>
        {artist.avatarUrl ? (
          <img src={artist.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 0 2px' }}>
        {name}
      </p>
      {songCount > 0 && (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
          {songCount} {songCount === 1 ? 'song' : 'songs'}
        </p>
      )}
    </Link>
  )
}

export default function ArtistsCatalogPage() {
  const [artists, setArtists] = useState<ArtistPreview[]>([])
  const [loading, setLoading] = useState(true)
  const { songs } = useSongs()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('is_artist', true)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Failed to load artists:', error); setLoading(false); return }
        setArtists((data || []).map(p => ({
          id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url,
        })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Best-effort song count per artist, matched by display name against
  // Song.artist (a plain text field, not a real foreign key relation yet).
  // This will undercount/miscount if an artist's profile name doesn't
  // exactly match how their name is entered on their songs — accurate
  // counts need a real songs.artist_id -> profiles.id relation. Treat
  // this as a nice-to-have signal, not a precise stat, until that exists.
  const songCountByName = useMemo(() => {
    const counts = new Map<string, number>()
    songs.forEach(s => {
      const key = s.artist.trim().toLowerCase()
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [songs])

  const sortedArtists = useMemo(
    () => [...artists].sort((a, b) => (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '')),
    [artists]
  )

  return (
    <CatalogGrid
      items={sortedArtists}
      loading={loading}
      getKey={a => a.id}
      getSearchText={a => `${a.displayName || ''} ${a.username || ''}`}
      searchPlaceholder="Search artists…"
      emptyMessage="No artists yet — check back soon."
      minCardWidth={110}
      skeletonCount={12}
      renderCard={artist => {
        const key = (artist.displayName || artist.username || '').trim().toLowerCase()
        const songCount = songCountByName.get(key) || 0
        return <ArtistCatalogCard artist={artist} songCount={songCount} />
      }}
    />
  )
}