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
import { FEED_TYPE_SCALE, TYPE, UI_FONT } from '@/lib/fonts'
import { AuthorMeta } from '@/components/username-tag'
import { toast } from 'sonner'

const font = UI_FONT

export function EchoesPersonView({ setId, profileId }: { setId: string; profileId: string }) {
  const [title, setTitle] = useState('')
  const [row, setRow] = useState<EchoAnswerRow | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
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
      setDisplayName(data.profile?.display_name || data.profile?.username || data.row?.displayName || '')
      setUsername(data.profile?.username || data.row?.username || '')
      setAvatarUrl(data.profile?.avatar_url ?? data.row?.avatarUrl ?? null)
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
      <div className="margo-echoes-person" aria-busy="true" aria-label="Loading answer">
        <div className="margo-echoes-person__identity margo-echoes-person__identity--skeleton" />
        <div className="margo-echoes-person__song-row margo-echoes-person__song-row--skeleton" />
      </div>
    )
  }

  const timeLabel = row ? echoTimeChoiceLabel(row.timeChoice) : 'This week'
  const songs = row?.payload.songs ?? []
  const canPlayAll = songs.some((s) => s.songId && s.audioUrl && !s.isLyricOnly)

  return (
    <div className="margo-echoes-person">
      <header className="margo-echoes-person__identity">
        <MargoAvatar size="lg" imageUrl={avatarUrl} username={username} displayName={displayName} />
        <div className="margo-echoes-person__who">
          <AuthorMeta username={username || displayName} size="default" />
        </div>
      </header>
      <p className="margo-echoes-person__question" style={{ fontFamily: font, fontSize: TYPE.body }}>
        {title || 'What are you listening to?'}
      </p>
      <p className="margo-echoes-person__period" style={{ fontFamily: font, fontSize: FEED_TYPE_SCALE.sectionLabel }}>
        {timeLabel}
      </p>
      {canPlayAll ? (
        <button type="button" className="margo-echoes-person__play-all" onClick={playAll} style={{ fontFamily: font }}>
          <span className="margo-gold-square-30" aria-hidden>
            <PlayPauseIcon size={16} color="var(--bg)" playing={false} />
          </span>
          Play all
        </button>
      ) : null}
      <ul className="margo-echoes-person__songs">
        {songs.map((song) => (
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
        ) : (
          <span className="margo-echoes-person__art-empty" aria-hidden />
        )}
      </div>
      <div className="margo-echoes-person__song-meta">
        <p className="margo-echoes-person__song-title" style={{ fontFamily: font, fontSize: TYPE.song }}>
          {song.songTitle}
        </p>
        <p className="margo-echoes-person__song-artist" style={{ fontFamily: font, fontSize: TYPE.artist }}>
          {song.artistName}
        </p>
      </div>
      <button type="button" className="margo-feed-memory-card__action" aria-label={playing ? 'Pause' : 'Play'} onClick={play}>
        <PlayPauseIcon size={16} color="var(--bg)" playing={playing} />
      </button>
    </li>
  )
}
