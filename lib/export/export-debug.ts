export type ImageBlobDiagnostics = {
  mime: string
  byteSize: number
  width: number | null
  height: number | null
  hasRenderedPixels: boolean | null
  filename?: string
  fileMime?: string
  canShareFiles: boolean | null
}

/** Enable with `localStorage.setItem('margo_export_debug', '1')` or `?exportDebug=1`. */
export function isExportDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.localStorage?.getItem('margo_export_debug') === '1') return true
    return new URLSearchParams(window.location.search).has('exportDebug')
  } catch {
    return false
  }
}

export function logExportDebug(scope: string, detail: Record<string, unknown>): void {
  if (!isExportDebugEnabled()) return
  console.info(`[margo-export:${scope}]`, detail)
}

async function blobHasRenderedPixels(blob: Blob): Promise<boolean | null> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return null
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(bitmap.width, 32)
    canvas.height = Math.min(bitmap.height, 32)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return null
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true
    }
    return false
  } catch {
    return null
  }
}

export async function inspectImageBlob(
  blob: Blob,
  extra?: { filename?: string; file?: File; canShareFiles?: boolean | null },
): Promise<ImageBlobDiagnostics> {
  let width: number | null = null
  let height: number | null = null
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      width = bitmap.width
      height = bitmap.height
      bitmap.close()
    } catch {
      /* decode failed */
    }
  }

  return {
    mime: blob.type || '(empty)',
    byteSize: blob.size,
    width,
    height,
    hasRenderedPixels: await blobHasRenderedPixels(blob),
    filename: extra?.filename,
    fileMime: extra?.file?.type,
    canShareFiles: extra?.canShareFiles ?? null,
  }
}
