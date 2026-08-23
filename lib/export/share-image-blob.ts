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
  },
): Promise<ShareImageResult> {
  const file = new File([blob], opts.filename, { type: blob.type || 'image/png' })

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: opts.title,
          text: opts.text,
          url: opts.url,
        })
        return 'shared-file'
      }
      if (opts.url) {
        await navigator.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
        })
        downloadBlob(blob, opts.filename)
        return 'shared-url'
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'failed'
    }
  }

  downloadBlob(blob, opts.filename)

  if (opts.url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(opts.url)
    } catch { /* soft fail */ }
  }

  return 'downloaded'
}
