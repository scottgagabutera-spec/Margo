'use client'

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import {
  CALM_COLOR_OPTIONS,
  CALM_EFFECT_OPTIONS,
  type CalmEffectId,
} from '@/lib/landing-calm-composer'
import { MomentCalmSheet } from '@/components/moment/moment-calm-sheet'
import { ChevronUpIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import { SignInLink } from '@/components/signin-link'

type SheetId = 'color' | 'effect' | 'download' | 'share' | null

type ToolbarIconProps = {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}

function CalmToolIcon({ label, pressed, onClick, children }: ToolbarIconProps) {
  return (
    <button
      type="button"
      className="margo-calm-tool"
      aria-label={label}
      aria-pressed={pressed || undefined}
      onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function IconPalette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3a9 9 0 0 0-7.4 14.5 2.5 2.5 0 0 0 4.3 1.2l.6-.8a1 1 0 0 1 1.6 1.2l-.7.9a4.5 4.5 0 0 1-7.1-2.4A11 11 0 1 1 12 3Zm-4.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8.5 15.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
      />
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="m9.5 2.5 1.2 3.6L14 7l-3.3 1.2L9.5 12 8.3 8.4 5 7.2l3.3-1.2L9.5 2.5ZM17 9l.9 2.7 2.6.9-2.6.9L17 16.2l-.9-2.7-2.6-.9 2.6-.9L17 9Zm-6 7.5.8 2.4 2.3.8-2.3.8-.8 2.4-.8-2.4-2.3-.8 2.3-.8.8-2.4Z"
      />
    </svg>
  )
}

function IconFormat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v9.6l2.9-3a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 1 1 1.4-1.4l2.9 3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3H4v-3a1 1 0 0 1 1-1Z"
      />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M8.5 14.5a3.5 3.5 0 0 1 .3-1.4L15 8.1a3.5 3.5 0 1 0 .9-3.1l-6.7 5.2A3.5 3.5 0 1 1 8.5 14.5ZM16 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-9 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm9 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
      />
    </svg>
  )
}

export type MomentCalmToolbarProps = {
  cardThemeId: StageCardThemeId
  onThemeChange: (id: StageCardThemeId) => void
  calmEffectId: CalmEffectId
  onCalmEffectChange: (id: CalmEffectId) => void
  shapeId: MomentShapeId
  onShapeToggle: () => void
  onSaveSquare: () => void
  onSaveStory: () => void
  onCopyImage: () => void
  onShareStory: () => void
  onShareWhatsApp: () => void
  onShareMore: () => void
  onCopyLink: () => void
  saving?: boolean
  shareBusy?: boolean
  signedIn?: boolean
  onPost?: () => void
  posting?: boolean
  signInReturnTo?: string
  onBeforeSignIn?: () => void
}

export function MomentCalmToolbar({
  cardThemeId,
  onThemeChange,
  calmEffectId,
  onCalmEffectChange,
  shapeId,
  onShapeToggle,
  onSaveSquare,
  onSaveStory,
  onCopyImage,
  onShareStory,
  onShareWhatsApp,
  onShareMore,
  onCopyLink,
  saving = false,
  shareBusy = false,
  signedIn = false,
  onPost,
  posting = false,
  signInReturnTo = '/',
  onBeforeSignIn,
}: MomentCalmToolbarProps) {
  const [sheet, setSheet] = useState<SheetId>(null)
  const closeSheet = useCallback(() => setSheet(null), [])
  const openSheet = useCallback((id: SheetId) => setSheet(id), [])
  const busy = saving || shareBusy

  const sheetBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      className="margo-calm-sheet__option"
      style={{ fontFamily: UI_FONT }}
      disabled={disabled || busy}
      onClick={() => {
        onClick()
        closeSheet()
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="margo-calm-toolbar-wrap">
        <div className="margo-calm-toolbar">
          <CalmToolIcon label="Color" pressed={sheet === 'color'} onClick={() => openSheet(sheet === 'color' ? null : 'color')}>
            <IconPalette />
          </CalmToolIcon>
          <CalmToolIcon label="Effect" pressed={sheet === 'effect'} onClick={() => openSheet(sheet === 'effect' ? null : 'effect')}>
            <IconSparkles />
          </CalmToolIcon>
          <CalmToolIcon
            label={shapeId === 'vertical' ? 'Story shape' : 'Square shape'}
            onClick={onShapeToggle}
          >
            <IconFormat />
          </CalmToolIcon>
          <CalmToolIcon label="Download" pressed={sheet === 'download'} onClick={() => openSheet(sheet === 'download' ? null : 'download')}>
            <IconDownload />
          </CalmToolIcon>
          <CalmToolIcon label="Share" pressed={sheet === 'share'} onClick={() => openSheet(sheet === 'share' ? null : 'share')}>
            <IconShare />
          </CalmToolIcon>
          <div className="margo-calm-toolbar__spacer" aria-hidden />
          {signedIn ? (
            <button
              type="button"
              className="margo-calm-post"
              aria-label="Post this line"
              disabled={busy || posting}
              aria-busy={posting || undefined}
              onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
              onClick={onPost}
            >
              <ChevronUpIcon size={18} color="var(--bg)" />
            </button>
          ) : (
            <SignInLink
              returnTo={signInReturnTo}
              onClick={onBeforeSignIn}
              className="margo-calm-post"
              aria-label="Sign in to post"
            >
              <ChevronUpIcon size={18} color="var(--bg)" />
            </SignInLink>
          )}
        </div>
      </div>

      <MomentCalmSheet open={sheet === 'color'} title="Color" onClose={closeSheet}>
        <div className="margo-calm-color-dots" role="listbox" aria-label="Card color">
          {CALM_COLOR_OPTIONS.map((opt) => {
            const on = cardThemeId === opt.themeId
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={opt.label}
                className="margo-calm-color-dot"
                style={{ background: opt.swatch }}
                onClick={() => {
                  onThemeChange(opt.themeId)
                  closeSheet()
                }}
              />
            )
          })}
        </div>
      </MomentCalmSheet>

      <MomentCalmSheet open={sheet === 'effect'} title="Effect" onClose={closeSheet}>
        <div>
          {CALM_EFFECT_OPTIONS.map((opt) => {
            const on = calmEffectId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className="margo-calm-sheet__option"
                style={{ fontFamily: UI_FONT }}
                aria-pressed={on}
                onClick={() => {
                  onCalmEffectChange(opt.id)
                  closeSheet()
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </MomentCalmSheet>

      <MomentCalmSheet open={sheet === 'download'} title="Download" onClose={closeSheet}>
        {sheetBtn('Save image', onSaveSquare)}
        {sheetBtn('Save for story', onSaveStory)}
        {sheetBtn('Copy image', onCopyImage)}
      </MomentCalmSheet>

      <MomentCalmSheet open={sheet === 'share'} title="Share" onClose={closeSheet}>
        {sheetBtn('Share to story', onShareStory)}
        {sheetBtn('Copy link', onCopyLink)}
        {sheetBtn('WhatsApp', onShareWhatsApp)}
        {sheetBtn('More apps', onShareMore)}
      </MomentCalmSheet>
    </>
  )
}
