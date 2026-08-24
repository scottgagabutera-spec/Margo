'use client'

import { CloseIcon, ChevronRightIcon } from '@/components/icons'
import { StageMomentCard } from '@/components/stage/stage-moment-card'
import { recordCardExport } from '@/lib/engagement/card-exports'
import {
  THEMES,
  drawDualCard,
  normalizeLine,
  type NormalizedLine,
  type MomentLineInput,
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
  canShareImageFiles,
  copyMomentShareText,
  isMomentRecipientShareable,
  MOMENT_VIBE_PICKER_OPTIONS,
  shareMomentNative,
  buildMargoMomentFromExportProps,
} from '@/lib/moment'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  vibeLabel?: string | null
  moment?: MargoMoment | null
  lines?: MomentLineInput[]
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
}

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  postId,
  vibeLabel,
  moment: momentProp,
  lines,
  parentLyric, parentSong, parentArtist,
}: CardExportModalProps) {
  const [cardThemeId, setCardThemeId] = useState<StageCardThemeId>('gold')
  const [exportVibeLabel, setExportVibeLabel] = useState<string | null>(null)
  const [lineIndex, setLineIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [canShareImg, setCanShareImg] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES[0]

  const resolvedMoment = momentProp ?? null
  const resolvedPostId = resolvedMoment?.postId ?? postId

  const lineSource = resolvedMoment ? resolvedMoment.lines.map((l) => ({
    lyric: l.lyric,
    songName: l.songTitle,
    artistName: l.artistName,
    artworkUrl: l.artworkUrl,
  })) : lines

  const momentLines = useMemo<NormalizedLine[]>(() => {
    const fromProp = (lineSource || []).map(normalizeLine).filter(l => l.lyric.trim().length > 0)
    if (fromProp.length > 0) return fromProp
    if (lyric && lyric.trim()) return [{ lyric, songTitle: song, artistName: artist }]
    return []
  }, [lineSource, lyric, song, artist])

  const isMulti = !isDualCard && momentLines.length > 1
  const previewIndex = isMulti ? lineIndex : 0
  const previewLine = momentLines[previewIndex]

  const baseMoment = useMemo<MargoMoment | null>(() => {
    if (resolvedMoment) return resolvedMoment
    if (momentLines.length === 0) return null
    return buildMargoMomentFromExportProps({
      lines: momentLines,
      postId: resolvedPostId,
      vibeLabel: exportVibeLabel ?? vibeLabel,
    })
  }, [resolvedMoment, momentLines, resolvedPostId, exportVibeLabel, vibeLabel])

  const exportMoment = useMemo<MargoMoment | null>(() => {
    if (!baseMoment || !previewLine) return null
    return {
      ...baseMoment,
      lines: [{
        lyric: previewLine.lyric,
        songTitle: previewLine.songTitle,
        artistName: previewLine.artistName,
        artworkUrl: previewLine.artworkUrl ?? null,
      }],
      themeId: cardThemeId,
      shapeId: 'square',
      vibeLabel: exportVibeLabel ?? baseMoment.vibeLabel ?? vibeLabel ?? null,
      seedKey: resolvedPostId ? `${resolvedPostId}:line${previewIndex}` : baseMoment.seedKey,
    }
  }, [baseMoment, previewLine, cardThemeId, exportVibeLabel, vibeLabel, resolvedPostId, previewIndex])

  const canShareUrl = exportMoment ? isMomentRecipientShareable(exportMoment) : false

  useEffect(() => {
    if (!open) return
    setExportVibeLabel(resolvedMoment?.vibeLabel ?? vibeLabel ?? null)
    const tid = resolvedMoment?.themeId
    const stageTheme: StageCardThemeId =
      tid === 'blush' || tid === 'sage' || tid === 'dusk' || tid === 'gold' ? tid : 'gold'
    setCardThemeId(stageTheme)
    setLineIndex(0)
    setCanShareImg(canShareImageFiles())
  }, [open, resolvedMoment?.vibeLabel, resolvedMoment?.themeId, vibeLabel])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

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

  useEffect(() => {
    if (open && isDualCard) void renderDualCanvas()
  }, [open, isDualCard, renderDualCanvas])

  const handleSave = useCallback(async () => {
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
    setSaving(true)
    try {
      await saveMargoMomentImage(exportMoment)
      void recordCardExport({ postId: resolvedPostId, theme: cardThemeId, shape: 'square' })
    } finally {
      setSaving(false)
    }
  }, [isDualCard, renderDualCanvas, song, parentSong, exportMoment, resolvedPostId, cardThemeId])

  const handleShare = useCallback(async () => {
    setSharing(true)
    try {
      if (isDualCard && parentLyric) {
        const payload = buildLyricBackNativeSharePayload(
          { parentLyric, replyLyric: lyric },
          resolvedPostId,
        )
        if (typeof navigator !== 'undefined' && navigator.share) {
          try { await navigator.share(payload); return }
          catch (e: unknown) { if ((e as Error).name === 'AbortError') return }
        }
        if (typeof navigator !== 'undefined') navigator.clipboard.writeText(payload.url)
        return
      }
      if (!exportMoment) return
      if (canShareImg) {
        const imgResult = await shareMargoMomentImage(exportMoment)
        if (imgResult === 'shared') return
      }
      if (canShareUrl) {
        await shareMomentNative(exportMoment)
      }
    } finally {
      setSharing(false)
    }
  }, [isDualCard, parentLyric, lyric, resolvedPostId, exportMoment, canShareImg, canShareUrl])

  if (!open) return null

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
    color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase',
    margin: 0,
  }

  const btnBase: React.CSSProperties = {
    minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 16px', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.56rem', letterSpacing: '0.9px', textTransform: 'uppercase', cursor: 'pointer',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,6,10,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overscrollBehavior: 'none',
        touchAction: 'none',
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'min(88dvh, 640px)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          touchAction: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 10px', flexShrink: 0,
        }}>
          <p style={sectionLabelStyle}>
            {isDualCard ? 'Lyric Back Card' : 'Share your Moment'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          padding: '0 16px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {isDualCard ? (
            <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#07060A' }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}
              />
            </div>
          ) : previewLine ? (
            <>
              {isMulti && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px',
                }}>
                  <button
                    type="button"
                    aria-label="Previous line"
                    onClick={() => setLineIndex(i => (i - 1 + momentLines.length) % momentLines.length)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                      <ChevronRightIcon size={14} color="var(--text-secondary)" />
                    </span>
                  </button>
                  <span style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                  }}>
                    Line {lineIndex + 1} of {momentLines.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Next line"
                    onClick={() => setLineIndex(i => (i + 1) % momentLines.length)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
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

          {!isDualCard && (
            <p style={{
              fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
              fontSize: '0.68rem', color: 'var(--text-muted)',
              textAlign: 'center', margin: '12px 0 0', lineHeight: 1.4,
            }}>
              Same card as Stage — tap Color or Vibe to customize. Controls stay off the saved image.
            </p>
          )}
        </div>

        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px',
          padding: '14px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (!isDualCard && !exportMoment)}
            style={{
              ...btnBase, width: '100%', background: 'var(--gold)', color: 'var(--bg)',
              border: 'none', fontWeight: 700,
              opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer',
            }}
          >{saving ? 'Saving…' : isDualCard ? 'Save Card' : 'Save image'}</button>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing || (isDualCard ? false : !exportMoment)}
            style={{
              ...btnBase, width: '100%',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text)',
              border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600,
              opacity: sharing ? 0.7 : 1, cursor: sharing ? 'wait' : 'pointer',
            }}
          >{sharing ? 'Sharing…' : canShareImg && !isDualCard ? 'Share image' : 'Share link'}</button>
          {canShareUrl && !isDualCard && (
            <button
              type="button"
              onClick={() => { if (exportMoment) void copyMomentShareText(exportMoment) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem',
                color: 'var(--text-muted)', textDecoration: 'underline',
                padding: '4px', minHeight: '32px',
              }}
            >Copy link</button>
          )}
        </div>
      </div>
    </div>
  )
}
