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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,6,10,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overscrollBehavior: 'none',
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'min(90dvh, 680px)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 8px', flexShrink: 0,
        }}>
          <p style={{
            fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
            color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0,
          }}>
            Share your Moment
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px',
          WebkitOverflowScrolling: 'touch',
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
            compact
          />
        </div>
      </div>
    </div>
  )
}
