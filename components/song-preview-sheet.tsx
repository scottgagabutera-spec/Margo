'use client'

import { useEffect, useMemo, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CloseIcon, ChevronRightIcon, ShareIcon } from '@/components/icons'
import { AiGeneratedLabel } from '@/components/ai-generated-label'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { HeartIcon } from '@/components/heart-icon'
import { ProfileArtistLinks } from '@/components/profile-artist-links'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useSong } from '@/hooks/useSong'
import { useSongOwnerProfile } from '@/hooks/useSongOwnerProfile'
import { useSongLibrarySaves } from '@/hooks/useSongLibrarySaves'
import type { Song } from '@/hooks/useSongs'
import type { SongCardData } from '@/components/song-catalog-card'
import {
  fullSongToQueueItem,
  queueAdd,
  queuePlayNext,
} from '@/lib/audio-engine'
import { shareSong } from '@/lib/song-share'
import { UI_FONT } from '@/lib/fonts'

export type SongPreviewSeed = SongCardData & Partial<Omit<Song, keyof SongCardData>>

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const SONG_STREAMING_LINKS: { key: keyof Song; label: string }[] = [
  { key: 'spotifyUrl', label: 'Spotify' },
  { key: 'appleMusicUrl', label: 'Apple Music' },
  { key: 'youtubeUrl', label: 'YouTube' },
  { key: 'soundcloudUrl', label: 'SoundCloud' },
  { key: 'audiomackUrl', label: 'Audiomack' },
  { key: 'boomplayUrl', label: 'Boomplay' },
]

const COVER_SIZE = 96

/**
 * Compact song preview — mini profile before Play & Lyrics.
 * Mobile: bottom sheet. Desktop: centered card. Does not auto-play.
 */
