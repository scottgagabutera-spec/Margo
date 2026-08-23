import { toBlob } from 'html-to-image'
import { inspectImageBlob, logExportDebug } from '@/lib/export/export-debug'
import { validateCaptureBlob } from '@/lib/export/validate-capture-blob'

export type LiteralCaptureOptions = {
  /** Device pixel ratio multiplier. Default 2. */
  pixelRatio?: number
  attemptId?: string
}

type StyleRestore = () => void

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/**
 * Expand overflow/max-height constraints so the full scrollable tree is
 * included in the capture — literal export, not viewport-only screenshot.
 */
function expandForFullCapture(root: HTMLElement): StyleRestore {
  const restores: StyleRestore[] = []
  let expandedCount = 0

  const visit = (el: HTMLElement) => {
    const computed = window.getComputedStyle(el)
    const needsExpand =
      computed.overflowY === 'auto' ||
      computed.overflowY === 'scroll' ||
      computed.overflow === 'auto' ||
      computed.overflow === 'scroll' ||
      (computed.maxHeight && computed.maxHeight !== 'none')

    if (needsExpand) {
      expandedCount += 1
      const prev = {
        overflow: el.style.overflow,
        overflowY: el.style.overflowY,
        maxHeight: el.style.maxHeight,
        height: el.style.height,
        flex: el.style.flex,
      }
      el.style.overflow = 'visible'
      el.style.overflowY = 'visible'
      el.style.maxHeight = 'none'
      el.style.height = 'auto'
      if (computed.flex && computed.flex !== '0 1 auto') {
        el.style.flex = '0 0 auto'
      }
      restores.push(() => {
        el.style.overflow = prev.overflow
        el.style.overflowY = prev.overflowY
        el.style.maxHeight = prev.maxHeight
        el.style.height = prev.height
        el.style.flex = prev.flex
      })
    }

    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) visit(child)
    }
  }

  visit(root)

  const prevTransform = root.style.transform
  const computedTransform = window.getComputedStyle(root).transform
  if (prevTransform) {
    root.style.transform = 'none'
    restores.push(() => { root.style.transform = prevTransform })
  }

  logExportDebug('literal-ui-capture:expand', {
    expandedCount,
    inlineTransformCleared: !!prevTransform,
    computedTransform: computedTransform !== 'none' ? computedTransform : 'none',
  })

  return () => { restores.forEach(fn => fn()) }
}

/** Ensure cloned/canvas inlining can fetch remote artwork with CORS during capture. */
function applyCaptureImageCors(root: HTMLElement): StyleRestore {
  const restores: StyleRestore[] = []

  for (const img of Array.from(root.querySelectorAll('img'))) {
    const prevAttr = img.getAttribute('crossorigin')
    if (img.crossOrigin !== 'anonymous') {
      img.crossOrigin = 'anonymous'
      restores.push(() => {
        if (prevAttr === null) img.removeAttribute('crossorigin')
        else img.setAttribute('crossorigin', prevAttr)
      })
    }
  }

  return () => { restores.forEach(fn => fn()) }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  const pending: string[] = []
  await Promise.all(imgs.map((img, i) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    pending.push(`img[${i}] src=${img.currentSrc || img.src || '(empty)'}`)
    return new Promise<void>((resolve) => {
      const done = () => resolve()
      img.addEventListener('load', done, { once: true })
      img.addEventListener('error', done, { once: true })
      setTimeout(done, 4000)
    })
  }))
  if (pending.length) {
    logExportDebug('literal-ui-capture:images-waited', { pending })
  }
}

function countImages(root: HTMLElement): { total: number; loaded: number; crossOrigin: string[] } {
  const imgs = Array.from(root.querySelectorAll('img'))
  return {
    total: imgs.length,
    loaded: imgs.filter(img => img.complete && img.naturalWidth > 0).length,
    crossOrigin: imgs.map(img => img.crossOrigin || '(default)'),
  }
}

/**
 * Capture a live React UI subtree to PNG (literal visual export).
 * Caller must pass the in-app root (e.g. .song-preview-card), not the scrim.
 */
export async function captureLiteralUi(
  element: HTMLElement,
  options: LiteralCaptureOptions = {},
): Promise<Blob> {
  const pixelRatio = options.pixelRatio ?? 2
  const attemptId = options.attemptId ?? `capture-${Date.now()}`

  logExportDebug('literal-ui-capture:start', {
    attemptId,
    connected: element.isConnected,
    offsetSize: { w: element.offsetWidth, h: element.offsetHeight },
    images: countImages(element),
  })

  if (typeof document !== 'undefined') {
    try {
      await document.fonts.ready
      logExportDebug('literal-ui-capture:fonts', { attemptId, status: document.fonts.status })
    } catch { /* ignore */ }
  }

  await waitForImages(element)

  const restoreExpand = expandForFullCapture(element)
  const restoreCors = applyCaptureImageCors(element)

  try {
    await waitForImages(element)
    await waitForLayout()

    const blob = await toBlob(element, {
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
      backgroundColor: '#0e0c12',
      fetchRequestInit: {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
      },
    })

    if (!blob) throw new Error('literal-ui-capture: toBlob returned null')

    await validateCaptureBlob(blob)

    const diagnostics = await inspectImageBlob(blob)
    logExportDebug('literal-ui-capture:done', { attemptId, diagnostics })

    return blob
  } catch (err) {
    logExportDebug('literal-ui-capture:error', {
      attemptId,
      error: (err as Error)?.message ?? String(err),
    })
    throw err
  } finally {
    restoreCors()
    restoreExpand()
    logExportDebug('literal-ui-capture:restored', { attemptId })
  }
}
