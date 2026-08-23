import { inspectImageBlob, isExportDebugEnabled, logExportDebug } from '@/lib/export/export-debug'
import { validateCaptureBlob } from '@/lib/export/validate-capture-blob'

export type ShareImageResult = 'shared-file' | 'downloaded' | 'failed'

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

/**
 * Share a validated PNG via native file share when supported.
 * Otherwise download the PNG and copy the optional Margo URL to clipboard.
 * Never opens a URL-only native share sheet after successful image generation.
 */
export async function shareImageBlob(
  blob: Blob,
  opts: {
    filename: string
    title?: string
    text?: string
    /** Copied to clipboard on download fallback — not passed to navigator.share with files. */
    url?: string
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
    })
  }

  if (typeof navigator !== 'undefined' && navigator.share && canShareFiles) {
    try {
      logExportDebug('share-image-blob:branch', {
        attemptId,
        branch: 'navigator.share(files only)',
      })
      await navigator.share({
        files: [file],
        title: opts.title,
        text: opts.text,
      })
      logExportDebug('share-image-blob:result', { attemptId, result: 'shared-file' })
      return 'shared-file'
    } catch (err) {
      const name = (err as Error)?.name
      logExportDebug('share-image-blob:error', {
        attemptId,
        errorName: name,
        errorMessage: (err as Error)?.message ?? String(err),
      })
      if (name === 'AbortError') {
        logExportDebug('share-image-blob:result', { attemptId, result: 'failed' })
        return 'failed'
      }
      logExportDebug('share-image-blob:branch', {
        attemptId,
        branch: 'share-threw-non-abort → download fallback',
      })
    }
  } else {
    logExportDebug('share-image-blob:branch', {
      attemptId,
      branch: canShareFiles ? 'no navigator.share → download fallback' : 'canShare(files)=false → download fallback',
    })
  }

  downloadBlob(blob, opts.filename)

  if (opts.url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(opts.url)
    } catch { /* soft fail */ }
  }

  logExportDebug('share-image-blob:result', { attemptId, result: 'downloaded' })
  return 'downloaded'
}