export function SongPreviewSheet({
  song: seed,
  onClose,
  artistUsernameHint,
}: {
  song: SongPreviewSeed | null
  onClose: () => void
  artistUsernameHint?: string | null
}) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { isLiked, isListenLater, toggleLike, toggleListenLater } = useSongLibrarySaves()
  const { song: fetched } = useSong(seed?.id ?? null)
  const { profile: ownerProfile } = useSongOwnerProfile(seed?.id ?? null)

  const song = useMemo(() => {
    if (!seed) return null
    if (fetched) return { ...seed, ...fetched, lyricLines: fetched.lyricLines }
    return { ...seed, lyricLines: seed.lyricLines ?? [] } as Song
  }, [seed, fetched])

  useEffect(() => {
    if (!seed) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [seed, onClose])

  if (!seed || !song) return null

  const isActive = song.status === 'live' || song.status === 'active'
  const liked = isLiked(song.id)
  const later = isListenLater(song.id)
  const canQueue = !!(song.audioUrl && isActive)
  const description = (song.description || '').trim()
  const artistUsername = artistUsernameHint || ownerProfile?.username || null
  const artistBio = (ownerProfile?.bio || '').trim()

  const handlePlayAndLyrics = () => {
    if (!requireAuth()) return
    router.push(`/song/${song.id}`)
  }

  const queueSong = (mode: 'next' | 'add') => {
    if (!requireAuth()) return
    if (!song.audioUrl) return
    const item = fullSongToQueueItem({
      id: song.id,
      audioUrl: song.audioUrl,
      title: song.title,
      artist: song.artist,
      artwork: song.artwork ?? null,
    })
    if (mode === 'next') queuePlayNext(item)
    else queueAdd(item)
  }

  const libraryItems: CardOverflowItem[] = [
    {
      id: 'listen-later',
      label: later ? 'Remove from Listen Later' : 'Listen Later',
      onSelect: () => { void toggleListenLater(song.id) },
    },
    {
      id: 'play-next',
      label: 'Play Next',
      disabled: !canQueue,
      onSelect: () => queueSong('next'),
    },
    {
      id: 'add-queue',
      label: 'Add to Queue',
      disabled: !canQueue,
      onSelect: () => queueSong('add'),
    },
  ]

  const streamingItems: CardOverflowItem[] = SONG_STREAMING_LINKS.flatMap(({ key, label }) => {
    const href = song[key] as string | null | undefined
    if (!href) return []
    return [{
      id: `stream-${key}`,
      label: `Open on ${label}`,
      onSelect: () => { window.open(href, '_blank', 'noopener,noreferrer') },
    }]
  })

  const metaLine = `${formatNum(song.plays || 0)} plays · ${formatNum(song.lyricUses || 0)} lyric uses`
  const showArtistCard = !!(artistUsername || ownerProfile)

  const handleShare = () => {
    void shareSong({ id: song.id, title: song.title, artist: song.artist })
  }

  const ghostBtn: CSSProperties = {
    width: 'var(--margo-touch-min)',
    height: 'var(--margo-touch-min)',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border-hi)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 150ms ease',
    boxSizing: 'border-box',
    padding: 0,
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-preview-title"
      onClick={onClose}
      className="margo-preview-scrim"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 'var(--margo-page-bottom)',
        animation: 'fadeInOverlay 250ms ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .song-preview-play-btn:active { transform: scale(1.02); }
        .song-preview-ghost-btn:active { background: rgba(255,255,255,0.1) !important; }
        .song-preview-secondary-btn:active { background: rgba(255,255,255,0.08) !important; }
        @media (hover: hover) and (pointer: fine) {
          .song-preview-play-btn:hover { transform: scale(1.02); box-shadow: 0 6px 24px var(--gold-glow) !important; }
          .song-preview-ghost-btn:hover { background: rgba(255,255,255,0.1) !important; }
          .song-preview-secondary-btn:hover { background: rgba(255,255,255,0.07) !important; }
        }
        @media (min-width: 1024px) {
          .song-preview-sheet { border-radius: 20px; max-width: 520px; margin: auto; }
          .song-preview-wrap { align-items: center; padding-bottom: 0 !important; }
          .margo-preview-scrim { padding-bottom: 0 !important; }
        }
      `}</style>
      <div
        className="song-preview-wrap"
        onClick={onClose}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <div
          className="song-preview-sheet"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)',
            border: '1px solid var(--border-hi)',
            width: '100%',
            maxHeight: 'min(90dvh, calc(100dvh - var(--margo-page-bottom) - 8px))',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            animation: 'slideUp 320ms cubic-bezier(0.34,1.56,0.64,1) forwards',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-hi)' }} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: '8px', padding: '4px 16px 0', flexShrink: 0,
          }}>
            <button
              type="button"
              className="song-preview-ghost-btn"
              onClick={handleShare}
              aria-label="Share song"
              style={ghostBtn}
            >
              <ShareIcon size={18} color="currentColor" />
            </button>
            <button
              type="button"
              className="song-preview-ghost-btn"
              onClick={onClose}
              aria-label="Close"
              style={ghostBtn}
            >
              <CloseIcon size={18} color="currentColor" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 4px', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                position: 'relative', width: COVER_SIZE, height: COVER_SIZE, flexShrink: 0,
                borderRadius: '12px', overflow: 'hidden',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
              }}>
                {song.artwork ? (
                  <Image src={song.artwork} alt="" fill style={{ objectFit: 'cover' }} sizes={`${COVER_SIZE}px`} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--gold-faint), rgba(255,255,255,0.03))' }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1, paddingTop: '2px' }}>
                <h2
                  id="song-preview-title"
                  style={{
                    fontFamily: UI_FONT, fontSize: '0.95rem', fontWeight: 600,
                    color: 'var(--text)', margin: '0 0 3px', lineHeight: 1.25,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}
                >
                  {song.title}
                </h2>
                <p style={{
                  fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 400,
                  color: 'var(--text-secondary)', margin: '0 0 3px', lineHeight: 1.3,
                  display: 'flex', alignItems: 'baseline', minWidth: 0,
                }}>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0, flex: '1 1 auto',
                  }}>
                    {song.artist}
                  </span>
                  {song.isAiGenerated ? <AiGeneratedLabel show suffix /> : null}
                </p>
                <p style={{
                  fontFamily: UI_FONT, fontSize: '0.7rem', fontWeight: 400,
                  color: 'var(--text-muted)', margin: 0, lineHeight: 1.35,
                }}>
                  {metaLine}
                </p>
              </div>
            </div>

            {description ? (
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.82rem', fontWeight: 400,
                color: 'var(--text-secondary)', lineHeight: 1.5,
                margin: '12px 0 0',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              }}>
                {description}
              </p>
            ) : null}
          </div>

          <div style={{
            flexShrink: 0,
            padding: '10px 20px calc(14px + var(--margo-safe-bottom))',
            borderTop: '1px solid var(--border)',
            background: 'linear-gradient(180deg, rgba(14,12,18,0.92), rgba(14,12,18,0.99))',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="song-preview-secondary-btn"
                onClick={() => { void toggleLike(song.id) }}
                aria-pressed={liked}
                style={{
                  flex: 1, padding: '10px 12px',
                  background: liked ? 'var(--gold-faint)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid ' + (liked ? 'var(--gold-border)' : 'var(--border-hi)'),
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.65rem',
                  cursor: 'pointer',
                  color: liked ? 'var(--gold)' : 'var(--text-secondary)',
                  minHeight: 'var(--margo-touch-min)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                }}
              >
                <HeartIcon filled={liked} size={14} color="currentColor" />
                {liked ? 'Liked' : 'Like'}
              </button>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <CardOverflowMenu
                  items={libraryItems}
                  ariaLabel="Library"
                  icon="library"
                  label="Library"
                />
              </div>
            </div>

            {isActive ? (
              <button
                type="button"
                className="song-preview-play-btn"
                onClick={handlePlayAndLyrics}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 18px', background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 700, fontSize: '0.7rem',
                  letterSpacing: '0.5px', border: 'none',
                  minHeight: 'var(--margo-touch-min)', transition: 'all 200ms ease', cursor: 'pointer',
                  boxShadow: '0 4px 20px var(--gold-glow)', width: '100%',
                }}
              >
                Play &amp; Lyrics
                <ChevronRightIcon size={16} color="var(--bg)" />
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 18px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: '50px',
                fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.7rem',
                color: 'var(--text-muted)', minHeight: 'var(--margo-touch-min)',
              }}>
                {song.comingSoonLabel || 'Coming Soon'}
              </div>
            )}

            {streamingItems.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: UI_FONT, fontSize: '0.6rem', fontWeight: 500,
                  color: 'var(--text-muted)',
                }}>
                  Listen elsewhere
                </span>
                <CardOverflowMenu items={streamingItems} ariaLabel="Listen elsewhere" align="right" />
              </div>
            ) : null}

            {showArtistCard ? (
              <div style={{
                marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border)',
              }}>
                {artistUsername ? (
                  <Link
                    href={`/profile/${artistUsername}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      textDecoration: 'none', color: 'inherit', marginBottom: artistBio ? '6px' : '8px',
                      minHeight: 'var(--margo-touch-min)',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--gold-faint), rgba(255,255,255,0.04))',
                      border: '1px solid var(--border-hi)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {ownerProfile?.avatarUrl ? (
                        <img
                          src={ownerProfile.avatarUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{
                          fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)',
                        }}>
                          {(ownerProfile?.displayName || song.artist).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={{
                      flex: 1, minWidth: 0, fontFamily: UI_FONT, fontSize: '0.82rem', fontWeight: 600,
                      color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ownerProfile?.displayName || song.artist}
                    </span>
                    <ChevronRightIcon size={16} color="var(--text-muted)" />
                  </Link>
                ) : (
                  <p style={{
                    fontFamily: UI_FONT, fontSize: '0.82rem', fontWeight: 600,
                    color: 'var(--text)', margin: '0 0 6px', textAlign: 'left',
                  }}>
                    {ownerProfile?.displayName || song.artist}
                  </p>
                )}
                {artistBio ? (
                  <p style={{
                    fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 400,
                    color: 'var(--text-secondary)', lineHeight: 1.45,
                    margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {artistBio}
                  </p>
                ) : null}
                <ProfileArtistLinks
                  links={ownerProfile?.artistLinks}
                  compact
                  margoProfileUsername={artistUsername}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
