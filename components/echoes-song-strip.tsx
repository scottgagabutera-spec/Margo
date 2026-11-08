'use client'

import Image from 'next/image'
import type { EchoSongPayload, EchoSongPayloadItem } from '@/lib/echoes/types'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT
const VISIBLE = 3

export function EchoesSongStrip({ payload }: { payload: EchoSongPayload }) {
  const songs = payload.songs ?? []
  if (songs.length === 0) return null
  const extra = songs.length - VISIBLE

  return (
    <div className="margo-echoes-song-strip" role="list">
      {songs.slice(0, VISIBLE).map((song) => (
        <SongTile key={`${song.songTitle}-${song.artistName}`} song={song} />
      ))}
      {extra > 0 ? (
        <div className="margo-echoes-song-strip__more" role="listitem" style={{ fontFamily: font }}>
          +{extra}
        </div>
      ) : null}
    </div>
  )
}

function SongTile({ song }: { song: EchoSongPayloadItem }) {
  return (
    <figure className="margo-echoes-song-strip__tile" role="listitem">
      <div className="margo-echoes-song-strip__cover">
        {song.artworkUrl ? (
          <Image src={song.artworkUrl} alt="" width={56} height={56} className="margo-echoes-song-strip__img" unoptimized />
        ) : (
          <span className="margo-echoes-song-strip__cover-empty" aria-hidden />
        )}
      </div>
      <figcaption className="margo-echoes-song-strip__caption">
        <p className="margo-echoes-song-strip__title" style={{ fontFamily: font }}>
          {song.songTitle}
        </p>
        <p className="margo-echoes-song-strip__artist" style={{ fontFamily: font }}>
          {song.artistName || 'Unknown artist'}
        </p>
      </figcaption>
    </figure>
  )
}
