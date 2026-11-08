'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Check,
  Copy,
  Download,
  Image,
  Loader2,
  Palette,
  RectangleVertical,
  Share2,
  Sparkles,
  Square,
} from 'lucide-react'
import type { AtmosphereId } from '@/lib/atmosphere'
import { ATMOSPHERE_OPTIONS } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import { STAGE_CARD_THEMES, type StageCardThemeId } from '@/lib/moment/stage-theme'
import { LandingComposerPopover } from '@/components/landing/landing-composer-popover'
import { LandingComposerToast } from '@/components/landing/landing-composer-toast'
import { landingComposerTier, type LandingComposerTier } from '@/lib/landing-composer-layout'
import { UI_FONT } from '@/lib/fonts'

type PopoverId = 'color' | 'effect' | 'format' | 'share' | null
type DownloadPhase = 'idle' | 'loading' | 'done'

function useLandingTier(): LandingComposerTier {
  const [tier, setTier] = useState<LandingComposerTier>('phone')
  useEffect(() => {
    const read = () => setTier(landingComposerTier(window.innerWidth))
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])
  return tier
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="margo-landing-tool-wrap">
      <button
        type="button"
        className="margo-landing-tool"
        aria-label={label}
        aria-pressed={pressed || undefined}
        onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
        onClick={onClick}
      >
        {children}
      </button>
      <span className="margo-landing-tool__label" style={{ fontFamily: UI_FONT }}>
        {label}
      </span>
    </div>
  )
}

export type MomentCalmToolbarProps = {
  cardThemeId: StageCardThemeId
  onThemeChange: (id: StageCardThemeId) => void
  exportAtmosphereId: AtmosphereId
  onExportAtmosphereChange: React.Dispatch<React.SetStateAction<AtmosphereId>>
  shapeId: MomentShapeId
  onShapeChange: (id: MomentShapeId) => void
  onDownload: () => Promise<void>
  onSaveImage: () => Promise<void>
  onShareNative: () => Promise<'shared' | 'download' | 'failed'>
  onCopyLink: () => void
  hasLyric: boolean
  signedIn?: boolean
  onPost?: () => void
  posting?: boolean
  onSignInPrompt?: () => void
}

