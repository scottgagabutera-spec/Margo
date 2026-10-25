const TARGET_ASPECT = 4 / 5

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = url
  })
}

/**
 * Center crop to 4:5; verticalFocus 0–100 maps to vertical crop anchor (default ~35 = face-friendly).
 */
export async function cropImageToPortraitBlob(
  file: File,
  verticalFocus = 35,
): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const imgAspect = iw / ih

    let sw: number
    let sh: number
    let sx: number
    let sy: number

    if (imgAspect > TARGET_ASPECT) {
      sh = ih
      sw = ih * TARGET_ASPECT
      sx = (iw - sw) / 2
      sy = (ih - sh) * (verticalFocus / 100)
    } else {
      sw = iw
      sh = iw / TARGET_ASPECT
      sx = 0
      sy = (ih - sh) * (verticalFocus / 100)
    }

    sx = Math.max(0, Math.min(sx, iw - sw))
    sy = Math.max(0, Math.min(sy, ih - sh))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw)
    canvas.height = Math.round(sh)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
        'image/jpeg',
        0.92,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function cropImageToPortraitFile(
  file: File,
  verticalFocus = 35,
): Promise<File> {
  const blob = await cropImageToPortraitBlob(file, verticalFocus)
  const base = file.name.replace(/\.[^.]+$/, '') || 'avatar'
  return new File([blob], base + '.jpg', { type: 'image/jpeg' })
}
