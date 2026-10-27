'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DiscoverViewMoreShell } from '@/components/discover-view-more-shell'
import { DiscoverBatchedGrid } from '@/components/discover-batched-grid'
import { createClient } from '@/lib/supabase/client'
import { ArtistBadge, type ArtistStatus } from '@/components/artist-badge'
import { isExcludedDiscoverArtist } from '@/lib/discover-artist-roster'
import { DISCOVER_VM_BATCH } from '@/lib/discover-view-more-layout'
import { countSongsByOwnerProfile, sortArtistsCatalog, type ArtistRow } from '@/lib/discover-view-more-logic'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()

function ArtistCatalogTile({ artist, songCount }: { artist: ArtistRow; songCount: number }) {
  const name = artist.displayName || artist.username || '?'
  return (
    <Link
      href={`/profile/${artist.username || ''}`}
      style={{ textDecoration: 'none', display: 'block', textAlign: 'center', minWidth: 0 }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '10px',
          border: '1px solid rgba(232,197,71,0.25)',
          background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(232,197,71,0.05))',
        }}
      >
        {artist.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.avatarUrl}
            alt=""
            loading="lazy"
            width={120}
            height={120}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: UI_FONT, fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        fontFamily: UI_FONT,
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--text)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        margin: '0 0 2px',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        <ArtistBadge isArtist artistStatus={artist.artistStatus as ArtistStatus} size={11} />
      </p>
      {songCount > 0 ? (
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {songCount} {songCount === 1 ? 'song' : 'songs'}
        </p>
      ) : null}
    </Link>
  )
}

export default function ArtistsCatalogPage() {
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [songCountByProfileId, setSongCountByProfileId] = useState<Map<string, number>>(() => new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, artist_status')
      .eq('is_artist', true)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Failed to load artists:', error); setLoading(false); return }
        const visible = (data || []).filter(
          (p) => p.artist_status !== 'frozen'
            && p.artist_status !== 'removed'
            && !isExcludedDiscoverArtist(p.username),
        )
        setArtists(visible.map(p => ({
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          artistStatus: p.artist_status ?? null,
        })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (artists.length === 0) return
    let cancelled = false
    const ids = artists.map(a => a.id)
    supabase
      .from('songs')
      .select('owner_profile_id')
      .in('owner_profile_id', ids)
      .neq('status', 'hidden')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load artist song counts:', error)
          return
        }
        setSongCountByProfileId(countSongsByOwnerProfile(data || []))
      })
    return () => { cancelled = true }
  }, [artists])

  const sortedArtists = useMemo(() => sortArtistsCatalog(artists), [artists])
  const resetKey = `artists:${sortedArtists.length}`

  return (
    <DiscoverViewMoreShell title="Artists" gridKind="artists">
      <DiscoverBatchedGrid
        kind="artists"
        items={sortedArtists}
        batchSize={DISCOVER_VM_BATCH.artists}
        resetKey={resetKey}
        loading={loading}
        skeletonCount={DISCOVER_VM_BATCH.artists}
        getKey={a => a.id}
        emptyMessage="Nothing here yet."
        renderItem={artist => (
          <ArtistCatalogTile
            artist={artist}
            songCount={songCountByProfileId.get(artist.id) || 0}
          />
        )}
      />
    </DiscoverViewMoreShell>
  )
}
