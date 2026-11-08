'use client'

import type { ReactNode } from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { MomentPreviewSlot } from '@/components/moment/moment-preview-slot'
import { StageSendBar } from '@/components/stage/stage-send-bar'
import { MomentCalmToolbar, type MomentCalmToolbarProps } from '@/components/moment/moment-calm-toolbar'
import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import type { CalmEffectId } from '@/lib/landing-calm-composer'
import { calmUsesArtworkBackdrop } from '@/lib/landing-calm-composer'

export interface MomentStudioScreenProps {
  songRow: ReactNode
  /** Banner, multi-line summary, etc. — above lyric box */
  beforeLyric?: ReactNode
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
  onSave?: () => void
  saving?: boolean
  shareBusy?: boolean
  videoProgress?: string | null
  signedIn?: boolean
  onPost?: () => void
  posting?: boolean
  postLabel?: string
  actionsBlocked?: boolean
  /** Extra bottom padding on mobile (tab bar clearance). */
  mobileBottomPad?: string
  layout?: 'studio' | 'calm'
  calmEffectId?: CalmEffectId
  onCalmEffectChange?: (id: CalmEffectId) => void
  calmToolbar?: Omit<
    MomentCalmToolbarProps,
    'cardThemeId' | 'onThemeChange' | 'calmEffectId' | 'onCalmEffectChange' | 'shapeId'
  >
  sourceCaption?: string | null
}

export function MomentStudioScreen({
  songRow,
  beforeLyric,
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
  onSave,
  saving = false,
  shareBusy = false,
  videoProgress = null,
  signedIn = false,
  onPost,
  posting = false,
  postLabel = 'Post',
  actionsBlocked = false,
  mobileBottomPad = 'calc(var(--margo-tabbar-h, 80px) + 20px)',
  layout = 'studio',
  calmEffectId = 'none',
  onCalmEffectChange,
  calmToolbar,
  sourceCaption = null,
}: MomentStudioScreenProps) {
  const showCard = previewLyric.trim().length > 0 && previewSongTitle.trim().length > 0
  const calm = layout === 'calm'
  const artworkBackdrop = calm && calmUsesArtworkBackdrop(calmEffectId)
  const effectOwnsFill = calm
    ? calmEffectId === 'glow' || calmEffectId === 'grain'
    : true
  const bottomPad = calm
    ? 'calc(var(--margo-page-bottom, var(--margo-tabbar-h, 80px)) + var(--margo-safe-bottom, 0px) + 20px)'
    : mobileBottomPad

  return (
    <div
      className={calm ? 'margo-moment-studio margo-moment-studio--calm' : 'margo-moment-studio'}
      style={{
        width: '100%',
        paddingBottom: bottomPad,
        boxSizing: 'border-box',
      }}
    >
      <div className="margo-moment-studio__inputs">
        {songRow}
        {beforeLyric}
        <div className={calm ? 'margo-moment-studio__lyric-box margo-moment-studio__lyric-box--calm' : 'margo-moment-studio__lyric-box'}>
          <textarea
            value={lyric}
            onChange={(e) => onLyricChange(e.target.value.slice(0, lyricMaxLength))}
            readOnly={lyricReadOnly}
            maxLength={lyricMaxLength}
            rows={3}
            aria-label="Your line"
            style={{
              width: '100%',
              minHeight: '72px',
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {!calm ? (
            <span className="margo-moment-studio__lyric-count">
              {lyric.length}/{lyricMaxLength}
            </span>
          ) : null}
        </div>
        {calm ? (
          <p className="margo-moment-studio__lyric-count margo-moment-studio__lyric-count--calm" aria-live="polite">
            {lyric.length} / {lyricMaxLength}
          </p>
        ) : null}
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
              effectOwnsFill={effectOwnsFill}
              artworkBackdrop={artworkBackdrop}
              sourceCaption={sourceCaption}
              canPlay={canPlay && !calm}
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

      {calm ? null : (
      <div className="margo-moment-studio__customize-wrap">
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
      </div>
      )}

      {calm && calmToolbar && onCalmEffectChange ? (
        <div className="margo-moment-studio__calm-toolbar">
          <MomentCalmToolbar
            cardThemeId={cardThemeId}
            onThemeChange={onThemeChange}
            calmEffectId={calmEffectId}
            onCalmEffectChange={onCalmEffectChange}
            shapeId={shapeId}
            {...calmToolbar}
          />
        </div>
      ) : null}

      {!calm ? (
      <div
        className="margo-moment-studio__actions"
        style={{
          opacity: actionsBlocked ? 0.45 : 1,
          pointerEvents: actionsBlocked ? 'none' : 'auto',
        }}
      >
        <StageSendBar
          onSave={onSave}
          saveItems={exportItems}
          shareItems={shareItems}
          saving={saving}
          shareBusy={shareBusy}
          videoProgress={videoProgress}
          signedIn={signedIn}
          onSendToMargo={onPost}
          sending={posting}
          postLabel={postLabel}
          menuPlacement="down"
          compact
          studio
        />
      </div>
      ) : null}
    </div>
  )
}
