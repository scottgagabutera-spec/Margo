/**
 * Whether the current browser can share image files via navigator.share({ files }).
 * Does not guarantee the destination app will accept the image.
 */
export function canShareImageFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.share) return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    const probe = new File([''], 'margo-moment.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}
