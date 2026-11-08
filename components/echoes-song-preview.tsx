'use client'

import Image from 'next/image'
import type { EchoSongPayload } from '@/lib/echoes/types'
import { echoExtraSongLabel, echoPrimarySong } from '@/lib/echoes/answer-song-display'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function EchoesSongPreview({
  payload,
  compact = false,
}: {
  payload: EchoSongPayload
  compact?: boolean
}) {
  const song = echoPrimarySong(payload)
  const extra = echoExtraSongLabel(payload)
  if (!song) {
    return (
      <p className="margo-echoes-song-preview__empty" style={{ fontFamily: font }}>
        Songs
      </p>
    )
  }
  return (
    <div className={`margo-echoes-song-preview${compact ? ' margo-echoes-song-preview--compact' : ''}`}>
      <div className="margo-echoes-song-preview__art">
        {song.artworkUrl ? (
          <Image src={song.artworkUrl} alt="" width={compact ? 36 : 44} height={compact ? 36 : 44} className="margo-echoes-song-preview__img" />
        ) : (
          <span className="margo-echoes-song-preview__art-empty" aria-hidden />
        )}
      </div>
      <div className="margo-echoes-song-preview__meta">
        <p className="margo-echoes-song-preview__title" style={{ fontFamily: font }}>
          {song.songTitle}
        </p>
        <p className="margo-echoes-song-preview__artist" style={{ fontFamily: font }}>
          {song.artistName || 'Unknown artist'}
        </p>
        {extra ? (
          <p className="margo-echoes-song-preview__more" style={{ fontFamily: font }}>
            {extra}
          </p>
        ) : null}
      </div>
    </div>
  )
}
