'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { playOrToggleSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useSongAtmosphere } from '@/hooks/useSongAtmosphere'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import { UI_FONT } from '@/lib/fonts'
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

export type ComposeReadyReplyTo = {
  drafts: ComposeReadyLineDraft[]
  vibeLabel?: string | null
  byline?: ReactNode
}

type Props = {
  drafts: ComposeReadyLineDraft[]
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  emotionLoading?: boolean
  onVibeSelect?: (label: string) => void
  /** Parent Moment — Lyric Back conversation (main, then reply). */
  inReplyTo?: ComposeReadyReplyTo | null
}

function validDraftsOf(drafts: ComposeReadyLineDraft[]) {
  return drafts.filter((d) => d.lyric.trim() && d.songName.trim() && d.artistName.trim())
}

function ReadyStageCard({
  drafts,
  vibeLabel,
  suggestedVibeLabel,
  emotionLoading = false,
  onVibeSelect,
}: {
  drafts: ComposeReadyLineDraft[]
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  emotionLoading?: boolean
  onVibeSelect?: (label: string) => void
}) {
  const [lineIndex, setLineIndex] = useState(0)

  const validDrafts = useMemo(() => validDraftsOf(drafts), [drafts])
  const isMulti = validDrafts.length > 1
  const previewIndex = isMulti ? lineIndex % validDrafts.length : 0
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
    return resolveMomentListen(moment, {
      itunesTrackUrl: draft.externalListenUrl,
      youtubeUrl: draft.externalListenUrl,
    })
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
            Line {previewIndex + 1} of {validDrafts.length}
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
        vibeOptions={onVibeSelect ? MOMENT_VIBE_PICKER_OPTIONS : []}
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

export function ComposeReadyPreview({
  drafts,
  vibeLabel,
  suggestedVibeLabel,
  emotionLoading = false,
  onVibeSelect,
  inReplyTo,
}: Props) {
  const parentDrafts = inReplyTo ? validDraftsOf(inReplyTo.drafts) : []
  const showConversation = parentDrafts.length > 0

  return (
    <div>
      {showConversation ? (
        <div>
          {inReplyTo?.byline ? (
            <div style={{ marginBottom: '10px' }}>{inReplyTo.byline}</div>
          ) : null}
          <ReadyStageCard
            drafts={parentDrafts}
            vibeLabel={inReplyTo?.vibeLabel ?? null}
          />
          <div
            aria-hidden
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '16px 0',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{
              fontFamily: UI_FONT,
              fontSize: '0.56rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}>Lyric Back</span>
            <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
        </div>
      ) : null}
      <ReadyStageCard
        drafts={drafts}
        vibeLabel={vibeLabel}
        suggestedVibeLabel={suggestedVibeLabel}
        emotionLoading={emotionLoading}
        onVibeSelect={onVibeSelect}
      />
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  flexShrink: 0,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
