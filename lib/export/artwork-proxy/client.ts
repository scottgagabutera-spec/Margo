import { logExportDebug } from '@/lib/export/export-debug'

type StyleRestore = () => void

export function buildArtworkProxyUrl(originalUrl: string): string {
  const params = new URLSearchParams({ url: originalUrl })
  return `/api/export/artwork-proxy?${params.toString()}`
}

function getImageSourceUrl(img: HTMLImageElement): string {
  return img.currentSrc || img.src || ''
}

function isRemoteArtworkUrl(url: string): boolean {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://trymargo.com')
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return false
    }
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = window.setTimeout(() => {
      reject(new Error(`artwork proxy preload timeout: ${url}`))
    }, 12_000)
    img.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error(`artwork proxy preload failed: ${url}`))
    }
    img.src = url
  })
}

/**
 * During capture only: swap remote <img> sources to same-origin proxy URLs
 * so html-to-image can inline artwork. Restores originals in finally.
 */
export async function swapImagesToProxyForCapture(root: HTMLElement): Promise<StyleRestore> {
  const restores: StyleRestore[] = []
  const swaps: Array<{ img: HTMLImageElement; from: string; to: string }> = []

  for (const img of Array.from(root.querySelectorAll('img'))) {
    const original = getImageSourceUrl(img)
    if (!isRemoteArtworkUrl(original)) continue

    const proxyUrl = buildArtworkProxyUrl(original)
    swaps.push({ img, from: original, to: proxyUrl })
  }

  logExportDebug('literal-ui-capture:proxy-swap', {
    count: swaps.length,
    urls: swaps.map((s) => ({ from: s.from, to: s.to })),
  })

  await Promise.all(swaps.map(async ({ img, from, to }) => {
    await preloadImage(to)

    const prevSrc = img.src
    const prevSrcset = img.getAttribute('srcset')
    const prevCrossOrigin = img.getAttribute('crossorigin')

    img.removeAttribute('srcset')
    img.crossOrigin = 'anonymous'
    img.src = to

    restores.push(() => {
      img.src = prevSrc
      if (prevSrcset === null) img.removeAttribute('srcset')
      else img.setAttribute('srcset', prevSrcset)
      if (prevCrossOrigin === null) img.removeAttribute('crossorigin')
      else img.setAttribute('crossorigin', prevCrossOrigin)
    })
  }))

  return () => { restores.forEach((fn) => fn()) }
}
