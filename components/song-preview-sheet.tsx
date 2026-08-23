'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CloseIcon, ChevronRightIcon, ShareIcon } from '@/components/icons'
import { PlayIcon } from '@/components/icons/play-icon'
import { AiGeneratedLabel } from '@/components/ai-generated-label'
import { CardOverflowMenu, type CardOverflowItem } from '@/components/card-overflow-menu'
import { HeartIcon } from '@/components/heart-icon'
import { ProfileArtistLinks } from '@/components/profile-artist-links'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useSongOwnerProfile } from '@/hooks/useSongOwnerProfile'
import { useSongPreviewEnrich } from '@/hooks/useSongPreviewEnrich'
import { useSongResonate } from '@/hooks/useSongResonate'
import { useSongLibrarySaves } from '@/hooks/useSongLibrarySaves'
import { useSharedLines } from '@/hooks/useSharedLines'
import type { Song } from '@/hooks/useSongs'
import type { SongCardData } from '@/components/song-catalog-card'
import {
  fullSongToQueueItem,
  queueAdd,
  queuePlayNext,
} from '@/lib/audio-engine'
import { getSongShareUrl } from '@/lib/song-share'
import { captureLiteralUi } from '@/lib/export/literal-ui-capture'
import { logExportDebug } from '@/lib/export/export-debug'
import { shareImageBlob } from '@/lib/export/share-image-blob'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'

export type SongPreviewSeed = SongCardData & Partial<Omit<Song, keyof SongCardData>>

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const COVER_SIZE = 96
const ACTION_H = 40

