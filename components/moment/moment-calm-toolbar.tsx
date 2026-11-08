'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Image as ImageIcon, Loader2, Video } from 'lucide-react'
import {
  ComposerColorIcon,
  ComposerDownloadIcon,
  ComposerEffectToolbarIcon,
  ComposerFormatSquareIcon,
  ComposerFormatStoryIcon,
  ComposerPostArrowIcon,
  ComposerShareIcon,
  ComposerStoryIcon,
  ComposerVibeIcon,
} from '@/components/moment/composer-toolbar-icons'
import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId } from '@/lib/moment/types'
import { STAGE_CARD_THEMES, type StageCardThemeId } from '@/lib/moment/stage-theme'
import {
  atmospherePillLabel,
  cardThemePillLabel,
  nextCardThemeId,
  nextExportAtmosphereId,
  nextMomentShapeId,
  shapePillLabel,
} from '@/lib/moment-composer-cycles'
import { LandingComposerPopover } from '@/components/landing/landing-composer-popover'
import { LandingComposerToast } from '@/components/landing/landing-composer-toast'
import { landingComposerTier, type LandingComposerTier } from '@/lib/landing-composer-layout'
import { UI_FONT } from '@/lib/fonts'

type PopoverId = 'vibe' | 'download' | 'share' | null
type DownloadPhase = 'idle' | 'loading' | 'done'

export type MomentCalmToolbarHandle = {
  openVibePopover: () => void
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

export const MomentCalmToolbar = forwardRef<MomentCalmToolbarHandle, MomentCalmToolbarProps>(function MomentCalmToolbar({
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
}, ref) {
  const tier = useLandingTier()
  const [popover, setPopover] = useState<PopoverId>(null)
  const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const [valuePill, setValuePill] = useState<string | null>(null)
  const valuePillTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloadLock = useRef(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const effectMode = exportAtmosphereId !== 'still'
  const themeSwatch = STAGE_CARD_THEMES.find((t) => t.id === cardThemeId)?.swatch ?? '#E8C547'

  useImperativeHandle(ref, () => ({
    openVibePopover: () => setPopover('vibe'),
  }), [])

  const flashValuePill = useCallback((label: string) => {
    setValuePill(label)
    if (valuePillTimer.current) clearTimeout(valuePillTimer.current)
    valuePillTimer.current = setTimeout(() => {
      setValuePill(null)
      valuePillTimer.current = null
    }, 1200)
  }, [])

  useEffect(() => () => {
    if (valuePillTimer.current) clearTimeout(valuePillTimer.current)
  }, [])

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

  const cycleColor = useCallback(() => {
    const next = nextCardThemeId(cardThemeId)
    onThemeChange(next)
    flashValuePill(cardThemePillLabel(next))
  }, [cardThemeId, flashValuePill, onThemeChange])

  const cycleEffect = useCallback(() => {
    const next = nextExportAtmosphereId(exportAtmosphereId)
    onExportAtmosphereChange(next)
    flashValuePill(atmospherePillLabel(next))
  }, [exportAtmosphereId, flashValuePill, onExportAtmosphereChange])

  const cycleFormat = useCallback(() => {
    const next = nextMomentShapeId(shapeId)
    onShapeChange(next)
    flashValuePill(shapePillLabel(next))
  }, [flashValuePill, onShapeChange, shapeId])

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
      {valuePill ? (
        <div className="margo-toolbar-value-pill" style={{ fontFamily: UI_FONT }} role="status" aria-live="polite">
          {valuePill}
        </div>
      ) : null}
      <div className="margo-landing-toolbar">
        <ToolButton
          label="Vibe"
          pressed={popover === 'vibe'}
          showDetectedDot={showVibeDot}
          onClick={() => togglePopover('vibe')}
        >
          <ComposerVibeIcon />
        </ToolButton>
        <ToolButton label="Color" onClick={cycleColor}>
          <ComposerColorIcon swatch={themeSwatch} />
        </ToolButton>
        <ToolButton label="Effect" pressed={effectMode} onClick={cycleEffect}>
          <ComposerEffectToolbarIcon effectId={exportAtmosphereId} />
        </ToolButton>
        <ToolButton label="Format" onClick={cycleFormat}>
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
})
