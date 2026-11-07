import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import type { MemoryPublic } from '@/lib/memory/types'
import { memoryCoverIsSongArt } from '@/lib/memory/display-caption'

const GRID_THUMB_PX = 400

/** Request ~400px cover via Cloudflare image resizing on Margo media host. */
export function memoryFeedThumbnailUrl(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.includes('trymargo.com') || host.includes('mzstatic.com') || host.includes('itunes')) {
      if (host.includes('mzstatic.com') || host.includes('itunes')) {
        return compactArtworkUrl(url, GRID_THUMB_PX)
      }
      const path = u.pathname.replace(/^\//, '')
      return `https://${u.hostname}/cdn-cgi/image/width=${GRID_THUMB_PX},format=webp,quality=84,fit=cover/${path}`
    }
  } catch {
    /* keep raw */
  }
  return url
}

export function memoryGridCoverSource(memory: MemoryPublic): { src: string; isVideo: boolean } {
  const video = memory.photos.find((p) => p.mediaType === 'video')
  if (video) {
    const poster = video.posterUrl || memory.photos.find((p) => p.mediaType === 'image')?.url
    return {
      src: memoryFeedThumbnailUrl(poster || memory.coverUrl),
      isVideo: true,
    }
  }
  const raw = memory.coverUrl
  if (!raw) return { src: '', isVideo: false }
  const songArt = memoryCoverIsSongArt(memory)
  return {
    src: songArt ? compactArtworkUrl(raw, GRID_THUMB_PX) : memoryFeedThumbnailUrl(raw),
    isVideo: false,
  }
}
