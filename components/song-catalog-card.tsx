'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { useIsPlaying, useIsBuffering } from '@/hooks/useAudioEngine'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { SongCardActions } from '@/components/song-card-actions'
/**
 * Minimal shape SongCatalogCard actually needs — deliberately NOT the
 * full Song type from hooks/useSongs, so this card can be fed by any
 * query that returns a song row, regardless of exact column names or
 * which hook fetched it (useSongs() on /discover/songs, a direct
 * owner_profile_id query on a profile page, etc.). Callers map their
 * own row shape into this at the call site.
 */
export interface SongCardData {
  id: string
  title: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  status?: string | null
}

export function EarnedTag({ label }: { label: 'Trending' | 'Top' }) {
  return (
    <span style={{
      position: 'absolute', top: '8px', left: '8px',
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.6rem', fontWeight: 700,
      letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px',
      borderRadius: '50px', background: 'rgba(7,6,10,0.75)',
      border: '1px solid var(--gold-border)', color: 'var(--gold)',
      zIndex: 2,
    }}>{label}</span>
  )
}

export function SongCatalogCard({ song, badge }: { song: SongCardData; badge?: 'Trending' | 'Top' | null }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isActive = song.status === 'live' || song.status === 'active'
  const isPlayingThisSong = useIsPlaying(song.id)
  const isBuffering = useIsBuffering(song.id)
  useWarmAudioUrlOnVisible(song.audioUrl, cardRef, isActive && !!song.audioUrl)
  return (
    <div ref={cardRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <Link href={`/song/${song.id}`} style={{ textDecoration: 'none', display: 'block', position: 'absolute', inset: 0 }}>
          {badge && <EarnedTag label={badge} />}
          {song.artwork ? (
            <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="220px" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,10,0.85) 0%, transparent 55%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px' }}>
            {isActive && (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayPauseIcon playing={isPlayingThisSong} buffering={isBuffering} size={14} color="var(--bg)" />
              </div>
            )}
          </div>
        </Link>
        <SongCardActions song={song} placement="cover" />
      </div>
      <Link href={`/song/${song.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-secondary)', marginBottom: '2px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
        <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
      </Link>
    </div>
  )
}