function ArtistSkeleton() {
  const bar = (w: string, h: number, mb = 0): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.06)',
    marginBottom: mb,
  })

  return (
    <div aria-hidden style={{ minHeight: '118px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={bar('72%', 12, 6)} />
        </div>
      </div>
      <div style={bar('100%', 10, 5)} />
      <div style={bar('88%', 10, 10)} />
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: '14px', height: '14px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Centered song profile card — compact preview before Play & Lyrics.
 * Does not auto-play.
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
  const { isListenLater, toggleListenLater } = useSongLibrarySaves()
  const { enrich } = useSongPreviewEnrich(seed?.id ?? null)
  const { profile: ownerProfile, loading: ownerLoading } = useSongOwnerProfile(seed?.id ?? null)
  const { lines: sharedLines } = useSharedLines(seed?.title ?? null, seed?.artist ?? null)
  const [descExpanded, setDescExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const shareInProgressRef = useRef(false)

  const song = useMemo(() => {
    if (!seed) return null
    return { ...seed, ...enrich, lyricLines: seed.lyricLines ?? [] } as Song
  }, [seed, enrich])

  const { resonated, displayCount: resonateCount, toggleResonate } = useSongResonate(
    seed?.id ?? null,
    song?.resonates ?? seed?.resonates ?? 0,
  )

  useEffect(() => {
    if (!seed) return
    setDescExpanded(false)
  }, [seed?.id])

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
  const later = isListenLater(song.id)
  const canQueue = !!(song.audioUrl && isActive)
  const description = (song.description || '').trim()
  const artistUsername = artistUsernameHint || ownerProfile?.username || null
  const artistBio = (ownerProfile?.bio || '').trim()
  const topSharedLine = sharedLines[0]?.line?.trim() || ''

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

  const handleShare = async () => {
    const attemptId = `song-preview-${song.id}-${Date.now()}`
    const card = cardRef.current
    const shareUrl = getSongShareUrl(song.id)
    const shareTitle = `${song.title} — ${song.artist}`

    if (shareInProgressRef.current) {
      logExportDebug('song-preview-sheet:share', {
        attemptId,
        branch: 'ignored-concurrent-tap',
        note: 'previous share still in progress',
      })
      return
    }

    if (!card) {
      toast.error('Could not create share image')
      return
    }

    logExportDebug('song-preview-sheet:share', {
      attemptId,
      hasCardRef: true,
      cardConnected: card.isConnected,
    })

    shareInProgressRef.current = true
    const toastId = toast.loading('Creating share image…')
    try {
      const blob = await captureLiteralUi(card, { attemptId })
      const result = await shareImageBlob(blob, {
        filename: `margo-song-${song.id}.png`,
        title: shareTitle,
        url: shareUrl,
        attemptId,
      })
      toast.dismiss(toastId)
      logExportDebug('song-preview-sheet:share', { attemptId, branch: 'literal-export', result })
      if (result === 'shared-file') toast.success('Shared')
      else if (result === 'downloaded') toast.success('Image saved · Link copied')
      else if (result === 'failed') toast.message('Share cancelled')
    } catch (err) {
      console.error('song preview literal export failed', err)
      logExportDebug('song-preview-sheet:share', {
        attemptId,
        branch: 'capture-failed',
        error: (err as Error)?.message ?? String(err),
      })
      toast.dismiss(toastId)
      toast.error('Could not create share image')
    } finally {
      shareInProgressRef.current = false
    }
  }

  const closeBtn: CSSProperties = {
    width: ACTION_H,
    height: ACTION_H,
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 150ms ease, color 150ms ease',
    boxSizing: 'border-box',
    padding: 0,
  }

  const topUtilityBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 8px',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: UI_FONT,
    fontSize: '0.7rem',
    fontWeight: 500,
    transition: 'color 150ms ease',
    flexShrink: 0,
  }

  const descLong = description.length > 140

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-preview-title"
      onClick={onClose}
      className="margo-preview-scrim"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
        animation: 'fadeInOverlay 250ms ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { transform: translateY(8px) scale(0.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
        .song-preview-play-btn:active { transform: scale(0.98); }
        .song-preview-top-btn:active { opacity: 0.75; }
        @media (hover: hover) and (pointer: fine) {
          .song-preview-play-btn:hover { filter: brightness(1.06); }
          .song-preview-top-btn:hover { color: var(--text) !important; }
        }
        @media (max-width: 639px) {
          .song-preview-card { transform: translateY(-2vh); }
        }
      `}</style>

      <div
        ref={cardRef}
        className="song-preview-card"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)',
          border: '1px solid var(--border-hi)',
          width: 'min(400px, calc(100% - 24px))',
          maxWidth: '440px',
          maxHeight: 'min(92dvh, calc(100dvh - 24px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '20px',
          animation: 'scaleIn 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: '2px', padding: '10px 8px 0', flexShrink: 0,
        }}>
          <button
            type="button"
            className="song-preview-top-btn"
            onClick={() => { void handleShare() }}
            aria-label="Share song"
            style={topUtilityBtn}
          >
            <ShareIcon size={15} color="currentColor" />
            Share
          </button>
          <button
            type="button"
            className="song-preview-top-btn"
            onClick={onClose}
            aria-label="Close"
            style={closeBtn}
          >
            <CloseIcon size={18} color="currentColor" />
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '4px 18px 16px',
          WebkitOverflowScrolling: 'touch', minHeight: 0,
        }}>
          {/* Song identity */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              position: 'relative', width: COVER_SIZE, height: COVER_SIZE, flexShrink: 0,
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {song.artwork ? (
                <Image
                  src={song.artwork}
                  alt=""
                  fill
                  crossOrigin="anonymous"
                  style={{ objectFit: 'cover' }}
                  sizes={`${COVER_SIZE}px`}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--gold-faint), rgba(255,255,255,0.03))' }} />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1, paddingTop: '1px' }}>
              <h2
                id="song-preview-title"
                style={{
                  fontFamily: UI_FONT, fontSize: '1.05rem', fontWeight: 600,
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
                {formatNum(song.plays || 0)} plays · {formatNum(song.lyricUses || 0)} lyric uses ·{' '}
                <button
                  type="button"
                  onClick={() => { void toggleResonate() }}
                  aria-pressed={resonated}
                  aria-label={resonated ? 'Remove resonate' : 'Resonate with song'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    fontWeight: 'inherit',
                    lineHeight: 'inherit',
                    color: resonated ? 'var(--gold)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    verticalAlign: 'baseline',
                  }}
                >
                  <HeartIcon filled={resonated} size={12} color="currentColor" />
                  {formatNum(resonateCount)}
                </button>
              </p>
            </div>
          </div>

          {/* Description */}
          {description ? (
            <div style={{ marginTop: '12px' }}>
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.8rem', fontWeight: 400,
                color: 'var(--text-secondary)', lineHeight: 1.48,
                margin: 0,
                overflow: descExpanded ? 'visible' : 'hidden',
                display: descExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: descExpanded ? undefined : 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {description}
              </p>
              {descLong && !descExpanded ? (
                <button
                  type="button"
                  onClick={() => setDescExpanded(true)}
                  style={{
                    marginTop: '4px', padding: 0, border: 'none', background: 'none',
                    fontFamily: UI_FONT, fontSize: '0.7rem', fontWeight: 500,
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  More
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Economical lyric social proof */}
          {topSharedLine ? (
            <div style={{ marginTop: description ? '10px' : '12px' }}>
              <p style={{
                fontFamily: UI_FONT, fontSize: '0.65rem', fontWeight: 400,
                color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.3,
              }}>
                Most shared line
              </p>
              <p style={{
                fontFamily: LYRIC_FONT, fontSize: '0.85rem', fontWeight: 400,
                color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                fontStyle: 'italic',
              }}>
                {topSharedLine}
              </p>
            </div>
          ) : null}

          {/* Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginTop: '14px',
          }}>
            {isActive ? (
              <button
                type="button"
                className="song-preview-play-btn"
                onClick={handlePlayAndLyrics}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '0 18px', height: ACTION_H,
                  background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: '50px', fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.7rem',
                  border: 'none', cursor: 'pointer', transition: 'transform 150ms ease, background 150ms ease',
                  flexShrink: 0,
                }}
              >
                <PlayIcon size={16} color="var(--bg)" />
                Play &amp; Lyrics
              </button>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 18px', height: ACTION_H,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: '50px',
                fontFamily: UI_FONT, fontWeight: 600, fontSize: '0.7rem',
                color: 'var(--text-muted)',
              }}>
                {song.comingSoonLabel || 'Coming Soon'}
              </div>
            )}

            <CardOverflowMenu
              items={libraryItems}
              ariaLabel="Library"
              icon="library"
              label="Library"
              compact
            />
          </div>

          {/* Artist block — always reserved */}
          <div style={{
            marginTop: '16px', paddingTop: '14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            minHeight: '118px',
          }}>
            {ownerLoading && !ownerProfile ? (
              <ArtistSkeleton />
            ) : (
              <>
                {artistUsername ? (
                  <Link
                    href={`/profile/${artistUsername}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      textDecoration: 'none', color: 'inherit', marginBottom: artistBio ? '6px' : '8px',
                      minHeight: '40px',
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
                          crossOrigin="anonymous"
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
                    color: 'var(--text)', margin: '0 0 6px',
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
                  variant="preview"
                  margoProfileUsername={artistUsername}
                  onMargoProfileClick={onClose}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
