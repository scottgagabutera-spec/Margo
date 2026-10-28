'use client'

import type { ReactNode } from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { MomentPreviewSlot } from '@/components/moment/moment-preview-slot'
import { StageSendBar } from '@/components/stage/stage-send-bar'
import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import { UI_FONT } from '@/lib/fonts'

const lyricFont = 'var(--font-lora), serif'

export interface MomentStudioScreenProps {
  songRow: ReactNode
  lyric: string
  onLyricChange: (value: string) => void
  lyricMaxLength?: number
  lyricReadOnly?: boolean
  cardThemeId: StageCardThemeId
  onThemeChange: (id: StageCardThemeId) => void
  exportAtmosphereId: AtmosphereId
  onExportAtmosphereChange: React.Dispatch<React.SetStateAction<AtmosphereId>>
  shapeId: MomentShapeId
  onShapeChange: (id: MomentShapeId) => void
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  vibeOptions: string[]
  onVibeSelect: (label: string) => void
  previewLyric: string
  previewSongTitle: string
  previewArtistName: string
  previewArtwork: string | null
  canPlay: boolean
  playing: boolean
  buffering: boolean
  onPlay: () => void
  listenUrl: string | null
  exportItems: MomentActionMenuItem[]
  shareItems: MomentActionMenuItem[]
  saving?: boolean
  shareBusy?: boolean
  videoProgress?: string | null
  signedIn?: boolean
  onPost?: () => void
  posting?: boolean
  postLabel?: string
  /** Extra bottom padding on mobile (tab bar clearance). */
  mobileBottomPad?: string
}

export function MomentStudioScreen({
  songRow,
  lyric,
  onLyricChange,
  lyricMaxLength = 140,
  lyricReadOnly = false,
  cardThemeId,
  onThemeChange,
  exportAtmosphereId,
  onExportAtmosphereChange,
  shapeId,
  onShapeChange,
  vibeLabel,
  suggestedVibeLabel,
  vibeOptions,
  onVibeSelect,
  previewLyric,
  previewSongTitle,
  previewArtistName,
  previewArtwork,
  canPlay,
  playing,
  buffering,
  onPlay,
  listenUrl,
  exportItems,
  shareItems,
  saving = false,
  shareBusy = false,
  videoProgress = null,
  signedIn = false,
  onPost,
  posting = false,
  postLabel = 'Post',
  mobileBottomPad = 'calc(var(--margo-tabbar-h, 80px) + 20px)',
}: MomentStudioScreenProps) {
  const showCard = previewLyric.trim().length > 0 && previewSongTitle.trim().length > 0

  return (
    <div
      className="margo-moment-studio"
      style={{
        width: '100%',
        paddingBottom: mobileBottomPad,
        boxSizing: 'border-box',
      }}
    >
      <div className="margo-moment-studio__inputs">
          {songRow}
          <div className="margo-moment-studio__lyric-box">
            <textarea
              value={lyric}
              onChange={(e) => onLyricChange(e.target.value.slice(0, lyricMaxLength))}
              readOnly={lyricReadOnly}
              maxLength={lyricMaxLength}
              rows={3}
              aria-label="Your line"
              style={{
                width: '100%',
                minHeight: '88px',
                padding: 0,
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontFamily: lyricFont,
                fontSize: '1.05rem',
                lineHeight: 1.45,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span className="margo-moment-studio__lyric-count">
              {lyric.length}/{lyricMaxLength}
            </span>
          </div>
      </div>

      <div className="margo-moment-studio__preview-col">
        <MomentPreviewSlot shapeId={shapeId} showDesktopLabel>
          {showCard ? (
            <StageMomentCard
              lyric={previewLyric}
              songTitle={previewSongTitle}
              artistName={previewArtistName}
              artwork={previewArtwork}
              vibeLabel={vibeLabel}
              cardThemeId={cardThemeId}
              atmosphereId={exportAtmosphereId}
              shapeId={shapeId}
              hideVibeChrome
              effectOwnsFill
              canPlay={canPlay}
              playing={playing}
              buffering={buffering}
              onPlay={onPlay}
              listenUrl={listenUrl}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--surface-2)',
                borderRadius: 'inherit',
              }}
            />
          )}
        </MomentPreviewSlot>
      </div>

      <div className="margo-moment-studio__toolbar">
        <MomentExportCustomizeBar
          layout="studio"
          cardThemeId={cardThemeId}
          onThemeChange={onThemeChange}
          exportAtmosphereId={exportAtmosphereId}
          onExportAtmosphereChange={onExportAtmosphereChange}
          shapeId={shapeId}
          onShapeChange={onShapeChange}
          vibeLabel={vibeLabel}
          suggestedVibeLabel={suggestedVibeLabel}
          vibeOptions={vibeOptions}
          onVibeSelect={onVibeSelect}
        />
        <StageSendBar
          saveItems={exportItems}
          shareItems={shareItems}
          saving={saving}
          shareBusy={shareBusy}
          videoProgress={videoProgress}
          signedIn={signedIn}
          onSendToMargo={onPost}
          sending={posting}
          postLabel={postLabel}
          menuPlacement="up"
          compact
        />
      </div>
    </div>
  )
}
