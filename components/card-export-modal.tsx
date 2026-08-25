'use client'

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
  return (
    <MargoSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your Moment"
      zIndex={200}
      heightMode="auto"
      maxHeight="min(82dvh, 620px)"
      panelOverflow="visible"
      contentOverflow="auto"
    >
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
    </MargoSheet>
  )
}
