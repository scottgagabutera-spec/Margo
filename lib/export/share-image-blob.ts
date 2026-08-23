import { inspectImageBlob, isExportDebugEnabled, logExportDebug } from '@/lib/export/export-debug'
import { validateCaptureBlob } from '@/lib/export/validate-capture-blob'

/** Validated PNG ready for explicit user-chosen share/save/link actions. */
export type PreparedShareImage = {
  file: File
  blob: Blob
  filename: string
  canShareFiles: boolean
}

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
 * Share a PNG file via Web Share. Payload is **files only** — no url/title/text.
 * Must be called from a fresh user gesture (e.g. "Share image" tap).
 */
export async function sharePngFile(file: File): Promise<'shared' | 'cancelled' | 'failed'> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'failed'
  if (!navigator.canShare?.({ files: [file] })) return 'failed'

  try {
    logExportDebug('share-image-blob:share-png-file', {
      payload: { filesOnly: true, name: file.name, type: file.type, size: file.size },
      canShareFiles: true,
    })
    await navigator.share({ files: [file] })
    logExportDebug('share-image-blob:result', { result: 'shared-file' })
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
  logExportDebug('share-image-blob:download', { filename, byteSize: blob.size })
  downloadBlob(blob, filename)
}

export function createSharePngFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: 'image/png',
    lastModified: Date.now(),
  })
}

/**
 * Validate capture and prepare a File for sharing.
 * Does NOT call navigator.share or download — caller shows explicit user actions.
 */
export async function prepareShareImage(
  blob: Blob,
  opts: {
    filename: string
    attemptId?: string
  },
): Promise<PreparedShareImage> {
  const attemptId = opts.attemptId ?? `share-${Date.now()}`

  await validateCaptureBlob(blob)

  const file = createSharePngFile(blob, opts.filename)
  const canShareFiles = typeof navigator !== 'undefined' && navigator.canShare
    ? navigator.canShare({ files: [file] })
    : false

  if (isExportDebugEnabled()) {
    const diagnostics = await inspectImageBlob(blob, {
      filename: opts.filename,
      file,
      canShareFiles,
    })
    logExportDebug('share-image-blob:prepared', {
      attemptId,
      diagnostics,
      hasNavigatorShare: typeof navigator !== 'undefined' && !!navigator.share,
      canShareFiles,
      branch: 'image-ready (awaiting explicit user action)',
    })
  }

  return { file, blob, filename: opts.filename, canShareFiles }
}

/** @deprecated Use prepareShareImage — kept for feed experiment compat */
export type ShareImageResult = PreparedShareImage & { type: 'image-ready' }

export async function shareImageBlob(
  blob: Blob,
  opts: { filename: string; attemptId?: string },
): Promise<ShareImageResult> {
  const prepared = await prepareShareImage(blob, opts)
  return { type: 'image-ready', ...prepared }
}
