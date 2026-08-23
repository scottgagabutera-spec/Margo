import { inspectImageBlob, isExportDebugEnabled, logExportDebug } from '@/lib/export/export-debug'

export type ShareImageResult = 'shared-file' | 'shared-url' | 'downloaded' | 'failed'

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
 * Native share with image file when supported; otherwise download PNG.
 * Optionally copies `url` to clipboard after download fallback.
 */
export async function shareImageBlob(
  blob: Blob,
  opts: {
    filename: string
    title?: string
    text?: string
    url?: string
    /** Correlates concurrent share attempts in debug logs. */
    attemptId?: string
  },
): Promise<ShareImageResult> {
  const attemptId = opts.attemptId ?? `share-${Date.now()}`
  const file = new File([blob], opts.filename, { type: blob.type || 'image/png' })
  const canShareFiles = typeof navigator !== 'undefined' && navigator.canShare
    ? navigator.canShare({ files: [file] })
    : null

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
      optsUrl: opts.url ?? null,
    })
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (canShareFiles) {
        logExportDebug('share-image-blob:branch', {
          attemptId,
          branch: 'navigator.share(files+url)',
          note: 'files and url are both passed — Android may prefer url over image',
        })
        await navigator.share({
          files: [file],
          title: opts.title,
          text: opts.text,
          url: opts.url,
        })
        logExportDebug('share-image-blob:result', { attemptId, result: 'shared-file' })
        return 'shared-file'
      }
      if (opts.url) {
        logExportDebug('share-image-blob:branch', {
          attemptId,
          branch: 'navigator.share(url-only) + downloadBlob',
          note: 'canShare(files) was false — native sheet gets URL, not the PNG',
        })
        await navigator.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
        })
        downloadBlob(blob, opts.filename)
        logExportDebug('share-image-blob:result', { attemptId, result: 'shared-url' })
        return 'shared-url'
      }
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
      branch: 'no navigator.share → download fallback',
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
