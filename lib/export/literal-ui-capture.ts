import { toBlob } from 'html-to-image'

export type LiteralCaptureOptions = {
  /** Device pixel ratio multiplier. Default 2. */
  pixelRatio?: number
}

type StyleRestore = () => void

/**
 * Expand overflow/max-height constraints so the full scrollable tree is
 * included in the capture — literal export, not viewport-only screenshot.
 */
function expandForFullCapture(root: HTMLElement): StyleRestore {
  const restores: StyleRestore[] = []

  const visit = (el: HTMLElement) => {
    const computed = window.getComputedStyle(el)
    const needsExpand =
      computed.overflowY === 'auto' ||
      computed.overflowY === 'scroll' ||
      computed.overflow === 'auto' ||
      computed.overflow === 'scroll' ||
      (computed.maxHeight && computed.maxHeight !== 'none')

    if (needsExpand) {
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
  if (prevTransform) {
    root.style.transform = 'none'
    restores.push(() => { root.style.transform = prevTransform })
  }

  return () => { restores.forEach(fn => fn()) }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const done = () => resolve()
      img.addEventListener('load', done, { once: true })
      img.addEventListener('error', done, { once: true })
      setTimeout(done, 4000)
    })
  }))
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

  if (typeof document !== 'undefined') {
    try { await document.fonts.ready } catch { /* ignore */ }
  }

  await waitForImages(element)
  const restore = expandForFullCapture(element)

  try {
    const blob = await toBlob(element, {
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
      backgroundColor: '#0e0c12',
    })
    if (!blob) throw new Error('literal-ui-capture: toBlob returned null')
    return blob
  } finally {
    restore()
  }
}
