'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import {
  MOMENT_VIBE_PICKER_OPTIONS,
  resolveMargoMomentFromComposeDrafts,
  resolveMomentListen,
} from '@/lib/moment'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

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
}

export function ComposeReadyPreview({ drafts, vibeLabel, suggestedVibeLabel }: Props) {
  const [lineIndex, setLineIndex] = useState(0)
  const [cardThemeId, setCardThemeId] = useState<StageCardThemeId>('gold')

  const validDrafts = useMemo(
    () => drafts.filter((d) => d.lyric.trim() && d.songName.trim() && d.artistName.trim()),
    [drafts],
  )
  const isMulti = validDrafts.length > 1
  const previewIndex = isMulti ? lineIndex : 0
  const draft = validDrafts[previewIndex]

  const listen = useMemo(() => {
    if (!draft) return null
    const moment = resolveMargoMomentFromComposeDrafts(
      [{
        lyric: draft.lyric,
        songName: draft.songName,
        artistName: draft.artistName,
        artwork: draft.artwork,
        linkedSongId: draft.linkedSongId,
        linkedAudioUrl: draft.linkedAudioUrl,
        snippetStart: draft.snippetStart,
        snippetEnd: draft.snippetEnd,
        source: draft.source,
      }],
      { vibeLabel, themeId: cardThemeId },
    )
    return resolveMomentListen(moment, {
      itunesTrackUrl: draft.externalListenUrl ?? null,
    })
  }, [draft, vibeLabel, cardThemeId])

  const canPlayInline = listen?.canPlayInline ?? false
  const playbackKey = draft?.linkedSongId || draft?.linkedAudioUrl || ''
  const margoLineIndex = draft?.linkedSongId ? 0 : 0
  const { playing, buffering } = useSnippetPlaybackUi(
    canPlayInline && playbackKey ? playbackKey : null,
    canPlayInline ? margoLineIndex : null,
  )

  const handlePlay = useCallback(() => {
    if (!draft?.linkedAudioUrl || !canPlayInline) return
    if (draft.snippetStart == null || draft.snippetEnd == null) return
    void playSnippet({
      songId: draft.linkedSongId || draft.linkedAudioUrl,
      audioUrl: draft.linkedAudioUrl,
      title: draft.songName,
      artist: draft.artistName,
      artwork: draft.artwork,
      lineIndex: margoLineIndex,
      lineText: draft.lyric,
      startSec: draft.snippetStart,
      endSec: draft.snippetEnd,
      source: 'feed',
    })
  }, [draft, canPlayInline, margoLineIndex])

  if (!draft) return null

  return (
    <div style={{ marginBottom: '32px' }}>
      {isMulti && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
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
        vibeLabel={vibeLabel}
        suggestedVibeLabel={suggestedVibeLabel}
        vibeOptions={MOMENT_VIBE_PICKER_OPTIONS}
        cardThemeId={cardThemeId}
        onThemeChange={setCardThemeId}
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
