export async function loadMomentArtwork(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url?.trim() || typeof document === 'undefined') return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
