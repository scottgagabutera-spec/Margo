'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { MomentActionMenu, type MomentActionMenuItem } from '@/components/moment-action-menu'
import { recordCardExport } from '@/lib/engagement/card-exports'
import {
  drawDualCard,
  normalizeLine,
  THEMES,
  type MomentLineInput,
  type NormalizedLine,
} from '@/lib/moment-export/render-moment'
import {
  downloadCanvas,
  saveMargoMomentImage,
  shareMargoMomentImage,
  slugify,
} from '@/lib/moment-export/save-moment-image'
import type { MargoMoment } from '@/lib/moment/types'
import type { StageCardThemeId } from '@/lib/moment/stage-theme'
import {
  buildMargoMomentFromExportProps,
  canShareImageFiles,
  MOMENT_VIBE_PICKER_OPTIONS,
} from '@/lib/moment'
import {
  prepareMargoMomentVideoShare,
  sharePreparedMomentVideo,
  canShareVideoFiles,
} from '@/lib/moment-export/save-moment-video'
import {
  prepareMargoMomentGifShare,
  sharePreparedMomentGif,
  canShareGifFiles,
} from '@/lib/moment-export/save-moment-gif'
import { canExportMomentGif } from '@/lib/moment-export/gif/capabilities'
import { probeMomentVideoCapability } from '@/lib/moment-export/video/capabilities'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { buildMomentExportActionItems, buildMomentShareActionItems } from '@/lib/moment/share-action-items'
import {
  MomentVideoReadySheet,
  type MomentVideoReadyMode,
  type MomentMediaReadyFormat,
} from '@/components/moment-video-ready-sheet'
import { triggerFileDownload } from '@/lib/moment-export/trigger-file-download'
import {
  toastMomentExportFailed,
  toastMomentImageSaved,
  toastMomentShared,
  toastMomentShareFailed,
  toastMomentVideoSaved,
  toastMomentGifSaved,
} from '@/lib/moment-export/moment-export-toasts'

interface MomentShareStudioProps {
  moment?: MargoMoment | null
  lines?: MomentLineInput[]
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  vibeLabel?: string | null
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
  compact?: boolean
  /** modal = feed / compose export sheet: preview then actions; menus portal downward */
  layout?: 'default' | 'modal'
  onShareMenuOpen?: () => void
  onShared?: () => void
  onExported?: () => void
}

