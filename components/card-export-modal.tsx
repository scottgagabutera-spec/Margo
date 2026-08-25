'use client'

import { useEffect } from 'react'
import { CloseIcon } from '@/components/icons'
import { MomentShareStudio } from '@/components/moment-share-studio'
import type { MargoMoment } from '@/lib/moment/types'
import type { MomentLineInput } from '@/lib/moment-export/render-moment'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  vibeLabel?: string | null
  moment?: MargoMoment | null
  lines?: MomentLineInput[]
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
}

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  postId,
  vibeLabel,
  moment,
  lines,
  parentLyric, parentSong, parentArtist,
}: CardExportModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, overscrollBehavior: 'none' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(7,6,10,0.92)',
          cursor: 'default',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '100%',
          padding: '12px',
          paddingTop: 'clamp(20px, 7vh, 48px)',
          /* Top-anchored sheet: vibe expansion grows downward, not by re-centering */
          paddingBottom: 'calc(12px + var(--margo-tabbar-h, 64px) + 28px)',
          pointerEvents: 'none',
        }}
      >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 18px 8px', flexShrink: 0, gap: '12px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
              color: 'var(--gold)', letterSpacing: '1.8px', textTransform: 'uppercase', margin: '0 0 6px',
            }}>
              Share your Moment
            </p>
            <p style={{
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.45,
            }}>
              Tap Save ▾ or Share ▾ — menus open below.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        <div style={{
          padding: '0 18px 20px',
          overflow: 'visible',
        }}>
          <MomentShareStudio
            moment={moment}
            lines={lines}
            lyric={lyric}
            song={song}
            artist={artist}
            postId={postId}
            vibeLabel={vibeLabel}
            parentLyric={parentLyric}
            parentSong={parentSong}
            parentArtist={parentArtist}
            layout="modal"
          />
        </div>
      </div>
      </div>
    </div>
  )
}
