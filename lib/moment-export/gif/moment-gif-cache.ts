import type { MargoMoment } from '@/lib/moment/types'
import type { EncodeMomentGifResult } from '@/lib/moment-export/gif/encode-moment-gif'
import { momentVideoCacheKey } from '@/lib/moment-export/video/moment-video-cache'
import { slugify } from '@/lib/moment-export/save-moment-image'

interface CachedMomentGif {
  key: string
  result: EncodeMomentGifResult
  file: File
  previewUrl: string
}

let cache: CachedMomentGif | null = null

function gifFilename(moment: MargoMoment): string {
  const primary = moment.lines[0]
  const base = slugify(primary?.songTitle || '', 'Lyric')
  return `MARGO_${base}_Moment.gif`
}

export function getCachedMomentGif(moment: MargoMoment): CachedMomentGif | null {
  const key = momentVideoCacheKey(moment)
  if (cache?.key === key) return cache
  return null
}

export function setCachedMomentGif(moment: MargoMoment, result: EncodeMomentGifResult): CachedMomentGif {
  const key = momentVideoCacheKey(moment)
  if (cache && cache.key !== key) {
    URL.revokeObjectURL(cache.previewUrl)
    cache = null
  }
  const file = new File([result.blob], gifFilename(moment), { type: 'image/gif' })
  const previewUrl = URL.createObjectURL(result.blob)
  cache = { key, result, file, previewUrl }
  return cache
}

export function clearMomentGifCache(): void {
  if (cache) {
    URL.revokeObjectURL(cache.previewUrl)
    cache = null
  }
}
