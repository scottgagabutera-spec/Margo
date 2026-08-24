'use client'
import { CloseIcon, ChevronRightIcon } from '@/components/icons'
import { recordCardExport } from '@/lib/engagement/card-exports'
import {
  THEMES,
  SHAPES,
  drawMomentPoster,
  drawDualCard,
  renderMomentToCanvas,
  normalizeLine,
  type NormalizedLine,
  type MomentLineInput,
} from '@/lib/moment-export/render-moment'
import { downloadCanvas, slugify, shareMargoMomentImage } from '@/lib/moment-export/save-moment-image'
import type { MargoMoment } from '@/lib/moment/types'
import {
  buildLyricBackNativeSharePayload,
  buildLyricBackShareText,
  buildMargoMomentFromExportProps,
  buildMomentShareText,
  copyMomentShareText,
  getMomentShareUrl,
  resolveMomentComposition,
  margoMomentToPostLines,
  canShareImageFiles,
  shareMomentNative,
} from '@/lib/moment'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  /** Selected vibe label (e.g. "Heartbreak") — small accent caption. Compose only. */
  vibeLabel?: string | null
  /** Canonical Moment — when present, source of truth for export + share. */
  moment?: MargoMoment | null
  /** Full ordered Moment — when present (and non-empty), this is the
   * source of truth for the export; lyric/song/artist above become the
   * fallback for single-line callers that haven't been updated. */
  lines?: MomentLineInput[]
  // Lyric Back dual-card: if these are present, canvas draws parent + reply
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
  const [theme, setTheme] = useState('gold')
  const [shape, setShape] = useState('square')
  const [copied, setCopied] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  // "Export all" downloads are sequential, not guaranteed — some browsers
  // prompt for permission or silently block downloads past the first one
  // triggered without a fresh user gesture. This surfaces progress instead
  // of a single button press that might quietly produce fewer files than
  // expected with no explanation.
  const [exportAllProgress, setExportAllProgress] = useState<{ done: number; total: number } | null>(null)
  const [canShareImg, setCanShareImg] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const carouselCanvasRef = useRef<HTMLCanvasElement>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const activeShape = SHAPES.find(s => s.id === shape) || SHAPES[0]

  const resolvedMoment = momentProp ?? null
  const resolvedPostId = resolvedMoment?.postId ?? postId
  const resolvedVibeLabel = resolvedMoment?.vibeLabel ?? vibeLabel

  const lineSource = resolvedMoment
    ? margoMomentToPostLines(resolvedMoment)
    : lines

  // The full ordered Moment — source of truth for the poster. Falls back
  // to the singular lyric/song/artist props for callers that only ever
  // had one line to begin with (karaoke line share, Lyric Back replies).
  const momentLines = useMemo<NormalizedLine[]>(() => {
    const fromProp = (lineSource || []).map(normalizeLine).filter(l => l.lyric.trim().length > 0)
    if (fromProp.length > 0) return fromProp
    if (lyric && lyric.trim()) return [{ lyric, songTitle: song, artistName: artist }]
    return []
  }, [lineSource, lyric, song, artist])

  const isMulti = !isDualCard && momentLines.length > 1

  const effectiveMoment = useMemo<MargoMoment | null>(() => {
    if (resolvedMoment) return resolvedMoment
    if (momentLines.length === 0) return null
    return buildMargoMomentFromExportProps({
      lines: momentLines,
      postId: resolvedPostId,
      vibeLabel: resolvedVibeLabel,
    })
  }, [resolvedMoment, momentLines, resolvedPostId, resolvedVibeLabel])

  const composition = useMemo(() => {
    if (isDualCard || !effectiveMoment) return null
    return resolveMomentComposition(effectiveMoment)
  }, [isDualCard, effectiveMoment])

  useEffect(() => {
    if (open) setCanShareImg(canShareImageFiles())
  }, [open])

  useEffect(() => {
    if (carouselIndex >= momentLines.length) setCarouselIndex(0)
  }, [momentLines.length, carouselIndex])

  const url = getMomentShareUrl(resolvedPostId)
  const copyText = isDualCard
    ? buildLyricBackShareText({ parentLyric: parentLyric!, replyLyric: lyric })
    : effectiveMoment
      ? buildMomentShareText(effectiveMoment)
      : ''

  /* ─── Render helpers ────────────────────────────────────────── */
  const paintMoment = useCallback(async (
    canvas: HTMLCanvasElement,
    linesToPaint: NormalizedLine[],
    seedKey: string,
  ) => {
    await renderMomentToCanvas(canvas, {
      lines: linesToPaint,
      themeId: activeTheme.id,
      shapeId: activeShape.id,
      vibeLabel: resolvedVibeLabel,
      seedKey,
    })
  }, [activeShape, activeTheme, resolvedVibeLabel])

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = activeShape
    const SCALE = 2
    canvas.width = w * SCALE
    canvas.height = h * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(SCALE, SCALE)

    if (isDualCard) {
      await drawDualCard(
        ctx, w, h,
        parentLyric!, parentSong!, parentArtist!,
        lyric, song, artist,
        activeTheme
      )
    } else if (momentLines.length > 0) {
      // postId as the composition seed when it exists — same Moment,
      // same archetype/motif every time it's reopened.
      await drawMomentPoster(ctx, w, h, momentLines, activeTheme, resolvedVibeLabel, resolvedPostId ? `${resolvedPostId}:combined` : 'combined', composition || undefined)
    }
  }, [activeShape, activeTheme, isDualCard, parentLyric, parentSong, parentArtist, lyric, song, artist, momentLines, resolvedVibeLabel, resolvedPostId, composition])

  useEffect(() => {
    if (open) renderCanvas()
  }, [open, renderCanvas])

  useEffect(() => {
    if (!open || !isMulti) return
    const canvas = carouselCanvasRef.current
    const line = momentLines[carouselIndex]
    if (!canvas || !line) return
    void paintMoment(canvas, [line], resolvedPostId ? `${resolvedPostId}:card${carouselIndex}` : `card${carouselIndex}`)
  }, [open, isMulti, carouselIndex, momentLines, paintMoment, resolvedPostId])

  /* ─── Export actions ────────────────────────────────────────── */
  const filenameFor = useCallback((suffix?: string) => {
    const primary = momentLines[0]
    const base = momentLines.length > 1 ? 'Moment' : slugify(primary?.songTitle || '', 'Lyric')
    const parts = ['MARGO', base]
    if (suffix) parts.push(suffix)
    parts.push(activeShape.label)
    return `${parts.join('_')}.png`
  }, [momentLines, activeShape])

  const handleSave = useCallback(async () => {
    await renderCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    if (isDualCard) {
      const slugReply = slugify(song, 'Lyric')
      const slugParent = slugify(parentSong || '', 'Lyric')
      await downloadCanvas(canvas, `MARGO_${slugParent}_LyricBack_${slugReply}_${activeShape.label}.png`)
    } else {
      await downloadCanvas(canvas, filenameFor())
    }
    void recordCardExport({ postId: resolvedPostId, theme, shape })
  }, [renderCanvas, isDualCard, song, parentSong, activeShape, filenameFor, resolvedPostId, theme, shape])

  const handleExportCard = useCallback(async (index: number) => {
    const line = momentLines[index]
    if (!line) return
    const canvas = document.createElement('canvas')
    await paintMoment(canvas, [line], resolvedPostId ? `${resolvedPostId}:card${index}` : `card${index}`)
    await downloadCanvas(canvas, filenameFor(momentLines.length > 1 ? `card${index + 1}of${momentLines.length}` : undefined))
    void recordCardExport({ postId: resolvedPostId, theme, shape })
  }, [momentLines, paintMoment, resolvedPostId, filenameFor, theme, shape])

  const handleExportAllCards = useCallback(async () => {
    if (exportAllProgress) return
    const total = momentLines.length
    setExportAllProgress({ done: 0, total })
    try {
      for (let i = 0; i < total; i++) {
        // Sequential, with a short stagger — back-to-back synchronous
        // download triggers are the pattern browsers are most likely to
        // flag as "this site is trying to download multiple files," and
        // some browsers block anything past the first without prompting.
        // There's no reliable way to detect a silently-blocked download
        // from JS, so this can't guarantee all N files arrive — showing
        // progress at least tells the user what was attempted instead of
        // a single button press that might quietly produce fewer files.
        // eslint-disable-next-line no-await-in-loop
        await handleExportCard(i)
        setExportAllProgress({ done: i + 1, total })
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    } finally {
      setTimeout(() => setExportAllProgress(null), 900)
    }
  }, [momentLines.length, handleExportCard, exportAllProgress])

  /* ─── Copy ──────────────────────────────────────────────── */
  const handleCopy = useCallback(() => {
    if (effectiveMoment) {
      void copyMomentShareText(effectiveMoment).then((ok) => {
        if (!ok && typeof navigator !== 'undefined') navigator.clipboard.writeText(copyText)
      })
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(copyText)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [copyText, effectiveMoment])

  /* ─── Share ─────────────────────────────────────────────── */
  const handleShare = useCallback(async () => {
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
    if (effectiveMoment) {
      await shareMomentNative(effectiveMoment)
      return
    }
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(url)
  }, [isDualCard, parentLyric, lyric, resolvedPostId, effectiveMoment, url])

  const handleShareImage = useCallback(async () => {
    if (!effectiveMoment || isDualCard) return
    await shareMargoMomentImage(effectiveMoment)
  }, [effectiveMoment, isDualCard])

  if (!open) return null

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700,
    color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase',
  }

  // Compact-but-premium button base: touch-target height comes from
  // minHeight, not padding, so tightening padding never drops below the
  // 44px accessible minimum — the goal is less air AROUND controls, not
  // smaller tap targets.
  const btnBase: React.CSSProperties = {
    minHeight: 'var(--margo-touch-min)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 14px', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(7,6,10,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={() => onOpenChange(false)}
    >
      {/* Sheet — the poster gets the space; chrome around it stays tight so
          this fits a phone viewport without the user scrolling past
          buttons just to reach the next control. Outer scroll stays only
          as a fallback for content that genuinely can't fit (e.g. a
          multi-line carousel on a very short viewport). */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 calc(14px + var(--margo-page-bottom))',
          display: 'flex', flexDirection: 'column',
          maxHeight: '94dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0' }}>
          <p style={sectionLabelStyle}>
            {isDualCard ? 'Lyric Back Card' : 'Share your Moment'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box' }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        {/* Combined poster preview — the dominant element. Height responds
            to the viewport instead of a flat cap, so Story/portrait gets
            real visible room instead of a cramped scroll window. */}
        <div style={{ margin: '10px 16px 0', borderRadius: '12px', overflow: 'hidden', background: '#07060A', position: 'relative', maxHeight: 'min(46dvh, 380px)', overflowY: 'auto' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: `${activeShape.w} / ${activeShape.h}`, display: 'block' }}
          />
        </div>

        {/* Theme + Shape — one compact row each, tight to the poster above
            them rather than separated by large section gaps. */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px 16px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Theme</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    ...btnBase, flex: 1, gap: '6px', padding: '0 8px',
                    background: theme === t.id ? 'rgba(232,197,71,0.12)' : 'rgba(255,255,255,0.03)',
                    border: theme === t.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 150ms ease', textTransform: 'none', letterSpacing: 0,
                  }}
                >
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', color: theme === t.id ? '#E8C547' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.label.replace('Margo ', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Shape</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {SHAPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setShape(s.id)}
                  aria-label={`${s.label} (${s.ratio})`}
                  style={{
                    ...btnBase, flex: 1, padding: '0 6px',
                    background: shape === s.id ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.03)',
                    border: shape === s.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 150ms ease', textTransform: 'none', letterSpacing: 0,
                    color: shape === s.id ? '#E8C547' : 'rgba(255,255,255,0.5)', fontSize: '0.7rem',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary export action — the poster is the hero; this is one
            clear, compact CTA plus two lightweight secondary controls, not
            three equally-weighted buttons. */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0', flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            style={{ ...btnBase, flex: '2 1 120px', background: '#E8C547', color: '#07060A', border: 'none', fontWeight: 700 }}
          >{isDualCard ? 'Save Card' : 'Export Moment'}</button>
          <button
            onClick={handleCopy}
            style={{ ...btnBase, flex: '1 1 72px', background: 'rgba(255,255,255,0.05)', color: copied ? '#E8C547' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, transition: 'color 150ms ease' }}
          >{copied ? 'Copied' : 'Copy'}</button>
          <button
            onClick={handleShare}
            style={{ ...btnBase, flex: '1 1 72px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
          >Share</button>
          {canShareImg && !isDualCard ? (
            <button
              onClick={handleShareImage}
              style={{ ...btnBase, flex: '1 1 100px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
            >Share image</button>
          ) : null}
        </div>

        {/* Individual-card carousel — optional secondary presentation,
            only when the Moment actually has more than one line. The
            combined poster above remains the default; this never appears
            before the user has already seen it. Visually subordinate: a
            small preview and two compact ghost buttons, not another set
            of primary-weight CTAs. */}
        {isMulti && (
          <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <p style={sectionLabelStyle}>Share the lines separately?</p>
              <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {carouselIndex + 1} / {momentLines.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                aria-label="Previous card"
                onClick={() => setCarouselIndex(i => (i - 1 + momentLines.length) % momentLines.length)}
                style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                  <ChevronRightIcon size={16} color="var(--text-secondary)" />
                </span>
              </button>

              <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', background: '#07060A', maxHeight: 'min(30dvh, 220px)' }}>
                <canvas
                  ref={carouselCanvasRef}
                  style={{ width: '100%', aspectRatio: `${activeShape.w} / ${activeShape.h}`, display: 'block' }}
                />
              </div>

              <button
                type="button"
                aria-label="Next card"
                onClick={() => setCarouselIndex(i => (i + 1) % momentLines.length)}
                style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <ChevronRightIcon size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => handleExportCard(carouselIndex)}
                disabled={!!exportAllProgress}
                style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, opacity: exportAllProgress ? 0.5 : 1, cursor: exportAllProgress ? 'not-allowed' : 'pointer' }}
              >This card</button>
              <button
                onClick={handleExportAllCards}
                disabled={!!exportAllProgress}
                style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, opacity: exportAllProgress ? 0.7 : 1, cursor: exportAllProgress ? 'not-allowed' : 'pointer' }}
              >{exportAllProgress ? `${exportAllProgress.done}/${exportAllProgress.total}…` : 'All cards'}</button>
            </div>
            {exportAllProgress && (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                If your browser blocks multiple downloads, allow them when prompted.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
