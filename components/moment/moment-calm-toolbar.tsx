'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AudioLines,
  Check,
  CircleSlash,
  Copy,
  Droplets,
  Image as ImageIcon,
  Loader2,
  Sunrise,
  Video,
  Waves,
} from 'lucide-react'
import {
  ComposerColorIcon,
  ComposerDownloadIcon,
  ComposerEffectIcon,
  ComposerFormatSquareIcon,
  ComposerFormatStoryIcon,
  ComposerPostArrowIcon,
  ComposerShareIcon,
  ComposerStoryIcon,
  ComposerVibeIcon,
} from '@/components/moment/composer-toolbar-icons'
import type { AtmosphereId } from '@/lib/atmosphere'
import { ATMOSPHERE_OPTIONS } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import { STAGE_CARD_THEMES, type StageCardThemeId } from '@/lib/moment/stage-theme'
import { LandingComposerPopover } from '@/components/landing/landing-composer-popover'
import { LandingComposerToast } from '@/components/landing/landing-composer-toast'
import { landingComposerTier, type LandingComposerTier } from '@/lib/landing-composer-layout'
import { UI_FONT } from '@/lib/fonts'

type PopoverId = 'vibe' | 'color' | 'effect' | 'format' | 'download' | 'share' | null
type DownloadPhase = 'idle' | 'loading' | 'done'

