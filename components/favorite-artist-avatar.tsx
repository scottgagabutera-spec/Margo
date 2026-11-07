'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { favoriteArtistThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import { portraitFallbackFromSeed } from '@/lib/portrait-fallback'

export function FavoriteArtistAvatar({
  name,
  artworkUrl,
  fallbackArtworkUrl,
  priority,
}: {
  name: string
  artworkUrl: string | null
  fallbackArtworkUrl?: string | null
  priority?: boolean
}) {
  const [src, setSrc] = useState(() => {
    const primary = favoriteArtistThumbnailUrl(artworkUrl)
    if (primary) return primary
    return favoriteArtistThumbnailUrl(fallbackArtworkUrl) || null
  })
  const [failed, setFailed] = useState(false)

  const onError = useCallback(() => {
    const fb = favoriteArtistThumbnailUrl(fallbackArtworkUrl)
    if (fb && src !== fb) {
      setSrc(fb)
      return
    }
    setFailed(true)
  }, [fallbackArtworkUrl, src])

  if (!src || failed) {
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
    const gradient = portraitFallbackFromSeed(name)
    return (
      <span
        className="margo-profile-favorite-artists__art margo-profile-favorite-artists__art--initials"
        style={{ background: gradient }}
        aria-hidden
      >
        <span className="margo-profile-favorite-artists__initial">{initial}</span>
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      width={56}
      height={56}
      className="margo-profile-favorite-artists__art"
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      onError={onError}
    />
  )
}