export function MomentShareStudio({
  moment: momentProp,
  lines,
  lyric = '',
  song = '',
  artist = '',
  postId,
  vibeLabel,
  parentLyric,
  parentSong,
  parentArtist,
  compact = false,
  layout = 'default',
  onShareMenuOpen,
  onShared,
  onExported,
}: MomentShareStudioProps) {
  const [cardThemeId, setCardThemeId] = useState<StageCardThemeId>('gold')
  const [exportVibeLabel, setExportVibeLabel] = useState<string | null>(null)
  const [lineIndex, setLineIndex] = useState(0)
  const [exportBusy, setExportBusy] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [canShareImg, setCanShareImg] = useState(false)
  const [canShareVid, setCanShareVid] = useState(false)
  const [canShareGif, setCanShareGif] = useState(false)
  const [canExportVideo, setCanExportVideo] = useState(false)
  const [canExportGif, setCanExportGif] = useState(false)
  const [videoUnavailableHint, setVideoUnavailableHint] = useState('Not available on this device')
  const [mediaReadySheet, setMediaReadySheet] = useState<{
    mode: MomentVideoReadyMode
    format: MomentMediaReadyFormat
    previewUrl: string
    file: File
  } | null>(null)
  const [openMenu, setOpenMenu] = useState<'save' | 'share' | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoAbortRef = useRef<AbortController | null>(null)
  const gifAbortRef = useRef<AbortController | null>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES[0]
  const resolvedPostId = momentProp?.postId ?? postId

  const lineSource = momentProp
    ? momentProp.lines.map((l) => ({
      lyric: l.lyric,
      songName: l.songTitle,
      artistName: l.artistName,
      artworkUrl: l.artworkUrl,
    }))
    : lines

  const momentLines = useMemo<NormalizedLine[]>(() => {
    const fromProp = (lineSource || []).map(normalizeLine).filter((l) => l.lyric.trim().length > 0)
    if (fromProp.length > 0) return fromProp
    if (lyric.trim()) return [{ lyric, songTitle: song, artistName: artist }]
    return []
  }, [lineSource, lyric, song, artist])

  const isMulti = !isDualCard && momentLines.length > 1
  const previewIndex = isMulti ? lineIndex : 0
  const previewLine = momentLines[previewIndex]

  const baseMoment = useMemo<MargoMoment | null>(() => {
    if (momentProp) return momentProp
    if (momentLines.length === 0) return null
    return buildMargoMomentFromExportProps({
      lines: momentLines,
      postId: resolvedPostId,
      vibeLabel: exportVibeLabel ?? vibeLabel,
    })
  }, [momentProp, momentLines, resolvedPostId, exportVibeLabel, vibeLabel])

  const exportMoment = useMemo<MargoMoment | null>(() => {
    if (!baseMoment || !previewLine || isDualCard) return baseMoment
    return {
      ...baseMoment,
      lines: [{
        lyric: previewLine.lyric,
        songTitle: previewLine.songTitle,
        artistName: previewLine.artistName,
        artworkUrl: previewLine.artworkUrl ?? null,
        audioUrl: baseMoment.lines[previewIndex]?.audioUrl ?? null,
        snippetStart: baseMoment.lines[previewIndex]?.snippetStart ?? null,
        snippetEnd: baseMoment.lines[previewIndex]?.snippetEnd ?? null,
      }],
      themeId: cardThemeId,
      shapeId: 'square',
      vibeLabel: exportVibeLabel ?? baseMoment.vibeLabel ?? vibeLabel ?? null,
      seedKey: resolvedPostId ? `${resolvedPostId}:line${previewIndex}` : baseMoment.seedKey,
    }
  }, [baseMoment, previewLine, isDualCard, cardThemeId, exportVibeLabel, vibeLabel, resolvedPostId, previewIndex])

  const hasSnippet = exportMoment ? momentHasPlayableSnippet(exportMoment) : false

  useEffect(() => {
    setExportVibeLabel(momentProp?.vibeLabel ?? vibeLabel ?? null)
    const tid = momentProp?.themeId
    const stageTheme: StageCardThemeId =
      tid === 'blush' || tid === 'sage' || tid === 'dusk' || tid === 'gold' ? tid : 'gold'
    setCardThemeId(stageTheme)
    setCanShareImg(canShareImageFiles())
    setCanShareVid(canShareVideoFiles())
    setCanShareGif(canShareGifFiles())
    setCanExportGif(canExportMomentGif())
    let cancelled = false
    void probeMomentVideoCapability().then((cap) => {
      if (cancelled) return
      setCanExportVideo(cap.canExport)
      if (cap.reason) setVideoUnavailableHint(cap.reason)
    })
    return () => { cancelled = true }
  }, [momentProp?.vibeLabel, momentProp?.themeId, vibeLabel])

  useEffect(() => () => {
    videoAbortRef.current?.abort()
    gifAbortRef.current?.abort()
  }, [])

  const renderDualCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !isDualCard) return
    const w = 1080
    const h = 1080
    const SCALE = 2
    canvas.width = w * SCALE
    canvas.height = h * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(SCALE, SCALE)
    await drawDualCard(
      ctx, w, h,
      parentLyric!, parentSong!, parentArtist!,
      lyric, song, artist,
      activeTheme,
    )
  }, [isDualCard, parentLyric, parentSong, parentArtist, lyric, song, artist, activeTheme])

  const saveImage = useCallback(async () => {
    if (isDualCard) {
      await renderDualCanvas()
      const canvas = canvasRef.current
      if (!canvas) return
      const slugReply = slugify(song, 'Lyric')
      const slugParent = slugify(parentSong || '', 'Lyric')
      await downloadCanvas(canvas, `MARGO_${slugParent}_LyricBack_${slugReply}.png`)
      void recordCardExport({ postId: resolvedPostId, theme: 'gold', shape: 'square' })
      toastMomentImageSaved()
      return
    }
    if (!exportMoment) return
    setExportBusy(true)
    try {
      await saveMargoMomentImage(exportMoment)
      void recordCardExport({ postId: resolvedPostId, theme: cardThemeId, shape: 'square' })
      toastMomentImageSaved()
      onExported?.()
    } catch {
      toastMomentExportFailed('image')
    } finally {
      setExportBusy(false)
    }
  }, [isDualCard, renderDualCanvas, song, parentSong, exportMoment, resolvedPostId, cardThemeId, onExported])

  const shareImage = useCallback(async () => {
    setShareBusy(true)
    try {
      if (isDualCard) {
        await renderDualCanvas()
        const canvas = canvasRef.current
        if (!canvas || typeof navigator === 'undefined' || !navigator.share) {
          toastMomentShareFailed()
          return
        }
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png')
        })
        if (!blob) {
          toastMomentShareFailed()
          return
        }
        const file = new File(
          [blob],
          `MARGO_${slugify(parentSong || '', 'Lyric')}_LyricBack_${slugify(song, 'Lyric')}.png`,
          { type: 'image/png' },
        )
        if (typeof navigator.canShare === 'function') {
          try {
            if (!navigator.canShare({ files: [file] })) {
              toastMomentShareFailed()
              return
            }
          } catch {
            toastMomentShareFailed()
            return
          }
        }
        try {
          await navigator.share({ files: [file], title: 'MARGO' })
          toastMomentShared()
          onShared?.()
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') toastMomentShareFailed()
        }
        return
      }
      if (!exportMoment) return
      const result = await shareMargoMomentImage(exportMoment)
      if (result === 'shared') {
        toastMomentShared()
        onShared?.()
      } else {
        toastMomentShareFailed()
      }
    } finally {
      setShareBusy(false)
    }
  }, [isDualCard, renderDualCanvas, parentSong, song, exportMoment, onShared])

  const prepareVideo = useCallback(async () => {
    if (!exportMoment || isDualCard || !canExportVideo || !hasSnippet) return null
    gifAbortRef.current?.abort()
    videoAbortRef.current?.abort()
    const ac = new AbortController()
    videoAbortRef.current = ac
    setVideoProgress('Creating your Moment…')
    try {
      const out = await prepareMargoMomentVideoShare(exportMoment, setVideoProgress, ac.signal)
      if (!out) {
        toastMomentExportFailed('video')
        return null
      }
      return out
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toastMomentExportFailed('video', (err as Error)?.message)
      }
      return null
    } finally {
      setVideoProgress(null)
      if (videoAbortRef.current === ac) videoAbortRef.current = null
    }
  }, [exportMoment, isDualCard, canExportVideo, hasSnippet])

  const saveVideo = useCallback(async () => {
    setExportBusy(true)
    try {
      const out = await prepareVideo()
      if (!out) return
      setMediaReadySheet({
        mode: 'save',
        format: 'video',
        file: out.file,
        previewUrl: out.previewUrl,
      })
    } finally {
      setExportBusy(false)
    }
  }, [prepareVideo])

  const shareVideo = useCallback(async () => {
    setShareBusy(true)
    try {
      const out = await prepareVideo()
      if (!out) return
      setMediaReadySheet({
        mode: 'share',
        format: 'video',
        file: out.file,
        previewUrl: out.previewUrl,
      })
    } finally {
      setShareBusy(false)
    }
  }, [prepareVideo])

  const prepareGif = useCallback(async () => {
    if (!exportMoment || isDualCard || !canExportGif || !hasSnippet) return null
    videoAbortRef.current?.abort()
    gifAbortRef.current?.abort()
    const ac = new AbortController()
    gifAbortRef.current = ac
    setVideoProgress('Creating your Moment…')
    try {
      const out = await prepareMargoMomentGifShare(exportMoment, setVideoProgress, ac.signal)
      if (!out) {
        toastMomentExportFailed('gif')
        return null
      }
      return out
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toastMomentExportFailed('gif', (err as Error)?.message)
      }
      return null
    } finally {
      setVideoProgress(null)
      if (gifAbortRef.current === ac) gifAbortRef.current = null
    }
  }, [exportMoment, isDualCard, canExportGif, hasSnippet])

  const saveGif = useCallback(async () => {
    setExportBusy(true)
    try {
      const out = await prepareGif()
      if (!out) return
      setMediaReadySheet({
        mode: 'save',
        format: 'gif',
        file: out.file,
        previewUrl: out.previewUrl,
      })
    } finally {
      setExportBusy(false)
    }
  }, [prepareGif])

  const shareGif = useCallback(async () => {
    setShareBusy(true)
    try {
      const out = await prepareGif()
      if (!out) return
      setMediaReadySheet({
        mode: 'share',
        format: 'gif',
        file: out.file,
        previewUrl: out.previewUrl,
      })
    } finally {
      setShareBusy(false)
    }
  }, [prepareGif])

  const confirmMediaReady = useCallback(async () => {
    if (!mediaReadySheet) return
    const { format, mode, file } = mediaReadySheet
    if (mode === 'save') {
      setExportBusy(true)
      try {
        const result = await triggerFileDownload(file)
        if (result !== 'failed') {
          if (format === 'gif') toastMomentGifSaved(result)
          else toastMomentVideoSaved(result)
          setMediaReadySheet(null)
          onExported?.()
        } else {
          toastMomentExportFailed(format)
        }
      } finally {
        setExportBusy(false)
      }
      return
    }
    setShareBusy(true)
    try {
      const result = format === 'gif'
        ? await sharePreparedMomentGif(file)
        : await sharePreparedMomentVideo(file)
      if (result === 'shared') {
        toastMomentShared()
        setMediaReadySheet(null)
        onShared?.()
      } else if (result !== 'cancelled') {
        toastMomentShareFailed()
      }
    } finally {
      setShareBusy(false)
    }
  }, [mediaReadySheet, onExported, onShared])

  const saveItems: MomentActionMenuItem[] = isDualCard
    ? buildMomentExportActionItems({ onExportImage: saveImage, showFormats: false })
    : buildMomentExportActionItems({
      onExportImage: saveImage,
      hasPlayableSnippet: hasSnippet,
      canExportVideo,
      videoUnavailableHint,
      onExportVideo: () => { void saveVideo() },
      canExportGif,
      onExportGif: () => { void saveGif() },
    })

  const shareItems: MomentActionMenuItem[] = buildMomentShareActionItems({
    canShareImage: canShareImg,
    canShareVideo: !isDualCard && canShareVid && canExportVideo && hasSnippet,
    canShareGif: !isDualCard && canShareGif && canExportGif && hasSnippet,
    onShareImage: () => { void shareImage() },
    onShareVideo: () => { void shareVideo() },
    onShareGif: () => { void shareGif() },
  })

  const isModal = layout === 'modal'
  const gap = isModal ? '12px' : (compact ? '10px' : '12px')
  const modalMenuZIndex = 230
  const modalMenuScrimZIndex = 210

  const cardSection = (
    <>
      {isDualCard ? (
        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#07060A' }}>
          <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }} />
        </div>
      ) : previewLine ? (
        <>
          {isMulti && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                aria-label="Previous line"
                onClick={() => setLineIndex((i) => (i - 1 + momentLines.length) % momentLines.length)}
                style={navBtnStyle}
              >
                <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                  <ChevronRightIcon size={14} color="var(--text-secondary)" />
                </span>
              </button>
              <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                Line {lineIndex + 1} of {momentLines.length}
              </span>
              <button
                type="button"
                aria-label="Next line"
                onClick={() => setLineIndex((i) => (i + 1) % momentLines.length)}
                style={navBtnStyle}
              >
                <ChevronRightIcon size={14} color="var(--text-secondary)" />
              </button>
            </div>
          )}
          <StageMomentCard
            lyric={previewLine.lyric}
            songTitle={previewLine.songTitle}
            artistName={previewLine.artistName}
            artwork={previewLine.artworkUrl}
            vibeLabel={exportVibeLabel}
            vibeOptions={MOMENT_VIBE_PICKER_OPTIONS}
            onVibeSelect={setExportVibeLabel}
            cardThemeId={cardThemeId}
            onThemeChange={setCardThemeId}
            canPlay={false}
          />
        </>
      ) : null}
    </>
  )

  const actionRow = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: '8px',
        alignItems: 'flex-start',
        width: '100%',
      }}>
        <MomentActionMenu
          label="Export"
          items={saveItems}
          variant="primary"
          busy={exportBusy}
          busyLabel={videoProgress}
          open={openMenu === 'save'}
          onOpenChange={(next) => setOpenMenu(next ? 'save' : null)}
          menuZIndex={isModal ? modalMenuZIndex : undefined}
        />
        <MomentActionMenu
          label="Share"
          items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
          variant="secondary"
          busy={shareBusy}
          busyLabel={videoProgress}
          disabled={shareItems.length === 0}
          open={openMenu === 'share'}
          onOpenChange={(next) => {
            if (next) onShareMenuOpen?.()
            setOpenMenu(next ? 'share' : null)
          }}
          menuZIndex={isModal ? modalMenuZIndex : undefined}
        />
      </div>
    </div>
  )

  const progressBanner = videoProgress ? (
    <p
      role="status"
      aria-live="polite"
      style={{
        margin: 0,
        fontFamily: 'var(--font-lora), serif',
        fontSize: '0.68rem',
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}
    >
      {videoProgress}
    </p>
  ) : null

  const mediaReadySheetEl = (
    <MomentVideoReadySheet
      open={!!mediaReadySheet}
      mode={mediaReadySheet?.mode ?? 'save'}
      format={mediaReadySheet?.format ?? 'video'}
      previewUrl={mediaReadySheet?.previewUrl ?? null}
      filename={mediaReadySheet?.file.name ?? 'MARGO_Moment.mp4'}
      busy={mediaReadySheet?.mode === 'save' ? exportBusy : shareBusy}
      onPrimary={() => { void confirmMediaReady() }}
      onClose={() => setMediaReadySheet(null)}
    />
  )

  if (isModal) {
    return (
      <>
        {mediaReadySheetEl}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap }}>
        {openMenu ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenMenu(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: modalMenuScrimZIndex,
              border: 'none',
              background: 'rgba(7,6,10,0.42)',
              cursor: 'default',
            }}
          />
        ) : null}
        {cardSection}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          {progressBanner}
          {actionRow}
        </div>
        </div>
      </>
    )
  }

  return (
    <>
      {mediaReadySheetEl}
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {cardSection}
      {progressBanner}
      {actionRow}
      </div>
    </>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  flexShrink: 0,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-hi)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
