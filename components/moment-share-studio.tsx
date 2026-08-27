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
  buildLyricBackNativeSharePayload,
  buildMargoMomentFromExportProps,
  canShareImageFiles,
  copyMomentShareLink,
  isMomentRecipientShareable,
  MOMENT_VIBE_PICKER_OPTIONS,
  shareMomentNative,
} from '@/lib/moment'
import {
  downloadMargoMomentVideo,
  shareMargoMomentVideo,
  canShareVideoFiles,
} from '@/lib/moment-export/save-moment-video'
import { probeMomentVideoCapability } from '@/lib/moment-export/video/capabilities'
import { momentHasPlayableSnippet } from '@/lib/moment-export/timeline/build-moment-timeline'
import { buildMomentExportActionItems, buildMomentShareActionItems } from '@/lib/moment/share-action-items'

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
  /** modal = feed card export sheet: pinned actions, menus open upward */
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
  const [busy, setBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [canShareImg, setCanShareImg] = useState(false)
  const [canShareVid, setCanShareVid] = useState(false)
  const [canExportVideo, setCanExportVideo] = useState(false)
  const [videoUnavailableHint, setVideoUnavailableHint] = useState('Not available on this device')
  const [openMenu, setOpenMenu] = useState<'save' | 'share' | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoAbortRef = useRef<AbortController | null>(null)

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

  const canShareUrl = exportMoment ? isMomentRecipientShareable(exportMoment) : false
  const hasSnippet = exportMoment ? momentHasPlayableSnippet(exportMoment) : false

  useEffect(() => {
    setExportVibeLabel(momentProp?.vibeLabel ?? vibeLabel ?? null)
    const tid = momentProp?.themeId
    const stageTheme: StageCardThemeId =
      tid === 'blush' || tid === 'sage' || tid === 'dusk' || tid === 'gold' ? tid : 'gold'
    setCardThemeId(stageTheme)
    setCanShareImg(canShareImageFiles())
    setCanShareVid(canShareVideoFiles())
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
      return
    }
    if (!exportMoment) return
    setBusy(true)
    try {
      await saveMargoMomentImage(exportMoment)
      void recordCardExport({ postId: resolvedPostId, theme: cardThemeId, shape: 'square' })
      onExported?.()
    } finally {
      setBusy(false)
    }
  }, [isDualCard, renderDualCanvas, song, parentSong, exportMoment, resolvedPostId, cardThemeId, onExported])

  const shareImage = useCallback(async () => {
    if (!exportMoment || isDualCard) return
    setBusy(true)
    try {
      await shareMargoMomentImage(exportMoment)
      onShared?.()
    } finally {
      setBusy(false)
    }
  }, [exportMoment, isDualCard, onShared])

  const runVideoAction = useCallback(async (
    action: (
      moment: MargoMoment,
      onProgress?: (message: string) => void,
      signal?: AbortSignal,
    ) => Promise<unknown>,
    onSuccess?: () => void,
  ) => {
    if (!exportMoment || isDualCard || !canExportVideo || !hasSnippet) return
    videoAbortRef.current?.abort()
    const ac = new AbortController()
    videoAbortRef.current = ac
    setBusy(true)
    setVideoProgress('Creating your Moment…')
    try {
      await action(exportMoment, setVideoProgress, ac.signal)
      onSuccess?.()
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setVideoProgress('Could not create video. Try saving an image instead.')
        await new Promise((r) => setTimeout(r, 2800))
      }
    } finally {
      setBusy(false)
      setVideoProgress(null)
      if (videoAbortRef.current === ac) videoAbortRef.current = null
    }
  }, [exportMoment, isDualCard, canExportVideo, hasSnippet])

  const saveVideo = useCallback(async () => {
    await runVideoAction(downloadMargoMomentVideo, onExported)
  }, [runVideoAction, onExported])

  const shareVideo = useCallback(async () => {
    await runVideoAction(shareMargoMomentVideo, onShared)
  }, [runVideoAction, onShared])

  const shareLink = useCallback(async () => {
    if (isDualCard && parentLyric) {
      const payload = buildLyricBackNativeSharePayload(
        { parentLyric, replyLyric: lyric },
        resolvedPostId,
      )
      if (typeof navigator !== 'undefined' && navigator.share) {
        try { await navigator.share(payload); return }
        catch (e: unknown) { if ((e as Error).name === 'AbortError') return }
      }
      return
    }
    if (!exportMoment || !canShareUrl) return
    setBusy(true)
    try {
      await shareMomentNative(exportMoment)
      onShared?.()
    } finally {
      setBusy(false)
    }
  }, [isDualCard, parentLyric, lyric, resolvedPostId, exportMoment, canShareUrl, onShared])

  const copyLink = useCallback(async () => {
    if (!exportMoment || !canShareUrl) return
    setBusy(true)
    try {
      await copyMomentShareLink(exportMoment)
      onShared?.()
    } finally {
      setBusy(false)
    }
  }, [exportMoment, canShareUrl, onShared])

  const saveItems: MomentActionMenuItem[] = isDualCard
    ? buildMomentExportActionItems({ onExportImage: saveImage, showFormats: false })
    : buildMomentExportActionItems({
      onExportImage: saveImage,
      hasPlayableSnippet: hasSnippet,
      canExportVideo,
      videoUnavailableHint,
      onExportVideo: () => { void saveVideo() },
    })

  const shareItems: MomentActionMenuItem[] = isDualCard
    ? [
      {
        id: 'link',
        label: 'Share link',
        onClick: () => { void shareLink() },
      },
      {
        id: 'copy',
        label: 'Copy link',
        onClick: () => { void copyLink() },
      },
    ]
    : buildMomentShareActionItems({
      canShareImage: canShareImg,
      canShareVideo: canShareVid && canExportVideo && hasSnippet,
      linksActive: canShareUrl,
      onShareImage: () => { void shareImage() },
      onShareVideo: () => { void shareVideo() },
      onShareLink: () => { void shareLink() },
      onCopyLink: () => { void copyLink() },
    })

  const isModal = layout === 'modal'
  const gap = isModal ? '12px' : (compact ? '10px' : '12px')
  /** Room for Export/Share menus below the action row (current 3 export items + headroom). */
  const modalMenuReservePx = 168
  const modalMenuZIndex = 212
  const modalMenuScrimZIndex = 211

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
          busy={busy}
          open={openMenu === 'save'}
          onOpenChange={(next) => setOpenMenu(next ? 'save' : null)}
          menuZIndex={isModal ? modalMenuZIndex : undefined}
        />
        <MomentActionMenu
          label="Share"
          items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
          variant="secondary"
          busy={busy}
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

  if (isModal) {
    return (
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
        <div style={{ position: 'relative', zIndex: modalMenuZIndex, flexShrink: 0, paddingBottom: modalMenuReservePx }}>
          {progressBanner}
          {actionRow}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {cardSection}
      {progressBanner}
      {actionRow}
    </div>
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
