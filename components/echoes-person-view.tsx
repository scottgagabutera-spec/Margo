'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoAnswerRow, EchoSongPayloadItem } from '@/lib/echoes/types'
import { echoTimeChoiceLabel } from '@/lib/echoes/time-choice'
import { useRegisterNavBack } from '@/components/nav-back'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'
import { playFull, togglePlayPause } from '@/lib/audio-engine'
import { useIsPlaying } from '@/hooks/useAudioEngine'
import { UI_FONT } from '@/lib/fonts'
import { toast } from 'sonner'

const font = UI_FONT

export function EchoesPersonView({ setId, profileId }: { setId: string; profileId: string }) {
  const [title, setTitle] = useState('')
  const [row, setRow] = useState<EchoAnswerRow | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/echoes/sets/${encodeURIComponent(setId)}/profiles/${encodeURIComponent(profileId)}`,
      )
      const data = await res.json()
      if (!res.ok) throw new Error()
      setTitle(data.title)
      setRow(data.row)
      setDisplayName(data.profile?.display_name || data.profile?.username || '')
      setAvatarUrl(data.profile?.avatar_url ?? null)
    } catch {
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [setId, profileId])

  useEffect(() => {
    void load()
  }, [load])

  useRegisterNavBack({ preferHistory: true, fallbackHref: feedReturnFallbackHref() })

  const playAll = () => {
    const songs = row?.payload.songs ?? []
    const first = songs.find((s) => s.songId && s.audioUrl && !s.isLyricOnly)
    if (!first?.songId || !first.audioUrl) {
      toast('No Margo audio')
      return
    }
    void playFull({
      songId: first.songId,
      audioUrl: first.audioUrl,
      title: first.songTitle,
      artist: first.artistName,
      artwork: first.artworkUrl,
      autoplay: true,
      source: 'feed-tier1',
    })
  }

  if (loading) {
    return (
      <p className="margo-echoes-person__loading" style={{ fontFamily: font }}>
        Loading
      </p>
    )
  }

  const timeLabel = row ? echoTimeChoiceLabel(row.timeChoice) : 'This week'

  return (
    <div className="margo-echoes-person">
      <header className="margo-echoes-person__head">
        <MargoAvatar size="lg" imageUrl={avatarUrl} displayName={displayName} />
        <div>
          <p className="margo-echoes-person__name" style={{ fontFamily: font }}>
            {displayName}
          </p>
          <p className="margo-echoes-person__status" style={{ fontFamily: font }}>
            {title} · {timeLabel}
          </p>
        </div>
        <button type="button" className="margo-feed-memory-card__action" aria-label="Play all" onClick={playAll}>
          <PlayPauseIcon size={18} color="var(--bg)" playing={false} />
        </button>
      </header>
      <ul className="margo-echoes-person__songs">
        {(row?.payload.songs ?? []).map((song) => (
          <EchoSongRow key={`${song.songId}-${song.songTitle}`} song={song} />
        ))}
      </ul>
    </div>
  )
}

function EchoSongRow({ song }: { song: EchoSongPayloadItem }) {
  const playing = useIsPlaying(song.songId)
  const play = () => {
    if (!song.songId || !song.audioUrl || song.isLyricOnly) {
      toast('No Margo audio')
      return
    }
    if (playing) {
      togglePlayPause()
      return
    }
    void playFull({
      songId: song.songId,
      audioUrl: song.audioUrl,
      title: song.songTitle,
      artist: song.artistName,
      artwork: song.artworkUrl,
      autoplay: true,
      source: 'feed-tier1',
    })
  }

  return (
    <li className="margo-echoes-person__song-row">
      <div className="margo-echoes-person__art">
        {song.artworkUrl ? (
          <Image src={song.artworkUrl} alt="" fill sizes="48px" className="margo-echoes-person__art-img" />
        ) : null}
      </div>
      <div>
        <p className="margo-echoes-person__song-title" style={{ fontFamily: font }}>
          {song.songTitle}
        </p>
        <p className="margo-echoes-person__song-artist" style={{ fontFamily: font }}>
          {song.artistName}
        </p>
      </div>
      <button type="button" className="margo-feed-memory-card__action" aria-label="Play" onClick={play}>
        <PlayPauseIcon size={16} color="var(--bg)" playing={playing} />
      </button>
    </li>
  )
}