const EFFECT_ROW_ICONS: Record<AtmosphereId, typeof CircleSlash> = {
  still: CircleSlash,
  breath: Sunrise,
  drift: Waves,
  pulse: AudioLines,
  weight: Droplets,
}

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
  showDetectedDot,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
  showDetectedDot?: boolean
}) {
  return (
    <div className="margo-landing-tool-wrap">
      <button
        type="button"
        className={`margo-landing-tool${showDetectedDot ? ' margo-landing-tool--detected' : ''}`}
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
  vibeLabel: string | null
  suggestedVibeLabel?: string | null
  vibeOptions: string[]
  onVibeSelect: (label: string) => void
  vibeUserPicked?: boolean
  onDownloadImage: () => Promise<void>
  onDownloadVideo?: () => Promise<void>
  onDownloadSavePrivate?: () => void | Promise<void>
  downloadUsePopover?: boolean
  videoExportEnabled?: boolean
  exportBusy?: boolean
  videoProgress?: string | null
  onShareNative: () => Promise<'shared' | 'download' | 'failed'>
  onCopyLink: () => void
  hasLyric: boolean
  signedIn?: boolean
  onPost?: () => void
  posting?: boolean
  onSignInPrompt?: () => void
  videoSilentLabel?: boolean
  endAction?: 'post' | 'story' | 'none'
  onStory?: () => void
  shareContext?: 'landing' | 'card'
  onCardShareImage?: () => void
  onCardShareSend?: () => void
  onCardShareStory?: () => void
}

export function MomentCalmToolbar({
  cardThemeId,
  onThemeChange,
  exportAtmosphereId,
  onExportAtmosphereChange,
  shapeId,
  onShapeChange,
  vibeLabel,
  suggestedVibeLabel = null,
  vibeOptions,
  onVibeSelect,
  vibeUserPicked = false,
  onDownloadImage,
  onDownloadVideo,
  onDownloadSavePrivate,
  downloadUsePopover = true,
  videoExportEnabled = false,
  exportBusy = false,
  videoProgress = null,
  onShareNative,
  onCopyLink,
  hasLyric,
  signedIn = false,
  onPost,
  posting = false,
  onSignInPrompt,
  videoSilentLabel = false,
  endAction = 'post',
  onStory,
  shareContext = 'landing',
  onCardShareImage,
  onCardShareSend,
  onCardShareStory,
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

  const runDownloadImage = useCallback(async () => {
    if (downloadLock.current || downloadPhase === 'loading' || exportBusy) return
    if (!hasLyric) {
      showToast('Add a line first')
      return
    }
    downloadLock.current = true
    setDownloadPhase('loading')
    try {
      await onDownloadImage()
      setDownloadPhase('done')
      showToast('Saved')
      window.setTimeout(() => setDownloadPhase('idle'), 1300)
    } catch {
      setDownloadPhase('idle')
    } finally {
      downloadLock.current = false
    }
  }, [downloadPhase, exportBusy, hasLyric, onDownloadImage, showToast])

  const runDownloadVideo = useCallback(async () => {
    if (!onDownloadVideo || exportBusy) return
    if (!hasLyric) {
      showToast('Add a line first')
      return
    }
    closePopover()
    try {
      await onDownloadVideo()
    } catch {
      /* progress + toasts owned by export hook */
    }
  }, [closePopover, exportBusy, hasLyric, onDownloadVideo, showToast])

  const handleDownloadToolClick = useCallback(() => {
    if (!hasLyric) {
      showToast('Add a line first')
      return
    }
    if (downloadUsePopover) {
      togglePopover('download')
      return
    }
    void runDownloadImage()
  }, [downloadUsePopover, hasLyric, runDownloadImage, showToast, togglePopover])

  const formatIcon =
    shapeId === 'vertical' ? <ComposerFormatStoryIcon /> : <ComposerFormatSquareIcon />

  const downloadLoading = downloadPhase === 'loading' || exportBusy
  const downloadIcon =
    downloadLoading ? (
      <Loader2 size={18} strokeWidth={2} className="margo-landing-spin" aria-hidden />
    ) : downloadPhase === 'done' ? (
      <Check size={18} strokeWidth={2} color="var(--gold)" aria-hidden />
    ) : (
      <ComposerDownloadIcon />
    )

  const vibeBadge = vibeUserPicked ? 'Chosen' : suggestedVibeLabel ? 'Detected' : null
  const showVibeDot = !vibeUserPicked && !!suggestedVibeLabel

  return (
    <div className="margo-landing-toolbar-host" ref={toolbarRef}>
      <div className="margo-landing-toolbar">
        <ToolButton
          label="Vibe"
          pressed={popover === 'vibe'}
          showDetectedDot={showVibeDot}
          onClick={() => togglePopover('vibe')}
        >
          <ComposerVibeIcon />
        </ToolButton>
        <ToolButton
          label="Color"
          pressed={popover === 'color' || colorMode}
          onClick={() => togglePopover('color')}
        >
          <ComposerColorIcon />
        </ToolButton>
        <ToolButton
          label="Effect"
          pressed={popover === 'effect' || effectMode}
          onClick={() => togglePopover('effect')}
        >
          <ComposerEffectIcon active={effectMode} />
        </ToolButton>
        <ToolButton label="Format" pressed={popover === 'format'} onClick={() => togglePopover('format')}>
          {formatIcon}
        </ToolButton>
        <ToolButton
          label="Download"
          pressed={popover === 'download'}
          onClick={handleDownloadToolClick}
        >
          {downloadIcon}
        </ToolButton>
        <ToolButton label="Share" pressed={popover === 'share'} onClick={() => togglePopover('share')}>
          <ComposerShareIcon />
        </ToolButton>
        <div className="margo-landing-toolbar__spacer" aria-hidden />
        {endAction === 'story' ? (
          <button
            type="button"
            className="margo-landing-post"
            aria-label="Share as story"
            onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
            onClick={() => onStory?.()}
          >
            <ComposerStoryIcon />
          </button>
        ) : endAction === 'post' ? (
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
            <ComposerPostArrowIcon />
          </button>
        ) : null}
      </div>

      <LandingComposerPopover open={popover === 'vibe'} align="full" onClose={closePopover} className="margo-landing-popover--vibe">
        <div className="margo-landing-vibe-popover">
          <div className="margo-landing-vibe-popover__head">
            <span className="margo-landing-vibe-popover__title" style={{ fontFamily: UI_FONT }}>
              Vibe
            </span>
            {vibeBadge ? (
              <span className="margo-landing-vibe-popover__badge" style={{ fontFamily: UI_FONT }}>
                {vibeBadge}
              </span>
            ) : null}
          </div>
          <div className="margo-landing-vibe-popover__chips" role="listbox" aria-label="Vibe">
            {vibeOptions.map((opt) => {
              const on = opt === vibeLabel
              const detected = !vibeUserPicked && opt === suggestedVibeLabel
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`margo-landing-vibe-popover__chip${on || detected ? ' margo-landing-vibe-popover__chip--on' : ''}`}
                  style={{ fontFamily: UI_FONT }}
                  onClick={() => {
                    onVibeSelect(opt)
                    closePopover()
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'color'} align="left" onClose={closePopover}>
        <div className="margo-landing-popover-colors margo-landing-popover-colors--labeled" role="listbox" aria-label="Card color">
          {STAGE_CARD_THEMES.map((opt) => {
            const on = colorMode && cardThemeId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={opt.label}
                className="margo-landing-popover-colors__pick"
                onClick={() => {
                  onThemeChange(opt.id)
                  onExportAtmosphereChange('still')
                  closePopover()
                }}
              >
                <span className="margo-landing-popover-colors__dot" style={{ background: opt.swatch }} />
                <span className="margo-landing-popover-colors__name" style={{ fontFamily: UI_FONT }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'effect'} align="left" onClose={closePopover}>
        <div className="margo-landing-popover-list">
          {ATMOSPHERE_OPTIONS.map((opt) => {
            const on = exportAtmosphereId === opt.id
            const Icon = EFFECT_ROW_ICONS[opt.id]
            return (
              <button
                key={opt.id}
                type="button"
                className="margo-landing-popover-list__row margo-landing-popover-list__row--icon"
                style={{ fontFamily: UI_FONT }}
                aria-pressed={on}
                onClick={() => {
                  onExportAtmosphereChange(opt.id)
                  closePopover()
                }}
              >
                <span className="margo-landing-share-pick__icon" aria-hidden>
                  <Icon size={16} strokeWidth={1.5} />
                </span>
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

      <LandingComposerPopover open={popover === 'download'} align="right" onClose={closePopover}>
        <div className="margo-landing-download-pick">
          {videoExportEnabled && onDownloadVideo ? (
            <button
              type="button"
              className="margo-landing-download-pick__row margo-landing-download-pick__row--on"
              style={{ fontFamily: UI_FONT }}
              disabled={exportBusy}
              onClick={() => void runDownloadVideo()}
            >
              <span className="margo-landing-share-pick__icon" aria-hidden>
                <Video size={16} strokeWidth={1.5} />
              </span>
              <span className="margo-landing-download-pick__copy">
                <span className="margo-landing-download-pick__title">Video</span>
                <span className="margo-landing-download-pick__sub">
                  {videoSilentLabel ? 'MP4 silent' : 'MP4 with sound'}
                </span>
              </span>
              {videoProgress ? (
                <span className="margo-landing-download-pick__progress" style={{ fontFamily: UI_FONT }}>
                  {videoProgress}
                </span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            className={`margo-landing-download-pick__row${!videoExportEnabled ? ' margo-landing-download-pick__row--on' : ''}`}
            style={{ fontFamily: UI_FONT }}
            disabled={exportBusy}
            onClick={() => {
              closePopover()
              void runDownloadImage()
            }}
          >
            <span className="margo-landing-share-pick__icon" aria-hidden>
              <ImageIcon size={16} strokeWidth={1.5} />
            </span>
            <span className="margo-landing-download-pick__copy">
              <span className="margo-landing-download-pick__title">Image</span>
              <span className="margo-landing-download-pick__sub">PNG</span>
            </span>
          </button>
          {onDownloadSavePrivate ? (
            <button
              type="button"
              className="margo-landing-download-pick__row"
              style={{ fontFamily: UI_FONT }}
              disabled={exportBusy}
              onClick={() => {
                closePopover()
                void onDownloadSavePrivate()
              }}
            >
              <span className="margo-landing-download-pick__copy">
                <span className="margo-landing-download-pick__title">Save private</span>
                <span className="margo-landing-download-pick__sub">Profile only</span>
              </span>
            </button>
          ) : null}
        </div>
      </LandingComposerPopover>

      <LandingComposerPopover open={popover === 'share'} align="right" onClose={closePopover}>
        <div className="margo-landing-share-pick">
          {shareContext === 'card' ? (
            <>
              <button
                type="button"
                className="margo-landing-share-pick__row"
                style={{ fontFamily: UI_FONT }}
                onClick={() => {
                  closePopover()
                  onCardShareImage?.()
                }}
              >
                <span className="margo-landing-share-pick__icon" aria-hidden>
                  <ImageIcon size={16} strokeWidth={1.5} />
                </span>
                Share image
              </button>
              <button
                type="button"
                className="margo-landing-share-pick__row"
                style={{ fontFamily: UI_FONT }}
                onClick={() => {
                  closePopover()
                  onCardShareSend?.()
                }}
              >
                <span className="margo-landing-share-pick__icon" aria-hidden>
                  <ComposerShareIcon size={16} />
                </span>
                Send
              </button>
              <button
                type="button"
                className="margo-landing-share-pick__row"
                style={{ fontFamily: UI_FONT }}
                onClick={() => {
                  closePopover()
                  onCardShareStory?.()
                }}
              >
                <span className="margo-landing-share-pick__icon" aria-hidden>
                  <ComposerStoryIcon size={16} />
                </span>
                <span>
                  Story
                  <span className="margo-landing-download-pick__sub" style={{ display: 'block' }}>24h</span>
                </span>
              </button>
            </>
          ) : (
            <>
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
                  void runDownloadImage()
                }}
              >
                <span className="margo-landing-share-pick__icon" aria-hidden>
                  <ImageIcon size={16} strokeWidth={1.75} />
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
                  <ComposerShareIcon size={16} />
                </span>
                Share to apps
              </button>
            </>
          )}
        </div>
      </LandingComposerPopover>

      {toast ? <LandingComposerToast message={toast} tier={tier} /> : null}
    </div>
  )
}
