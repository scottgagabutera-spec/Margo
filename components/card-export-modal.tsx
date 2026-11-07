'use client'

import { useEffect, useRef } from 'react'
import { MargoSheet } from '@/components/margo-sheet'
import { MomentShareStudio } from '@/components/moment-share-studio'
import type { MargoMoment } from '@/lib/moment/types'
import type { MomentLineInput } from '@/lib/moment-export/render-moment'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  artwork?: string | null
  postId?: string
  vibeLabel?: string | null
  moment?: MargoMoment | null
  lines?: MomentLineInput[]
  enablePromote?: boolean
  returnFocusPostId?: string | null
}

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  artwork = null,
  postId,
  vibeLabel,
  moment,
  lines,
  enablePromote = false,
  returnFocusPostId = null,
}: CardExportModalProps) {
  const openedRef = useRef(false)

  useEffect(() => {
    if (open) {
      openedRef.current = true
      return
    }
    if (!openedRef.current) return
    openedRef.current = false
    const id = returnFocusPostId
    if (!id) return
    const run = () => {
      const el = document.querySelector<HTMLElement>(`[data-margo-card-trigger="${id}"]`)
      el?.focus({ preventScroll: true })
    }
    window.requestAnimationFrame(run)
  }, [open, returnFocusPostId])

  return (
    <MargoSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your Moment"
      zIndex={1400}
      heightMode="fixed"
      anchor="top"
      fullViewport
      dismissOnBack
      bottomInset="none"
      panelOverflow="hidden"
      contentOverflow="hidden"
    >
      <MomentShareStudio
        moment={moment}
        lines={lines}
        lyric={lyric}
        song={song}
        artist={artist}
        artwork={artwork}
        postId={postId}
        vibeLabel={vibeLabel}
        layout="modal"
        enablePromote={enablePromote}
      />
    </MargoSheet>
  )
}
