import type { MargoMoment } from '@/lib/moment/types'
import type { EncodeMomentResult } from '@/lib/moment-export/video/encode-moment-mp4'
import { slugify } from '@/lib/moment-export/save-moment-image'

interface CachedMomentVideo {
  key: string
  result: EncodeMomentResult
  file: File
  previewUrl: string
}

let cache: CachedMomentVideo | null = null

export function momentVideoCacheKey(moment: MargoMoment): string {
  const line = moment.lines[0]
  return [
    moment.seedKey,
    moment.themeId ?? 'gold',
    moment.vibeLabel ?? '',
    line?.lyric ?? '',
    line?.songTitle ?? '',
    line?.snippetStart ?? '',
    line?.snippetEnd ?? '',
    line?.audioUrl ?? '',
  ].join('|')
}

function videoFilename(moment: MargoMoment): string {
  const primary = moment.lines[0]
  const base = slugify(primary?.songTitle || '', 'Lyric')
  return `MARGO_${base}_Moment.mp4`
}

export function getCachedMomentVideo(moment: MargoMoment): CachedMomentVideo | null {
  const key = momentVideoCacheKey(moment)
  if (cache?.key === key) return cache
  return null
}

export function setCachedMomentVideo(moment: MargoMoment, result: EncodeMomentResult): CachedMomentVideo {
  const key = momentVideoCacheKey(moment)
  if (cache && cache.key !== key) {
    URL.revokeObjectURL(cache.previewUrl)
    cache = null
  }
  const file = new File([result.blob], videoFilename(moment), { type: 'video/mp4' })
  const previewUrl = URL.createObjectURL(result.blob)
  cache = { key, result, file, previewUrl }
  return cache
}

export function clearMomentVideoCache(): void {
  if (cache) {
    URL.revokeObjectURL(cache.previewUrl)
    cache = null
  }
}
