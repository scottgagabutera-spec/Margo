'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CloseIcon, ChevronRightIcon } from '@/components/icons'
import { AiGeneratedLabel } from '@/components/ai-generated-label'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { HeartIcon } from '@/components/heart-icon'
import { ProfileArtistLinks } from '@/components/profile-artist-links'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useSharedLines } from '@/hooks/useSharedLines'
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
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'

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

/**
 * Premium song preview — mini song profile before Play & Lyrics.
 * Mobile: bottom sheet. Desktop: centered card. Does not auto-play.
 */
export function SongPreviewSheet({
  song: seed,
  onClose,
  artistUsernameHint,
}: {
  song: SongPreviewSeed | null
  onClose: () => void
  /** When the parent already knows the artist (e.g. profile discography). */
  artistUsernameHint?: string | null
}) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { isLiked, isListenLater, toggleLike, toggleListenLater } = useSongLibrarySaves()
  const { song: fetched, loading: songLoading } = useSong(seed?.id ?? null)
  const { profile: ownerProfile } = useSongOwnerProfile(seed?.id ?? null)
  const [aboutOpen, setAboutOpen] = useState(false)

  const song = useMemo(() => {
    if (!seed) return null
    if (fetched) return { ...seed, ...fetched, lyricLines: fetched.lyricLines }
    return { ...seed, lyricLines: seed.lyricLines ?? [] } as Song
  }, [seed, fetched])

  const { lines } = useSharedLines(song?.title, song?.artist)

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

  useEffect(() => {
    setAboutOpen(false)
  }, [seed?.id])

  if (!seed || !song) return null

  const isActive = song.status === 'live' || song.status === 'active'
  const liked = isLiked(song.id)
  const later = isListenLater(song.id)
  const canQueue = !!(song.audioUrl && isActive)
  const description = (song.description || '').trim()
  const artistUsername = artistUsernameHint || ownerProfile?.username || null

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

  const moreItems: CardOverflowItem[] = [
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
    ...SONG_STREAMING_LINKS.flatMap(({ key, label }) => {
      const href = song[key] as string | null | undefined
      if (!href) return []
      return [{
        id: `stream-${key}`,
        label: `Open on ${label}`,
        onSelect: () => { window.open(href, '_blank', 'noopener,noreferrer') },
      }]
    }),
  ]

  const metaBits = [
    `${formatNum(song.plays || 0)} plays`,
    `${formatNum(song.lyricUses || 0)} lyric uses`,
  ]

  const hasAboutArtist = !!(ownerProfile?.bio || (ownerProfile?.artistLinks && Object.keys(ownerProfile.artistLinks).length > 0))

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
        .song-preview-close-btn:active { background: rgba(255,255,255,0.1) !important; }
        .song-preview-secondary-btn:active { background: rgba(255,255,255,0.08) !important; }
        @media (hover: hover) and (pointer: fine) {
          .song-preview-play-btn:hover { transform: scale(1.02); box-shadow: 0 6px 24px var(--gold-glow) !important; }
          .song-preview-close-btn:hover { background: rgba(255,255,255,0.1) !important; }
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-hi)' }} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            padding: '4px 16px 0', flexShrink: 0,
          }}>
            <button
              type="button"
              className="song-preview-close-btn"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-hi)',
                color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease', boxSizing: 'border-box',
              }}
            >
              <CloseIcon size={18} color="currentColor" />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 12px', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                position: 'relative', width: '148px', height: '148px', flexShrink: 0,
                borderRadius: '14px', overflow: 'hidden', marginBottom: '16px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
              }}>
                {song.artwork ? (
                  <Image src={song.artwork} alt="" fill style={{ objectFit: 'cover' }} sizes="148px" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--gold-faint), rgba(255,255,255,0.03))' }} />
                )}
              </div>
              <h2
                id="song-preview-title"
                style={{
                  fontFamily: UI_FONT, fontSize: '1.25rem', fontWeight: 600,
                  color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.2,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {song.title}
              </h2>
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.82rem',
                color: 'var(--text-secondary)', margin: '0 0 8px', letterSpacing: '0.2px',
              }}>
                {song.artist}
              </p>
              {song.isAiGenerated ? (
                <div style={{ marginBottom: '8px' }}>
                  <AiGeneratedLabel show />
                </div>
              ) : null}
            </div>

            {description ? (
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.82rem', color: 'var(--text-secondary)',
                lineHeight: 1.55, margin: '0 0 14px', textAlign: 'center',
              }}>
                {description}
              </p>
            ) : songLoading ? (
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.75rem', color: 'var(--text-muted)',
                margin: '0 0 14px', textAlign: 'center',
              }}>
                Loading…
              </p>
            ) : null}

            <p style={{
              fontFamily: UI_FONT, fontSize: '0.7rem', color: 'var(--text-muted)',
              letterSpacing: '0.2px', margin: '0 0 16px', textAlign: 'center', lineHeight: 1.5,
            }}>
              {metaBits.join(' · ')}
            </p>

            {lines[0] ? (
              <div style={{
                padding: '14px 18px', background: 'var(--gold-faint)',
                border: '1px solid var(--gold-border)', borderRadius: '12px',
                marginBottom: '8px',
              }}>
                <p style={{
                  fontFamily: LYRIC_FONT, fontStyle: 'italic', fontSize: '1.05rem',
                  color: 'var(--text)', lineHeight: 1.6, margin: 0, textAlign: 'center',
                }}>
                  &ldquo;{lines[0].line}&rdquo;
                </p>
                <p style={{
                  fontFamily: UI_FONT, fontSize: '0.65rem', color: 'var(--text-muted)',
                  letterSpacing: '0.3px', marginTop: '10px', marginBottom: 0, textAlign: 'center',
                }}>
                  Most shared line · {lines[0].uses} {lines[0].uses === 1 ? 'use' : 'uses'}
                </p>
              </div>
            ) : null}
          </div>

          <div style={{
            flexShrink: 0,
            padding: '12px 28px calc(16px + var(--margo-safe-bottom))',
            borderTop: '1px solid var(--border)',
            background: 'linear-gradient(180deg, rgba(14,12,18,0.92), rgba(14,12,18,0.99))',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="song-preview-secondary-btn"
                onClick={() => { void toggleLike(song.id) }}
                aria-pressed={liked}
                style={{
                  flex: 1, padding: '12px 10px',
                  background: liked ? 'var(--gold-faint)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid ' + (liked ? 'var(--gold-border)' : 'var(--border-hi)'),
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.65rem',
                  letterSpacing: '0.5px', cursor: 'pointer',
                  color: liked ? 'var(--gold)' : 'var(--text-secondary)',
                  minHeight: 'var(--margo-touch-min)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                }}
              >
                <HeartIcon filled={liked} size={14} color="currentColor" />
                {liked ? 'Liked' : 'Like'}
              </button>
              <button
                type="button"
                className="song-preview-secondary-btn"
                onClick={() => { void toggleListenLater(song.id) }}
                aria-pressed={later}
                style={{
                  flex: 1, padding: '12px 10px',
                  background: later ? 'var(--gold-faint)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid ' + (later ? 'var(--gold-border)' : 'var(--border-hi)'),
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.65rem',
                  letterSpacing: '0.5px', cursor: 'pointer',
                  color: later ? 'var(--gold)' : 'var(--text-secondary)',
                  minHeight: 'var(--margo-touch-min)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                }}
              >
                {later ? 'Saved' : 'Listen Later'}
              </button>
            </div>

            {isActive ? (
              <button
                type="button"
                className="song-preview-play-btn"
                onClick={handlePlayAndLyrics}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px 20px', background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 700, fontSize: '0.7rem',
                  letterSpacing: '0.8px', border: 'none',
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
                padding: '14px 20px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: '50px',
                fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.7rem',
                color: 'var(--text-muted)', minHeight: 'var(--margo-touch-min)',
              }}>
                {song.comingSoonLabel || 'Coming Soon'}
              </div>
            )}

            {moreItems.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: UI_FONT, fontSize: '0.65rem', fontWeight: 600,
                  color: 'var(--text-muted)', letterSpacing: '0.3px',
                }}>
                  More
                </span>
                <CardOverflowMenu items={moreItems} ariaLabel="More song actions" align="right" />
              </div>
            ) : null}

            {(artistUsername || ownerProfile) ? (
              <div style={{
                marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border)',
              }}>
                <p style={{
                  fontFamily: UI_FONT, fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--text)', margin: '0 0 6px', textAlign: 'center',
                }}>
                  {ownerProfile?.displayName || song.artist}
                </p>
                {artistUsername ? (
                  <Link
                    href={`/profile/${artistUsername}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      fontFamily: UI_FONT, fontSize: '0.7rem', fontWeight: 600,
                      color: 'var(--gold)', textDecoration: 'none', minHeight: 'var(--margo-touch-min)',
                    }}
                  >
                    View artist
                    <ChevronRightIcon size={14} color="var(--gold)" />
                  </Link>
                ) : null}
                {hasAboutArtist ? (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setAboutOpen(o => !o)}
                      aria-expanded={aboutOpen}
                      style={{
                        width: '100%', padding: '10px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: UI_FONT, fontSize: '0.65rem', fontWeight: 600,
                        letterSpacing: '0.5px', color: 'var(--text-muted)',
                        minHeight: 'var(--margo-touch-min)',
                      }}
                    >
                      {aboutOpen ? 'Hide about artist' : 'About artist'}
                    </button>
                    {aboutOpen ? (
                      <div style={{ padding: '0 4px 8px' }}>
                        {ownerProfile?.bio ? (
                          <p style={{
                            fontFamily: UI_FONT, fontSize: '0.8rem', color: 'var(--text-secondary)',
                            lineHeight: 1.5, margin: '0 0 12px', textAlign: 'center',
                          }}>
                            {ownerProfile.bio}
                          </p>
                        ) : null}
                        <ProfileArtistLinks links={ownerProfile?.artistLinks} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
