'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { playOrToggleSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import {
  MOMENT_VIBE_PICKER_OPTIONS,
  resolveMargoMomentFromComposeDrafts,
  resolveMomentListen,
} from '@/lib/moment'

export type ComposeReadyLineDraft = {
  lyric: string
  songName: string
  artistName: string
  linkedSongId: string | null
  linkedAudioUrl: string | null
  artwork: string | null
  snippetStart: number | null
  snippetEnd: number | null
  source: string | null
  externalListenUrl: string | null
}

type Props = {
  drafts: ComposeReadyLineDraft[]
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  emotionLoading?: boolean
  onVibeSelect?: (label: string) => void
}

export function ComposeReadyPreview({
  drafts,
  vibeLabel,
  suggestedVibeLabel,
  emotionLoading = false,
  onVibeSelect,
}: Props) {
  const [lineIndex, setLineIndex] = useState(0)

  const validDrafts = useMemo(
    () => drafts.filter((d) => d.lyric.trim() && d.songName.trim() && d.artistName.trim()),
    [drafts],
  )
  const isMulti = validDrafts.length > 1
  const previewIndex = isMulti ? lineIndex : 0
  const draft = validDrafts[previewIndex]
  const songAtmosphere = useSongAtmosphere(draft?.linkedSongId)

  const listen = useMemo(() => {
    if (!draft) return null
    const moment = resolveMargoMomentFromComposeDrafts(
      [{
        lyric: draft.lyric,
        songName: draft.songName,
        artistName: draft.artistName,
        linkedSongId: draft.linkedSongId,
        linkedAudioUrl: draft.linkedAudioUrl,
        artwork: draft.artwork,
        snippetStart: draft.snippetStart,
        snippetEnd: draft.snippetEnd,
        source: draft.source,
      }],
    )
    return resolveMomentListen(moment)
  }, [draft])

  const canPlayInline = listen?.canPlayInline ?? false
  const playbackKey = draft?.linkedSongId || draft?.linkedAudioUrl || ''
  const { playing, buffering } = useSnippetPlaybackUi(playbackKey, 0)

  const handlePlay = useCallback(() => {
    if (!draft || !listen?.canPlayInline || !draft.linkedAudioUrl) return
    void playOrToggleSnippet({
      songId: draft.linkedSongId || draft.linkedAudioUrl,
      audioUrl: draft.linkedAudioUrl,
      title: draft.songName,
      artist: draft.artistName,
      artwork: draft.artwork,
      lineIndex: 0,
      lineText: draft.lyric,
      startSec: draft.snippetStart ?? 0,
      endSec: draft.snippetEnd ?? (draft.snippetStart ?? 0) + 8,
      atmosphere: livingAtmosphereOrNull(songAtmosphere),
      source: 'feed',
    })
  }, [draft, listen, songAtmosphere])

  if (!draft) return null

  return (
    <div>
      {isMulti && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
          <button
            type="button"
            aria-label="Previous line"
            onClick={() => setLineIndex((i) => (i - 1 + validDrafts.length) % validDrafts.length)}
            style={navBtnStyle}
          >
            <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
              <ChevronRightIcon size={14} color="var(--text-secondary)" />
            </span>
          </button>
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            Line {lineIndex + 1} of {validDrafts.length}
          </span>
          <button
            type="button"
            aria-label="Next line"
            onClick={() => setLineIndex((i) => (i + 1) % validDrafts.length)}
            style={navBtnStyle}
          >
            <ChevronRightIcon size={14} color="var(--text-secondary)" />
          </button>
        </div>
      )}
      <StageMomentCard
        lyric={draft.lyric}
        songTitle={draft.songName}
        artistName={draft.artistName}
        artwork={draft.artwork}
        vibeLabel={emotionLoading && !vibeLabel ? 'Finding…' : vibeLabel}
        suggestedVibeLabel={suggestedVibeLabel}
        vibeOptions={MOMENT_VIBE_PICKER_OPTIONS}
        onVibeSelect={onVibeSelect}
        atmosphereId={songAtmosphere}
        canPlay={canPlayInline}
        playing={playing}
        buffering={buffering}
        onPlay={handlePlay}
        listenUrl={listen && !listen.canPlayInline ? listen.externalUrl : null}
      />
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  flexShrink: 0,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
