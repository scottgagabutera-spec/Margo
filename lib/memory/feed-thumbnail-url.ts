import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import type { MemoryPublic } from '@/lib/memory/types'
import { memoryCoverIsSongArt } from '@/lib/memory/display-caption'

const GRID_THUMB_PX = 400
const PROFILE_TILE_PX = 160
const FAVORITE_ART_PX = 112

/** Request ~400px cover via Cloudflare image resizing on Margo media host. */
function resizedMargoOrArtwork(url: string, widthPx: number): string {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.includes('trymargo.com') || host.includes('mzstatic.com') || host.includes('itunes')) {
      if (host.includes('mzstatic.com') || host.includes('itunes')) {
        return compactArtworkUrl(url, widthPx)
      }
      const path = u.pathname.replace(/^\//, '')
      return `https://${u.hostname}/cdn-cgi/image/width=${widthPx},format=webp,quality=84,fit=cover/${path}`
    }
  } catch {
    /* keep raw */
  }
  return url
}

export function memoryFeedThumbnailUrl(url: string | null | undefined): string {
  if (!url) return ''
  return resizedMargoOrArtwork(url, GRID_THUMB_PX)
}

export function memoryProfileTileThumbnailUrl(url: string | null | undefined): string {
  if (!url) return ''
  return resizedMargoOrArtwork(url, PROFILE_TILE_PX)
}

export function favoriteArtistThumbnailUrl(url: string | null | undefined): string {
  if (!url) return ''
  return resizedMargoOrArtwork(url, FAVORITE_ART_PX)
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
