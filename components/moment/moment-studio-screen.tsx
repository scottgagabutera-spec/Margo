'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentExportCustomizeBar } from '@/components/moment-export-customize-bar'
import { StageSendBar } from '@/components/stage/stage-send-bar'
import { MomentPreviewSlot } from '@/components/moment/moment-preview-slot'
import { MomentCalmToolbar, type MomentCalmToolbarProps } from '@/components/moment/moment-calm-toolbar'
import { LandingComposerBack } from '@/components/landing/landing-composer-back'
import { LandingComposerPreviewFrame } from '@/components/landing/landing-composer-preview-frame'
import type { MomentActionMenuItem } from '@/components/moment-action-menu'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'

export interface MomentStudioScreenProps {
  songRow: ReactNode
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
  mobileBottomPad?: string
  layout?: 'studio' | 'calm'
  calmToolbar?: Omit<
    MomentCalmToolbarProps,
    | 'cardThemeId'
    | 'onThemeChange'
    | 'exportAtmosphereId'
    | 'onExportAtmosphereChange'
    | 'shapeId'
    | 'onShapeChange'
    | 'hasLyric'
  >
  sourceCaption?: string | null
  onBack?: () => void
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
  calmToolbar,
  sourceCaption = null,
  onBack,
}: MomentStudioScreenProps) {
  const calm = layout === 'calm'
  const hasLyric = previewLyric.trim().length > 0
  const showCard = calm
    ? hasLyric && previewSongTitle.trim().length > 0
    : previewLyric.trim().length > 0 && previewSongTitle.trim().length > 0
  const effectOwnsFill = true
  const bottomPad = calm
    ? 'calc(48px + var(--margo-safe-bottom, 0px) + var(--margo-page-bottom, var(--margo-tabbar-h, 80px)))'
    : mobileBottomPad

  const lyricRef = useRef<HTMLTextAreaElement>(null)
  const [lyricFocused, setLyricFocused] = useState(false)

  useEffect(() => {
    const el = lyricRef.current
    if (!el || !calm) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [lyric, calm])

  const previewCard = showCard ? (
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
      artworkBackdrop={false}
      sourceCaption={sourceCaption}
      canPlay={canPlay && !calm}
      playing={playing}
      buffering={buffering}
      onPlay={onPlay}
      listenUrl={listenUrl}
    />
  ) : null

  return (
    <div
      className={calm ? 'margo-moment-studio margo-moment-studio--calm' : 'margo-moment-studio'}
      style={{
        width: '100%',
        paddingBottom: bottomPad,
        boxSizing: 'border-box',
      }}
    >
      {calm ? (
        <div className="margo-landing-composer__left">
          {onBack ? <LandingComposerBack onBack={onBack} /> : null}
          <div className="margo-moment-studio__inputs">
            {songRow}
            {beforeLyric}
            <div
              className={`margo-moment-studio__lyric-box margo-moment-studio__lyric-box--calm${lyricFocused ? ' margo-moment-studio__lyric-box--focus' : ''}${!lyric.trim() ? ' margo-moment-studio__lyric-box--empty' : ''}`}
            >
              <textarea
                ref={lyricRef}
                value={lyric}
                onChange={(e) => onLyricChange(e.target.value.slice(0, lyricMaxLength))}
                readOnly={lyricReadOnly}
                maxLength={lyricMaxLength}
                rows={1}
                placeholder="Your line"
                aria-label="Your line"
                onFocus={() => setLyricFocused(true)}
                onBlur={() => setLyricFocused(false)}
              />
            </div>
            <p className="margo-moment-studio__lyric-count margo-moment-studio__lyric-count--calm" aria-live="polite">
              {lyric.length} / {lyricMaxLength}
            </p>
          </div>
          {calmToolbar ? (
            <div className="margo-moment-studio__calm-toolbar">
              <MomentCalmToolbar
                cardThemeId={cardThemeId}
                onThemeChange={onThemeChange}
                exportAtmosphereId={exportAtmosphereId}
                onExportAtmosphereChange={onExportAtmosphereChange}
                shapeId={shapeId}
                onShapeChange={onShapeChange}
                hasLyric={hasLyric}
                signedIn={signedIn}
                onPost={onPost}
                posting={posting}
                {...calmToolbar}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="margo-moment-studio__inputs">
          {songRow}
          {beforeLyric}
          <div className="margo-moment-studio__lyric-box">
            <textarea
              ref={lyricRef}
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
            <span className="margo-moment-studio__lyric-count">
              {lyric.length}/{lyricMaxLength}
            </span>
          </div>
        </div>
      )}

      <div className="margo-moment-studio__preview-col">
        {calm ? (
          <LandingComposerPreviewFrame shapeId={shapeId} empty={!showCard}>
            {previewCard}
          </LandingComposerPreviewFrame>
        ) : (
          <MomentPreviewSlot shapeId={shapeId} showDesktopLabel>
            {showCard ? (
              previewCard
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
        )}
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