export function MomentCalmToolbar({
  cardThemeId,
  onThemeChange,
  exportAtmosphereId,
  onExportAtmosphereChange,
  shapeId,
  onShapeChange,
  onDownload,
  onSaveImage,
  onShareNative,
  onCopyLink,
  hasLyric,
  signedIn = false,
  onPost,
  posting = false,
  onSignInPrompt,
}: MomentCalmToolbarProps) {
  const tier = useLandingTier()
  const [popover, setPopover] = useState<PopoverId>(null)
  const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const downloadLock = useRef(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const colorMode = exportAtmosphereId === 'still'
  const effectMode = !colorMode

  const closePopover = useCallback(() => setPopover(null), [])
  const togglePopover = useCallback((id: PopoverId) => {
    setPopover((p) => (p === id ? null : id))
  }, [])

  const showToast = useCallback((message: string, ms = 2000) => {
    setToast(message)
    window.setTimeout(() => setToast(null), ms)
  }, [])

  const runDownload = useCallback(async () => {
    if (downloadLock.current || downloadPhase === 'loading') return
    if (!hasLyric) {
      showToast('Add a line first')
      return
    }
    downloadLock.current = true
    setDownloadPhase('loading')
    try {
      await onDownload()
      setDownloadPhase('done')
      showToast('Saved')
      window.setTimeout(() => setDownloadPhase('idle'), 1300)
    } catch {
      setDownloadPhase('idle')
    } finally {
      downloadLock.current = false
    }
  }, [downloadPhase, hasLyric, onDownload, showToast])

  const formatIcon =
    shapeId === 'vertical' ? (
      <RectangleVertical size={18} strokeWidth={1.75} aria-hidden />
    ) : (
      <Square size={18} strokeWidth={1.75} aria-hidden />
    )

  const downloadIcon =
    downloadPhase === 'loading' ? (
      <Loader2 size={18} strokeWidth={2} className="margo-landing-spin" aria-hidden />
    ) : downloadPhase === 'done' ? (
      <Check size={18} strokeWidth={2} color="var(--gold)" aria-hidden />
    ) : (
      <Download size={18} strokeWidth={1.75} aria-hidden />
    )

  return (
    <div className="margo-landing-toolbar-host" ref={toolbarRef}>
      <div className="margo-landing-toolbar">
        <ToolButton
          label="Color"
          pressed={popover === 'color' || colorMode}
          onClick={() => togglePopover('color')}
        >
          <Palette size={18} strokeWidth={1.75} aria-hidden />
        </ToolButton>
        <ToolButton
          label="Effect"
          pressed={popover === 'effect' || effectMode}
          onClick={() => togglePopover('effect')}
        >
          <Sparkles size={18} strokeWidth={1.75} aria-hidden />
        </ToolButton>
        <ToolButton
          label="Format"
          pressed={popover === 'format'}
          onClick={() => togglePopover('format')}
        >
          {formatIcon}
        </ToolButton>
        <ToolButton label="Download" onClick={() => void runDownload()}>
          {downloadIcon}
        </ToolButton>
        <ToolButton
          label="Share"
          pressed={popover === 'share'}
          onClick={() => togglePopover('share')}
        >
          <Share2 size={18} strokeWidth={1.75} aria-hidden />
        </ToolButton>
        <div className="margo-landing-toolbar__spacer" aria-hidden />
        <button
          type="button"
          className="margo-landing-post"
          aria-label="Post this line"
          disabled={posting || (!hasLyric && signedIn)}
          aria-busy={posting || undefined}
          style={{ opacity: hasLyric ? 1 : 0.4 }}
          onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
          onClick={() => {
            if (!hasLyric) return
            if (signedIn && onPost) {
              onPost()
              return
            }
            onSignInPrompt?.()
            showToast('Sign in to post')
          }}
        >
          <ArrowUp size={18} strokeWidth={2} color="var(--bg)" aria-hidden />
        </button>
      </div>

      <LandingComposerPopover open={popover === 'color'} align="left" onClose={closePopover}>
        <div className="margo-landing-popover-colors" role="listbox" aria-label="Card color">
          {STAGE_CARD_THEMES.map((opt) => {
            const on = colorMode && cardThemeId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={opt.label}
                className="margo-landing-popover-colors__dot"
                style={{ background: opt.swatch }}
                onClick={() => {
                  onThemeChange(opt.id)
                  onExportAtmosphereChange('still')
                  closePopover()
                }}
              />
            )
          })}
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'effect'} align="left" onClose={closePopover}>
        <div className="margo-landing-popover-list">
          {ATMOSPHERE_OPTIONS.map((opt) => {
            const on = exportAtmosphereId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className="margo-landing-popover-list__row"
                style={{ fontFamily: UI_FONT }}
                aria-pressed={on}
                onClick={() => {
                  onExportAtmosphereChange(opt.id)
                  closePopover()
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'format'} align="format" onClose={closePopover}>
        <div className="margo-landing-format-pick">
          <button
            type="button"
            className={`margo-landing-format-pick__opt${shapeId === 'square' ? ' margo-landing-format-pick__opt--on' : ''}`}
            onClick={() => {
              onShapeChange('square')
              closePopover()
            }}
          >
            <span className="margo-landing-format-pick__glyph margo-landing-format-pick__glyph--square" aria-hidden />
            <span className="margo-landing-format-pick__title" style={{ fontFamily: UI_FONT }}>
              Square
            </span>
            <span className="margo-landing-format-pick__ratio" style={{ fontFamily: UI_FONT }}>
              1:1
            </span>
          </button>
          <button
            type="button"
            className={`margo-landing-format-pick__opt${shapeId === 'vertical' ? ' margo-landing-format-pick__opt--on' : ''}`}
            onClick={() => {
              onShapeChange('vertical')
              closePopover()
            }}
          >
            <span className="margo-landing-format-pick__glyph margo-landing-format-pick__glyph--story" aria-hidden />
            <span className="margo-landing-format-pick__title" style={{ fontFamily: UI_FONT }}>
              Story
            </span>
            <span className="margo-landing-format-pick__ratio" style={{ fontFamily: UI_FONT }}>
              9:16
            </span>
          </button>
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'share'} align="right" onClose={closePopover}>
        <div className="margo-landing-share-pick">
          <button
            type="button"
            className="margo-landing-share-pick__row"
            style={{ fontFamily: UI_FONT }}
            onClick={() => {
              onCopyLink()
              showToast('Link copied')
              closePopover()
            }}
          >
            <span className="margo-landing-share-pick__icon" aria-hidden>
              <Copy size={16} strokeWidth={1.75} />
            </span>
            Copy link
          </button>
          <button
            type="button"
            className="margo-landing-share-pick__row"
            style={{ fontFamily: UI_FONT }}
            onClick={() => {
              closePopover()
              void runDownload()
            }}
          >
            <span className="margo-landing-share-pick__icon" aria-hidden>
              <Image size={16} strokeWidth={1.75} />
            </span>
            Save image
          </button>
          <button
            type="button"
            className="margo-landing-share-pick__row"
            style={{ fontFamily: UI_FONT }}
            onClick={() => {
              closePopover()
              if (!hasLyric) {
                showToast('Add a line first')
                return
              }
              void (async () => {
                const r = await onShareNative()
                if (r === 'shared') showToast('Saved')
                else if (r === 'download') showToast('Opening share')
              })()
            }}
          >
            <span className="margo-landing-share-pick__icon" aria-hidden>
              <Share2 size={16} strokeWidth={1.75} />
            </span>
            Share to apps
          </button>
        </div>
      </LandingComposerPopover>

      {toast ? <LandingComposerToast message={toast} tier={tier} /> : null}
    </div>
  )
}
