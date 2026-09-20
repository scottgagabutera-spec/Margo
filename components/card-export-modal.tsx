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
  artwork?: string | null
  postId?: string
  vibeLabel?: string | null
  moment?: MargoMoment | null
  lines?: MomentLineInput[]
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
  enablePromote?: boolean
}

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  artwork = null,
  postId,
  vibeLabel,
  moment,
  lines,
  parentLyric, parentSong, parentArtist,
  enablePromote = false,
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
        artwork={artwork}
        postId={postId}
        vibeLabel={vibeLabel}
        parentLyric={parentLyric}
        parentSong={parentSong}
        parentArtist={parentArtist}
        layout="modal"
        enablePromote={enablePromote}
      />
    </MargoSheet>
  )
}
