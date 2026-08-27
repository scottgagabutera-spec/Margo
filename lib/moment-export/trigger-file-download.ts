export type FileDownloadResult = 'downloaded' | 'shared' | 'opened' | 'failed'

function canShareFile(file: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Trigger a file save from a direct user gesture (button tap).
 * iOS ignores `<a download>` — opens the share sheet so the user can Save to Files.
 */
export async function triggerFileDownload(file: File): Promise<FileDownloadResult> {
  if (typeof document === 'undefined') return 'failed'

  if (isIosLike() && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: 'MARGO Moment' })
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'failed'
      return 'failed'
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return 'downloaded'
  } catch {
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
      return 'opened'
    } catch {
      return 'failed'
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
