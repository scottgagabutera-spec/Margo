export function canExportMomentGif(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('2d')
  } catch {
    return false
  }
}

export function canShareGifFiles(file?: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (typeof navigator.canShare !== 'function') return true
  if (!file) return true
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return true
  }
}
