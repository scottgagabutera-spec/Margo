'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { SongCardActions } from '@/components/song-card-actions'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import type { SongCardData } from '@/components/song-catalog-card'
import { UI_FONT } from '@/lib/fonts'

export function DiscoverHomeSongTile({
  song,
  onSelect,
}: {
  song: SongCardData
  onSelect: (song: SongCardData) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isActive = song.status === 'live' || song.status === 'active'
  useWarmAudioUrlOnVisible(song.audioUrl, cardRef, isActive && !!song.audioUrl)

  return (
    <div ref={cardRef} className="discover-home-song-tile" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
      <button
        type="button"
        onClick={() => onSelect(song)}
        aria-label={`Open ${song.title}`}
        style={{
          display: 'block', width: '100%', padding: 0, border: 'none', background: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div className="discover-home-song-cover" style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
          {song.artwork ? (
            <Image src={song.artwork} alt="" fill loading="lazy" sizes="150px" style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
          )}
          <SongCardActions song={song} placement="cover" />
        </div>
        <p style={{
          fontFamily: UI_FONT, fontSize: '12px', fontWeight: 500, color: 'var(--text)',
          margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{song.title}</p>
        <p style={{
          fontFamily: UI_FONT, fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)',
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{song.artist}</p>
      </button>
    </div>
  )
}

export function DiscoverHomeArtistTile({
  username,
  displayName,
  avatarUrl,
}: {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}) {
  const name = displayName || username || '?'
  return (
    <Link
      href={`/profile/${username || ''}`}
      className="discover-home-artist-tile"
      style={{ flexShrink: 0, scrollSnapAlign: 'start', textDecoration: 'none', textAlign: 'center', minWidth: 0 }}
    >
      <div className="discover-home-artist-avatar" style={{
        aspectRatio: '1', width: '100%', borderRadius: '18px', overflow: 'hidden',
        marginBottom: '8px', border: '1px solid rgba(232,197,71,0.25)',
        background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(232,197,71,0.05))',
      }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" loading="lazy" width={84} height={84} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: UI_FONT, fontSize: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p style={{
        fontFamily: UI_FONT, fontSize: '11px', fontWeight: 500, color: 'var(--text)',
        margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{name}</p>
    </Link>
  )
}
