import { inspectImageBlob, isExportDebugEnabled, logExportDebug } from '@/lib/export/export-debug'
import { validateCaptureBlob } from '@/lib/export/validate-capture-blob'

export type ShareImageResult =
  | 'shared-file'
  | 'saved-image'
  | 'failed'
  | { type: 'share-ready'; file: File; blob: Blob; filename: string }

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function isMobileShareContext(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Share a PNG file via Web Share. Payload is **files only** — no url/title/text
 * so Android targets cannot prefer a link over the image.
 */
export async function sharePngFile(file: File): Promise<'shared' | 'cancelled' | 'failed'> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'
  if (!navigator.canShare?.({ files: [file] })) return 'failed'

  try {
    logExportDebug('share-image-blob:share-png-file', {
      payload: { filesOnly: true, name: file.name, type: file.type, size: file.size },
    })
    await navigator.share({ files: [file] })
    return 'shared'
  } catch (err) {
    const name = (err as Error)?.name
    logExportDebug('share-image-blob:share-png-file-error', {
      errorName: name,
      errorMessage: (err as Error)?.message ?? String(err),
    })
    if (name === 'AbortError') return 'cancelled'
    return 'failed'
  }
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  downloadBlob(blob, filename)
}

/**
 * After a validated PNG exists, share or save it.
 * Never opens a URL-only native share sheet. Never auto-copies a link.
 */
export async function shareImageBlob(
  blob: Blob,
  opts: {
    filename: string
    attemptId?: string
  },
): Promise<ShareImageResult> {
  const attemptId = opts.attemptId ?? `share-${Date.now()}`

  await validateCaptureBlob(blob)

  const file = new File([blob], opts.filename, { type: 'image/png' })
  const canShareFiles = typeof navigator !== 'undefined' && navigator.canShare
    ? navigator.canShare({ files: [file] })
    : false

  if (isExportDebugEnabled()) {
    const diagnostics = await inspectImageBlob(blob, {
      filename: opts.filename,
      file,
      canShareFiles,
    })
    logExportDebug('share-image-blob:pre', {
      attemptId,
      diagnostics,
      hasNavigatorShare: typeof navigator !== 'undefined' && !!navigator.share,
      isMobileShareContext: isMobileShareContext(),
      canShareFiles,
    })
  }

  // Mobile: defer native share to a fresh user tap (async capture expires gesture).
  if (canShareFiles && isMobileShareContext()) {
    logExportDebug('share-image-blob:branch', {
      attemptId,
      branch: 'mobile-share-ready (deferred user tap)',
    })
    return { type: 'share-ready', file, blob, filename: opts.filename }
  }

  if (canShareFiles) {
    const shared = await sharePngFile(file)
    if (shared === 'shared') {
      logExportDebug('share-image-blob:result', { attemptId, result: 'shared-file' })
      return 'shared-file'
    }
    if (shared === 'cancelled') {
      logExportDebug('share-image-blob:result', { attemptId, result: 'failed' })
      return 'failed'
    }
    logExportDebug('share-image-blob:branch', {
      attemptId,
      branch: 'desktop-share-failed → share-ready',
    })
    return { type: 'share-ready', file, blob, filename: opts.filename }
  }

  logExportDebug('share-image-blob:branch', {
    attemptId,
    branch: 'canShare(files)=false → download only',
  })
  downloadBlob(blob, opts.filename)
  logExportDebug('share-image-blob:result', { attemptId, result: 'saved-image' })
  return 'saved-image'
}
