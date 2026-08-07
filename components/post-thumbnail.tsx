'use client'

import { useCallback, useMemo, useState } from 'react'

const PLACEHOLDER = '/icon.svg'

type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'>

function youtubeVariant(url: string, variant: 'mqdefault' | 'sddefault'): string | null {
  if (/\/hqdefault\./i.test(url)) return url.replace(/hqdefault/i, variant)
  if (/\/maxresdefault\./i.test(url)) return url.replace(/maxresdefault/i, variant)
  if (/\/sddefault\./i.test(url) && variant === 'mqdefault') return url.replace(/sddefault/i, 'mqdefault')
  const m = url.match(/^(https?:\/\/i\.ytimg\.com\/vi\/[^/?#]+\/)/i)
  if (m) return m[1] + variant + '.jpg'
  return null
}

/**
 * YouTube CDN often 404s hqdefault for some videos. Walk
 * youtube → mqdefault → sddefault → artwork → static placeholder.
 */
export function PostThumbnail({
  youtubeThumbnail,
  artwork,
  alt = '',
  ...imgProps
}: ImgProps & {
  youtubeThumbnail?: string | null
  artwork?: string | null
}) {
  const chain = useMemo(() => {
    const urls: string[] = []
    const push = (u: string | null | undefined) => {
      if (u && !urls.includes(u)) urls.push(u)
    }
    // Prefer mqdefault first — hqdefault 404s for many videos and spams the console.
    if (youtubeThumbnail) {
      push(youtubeVariant(youtubeThumbnail, 'mqdefault'))
      push(youtubeVariant(youtubeThumbnail, 'sddefault'))
      const mq = youtubeVariant(youtubeThumbnail, 'mqdefault')
      if (mq !== youtubeThumbnail) push(youtubeThumbnail)
    }
    push(artwork || null)
    push(PLACEHOLDER)
    return urls
  }, [youtubeThumbnail, artwork])

  const [idx, setIdx] = useState(0)
  const src = chain[Math.min(idx, chain.length - 1)] || PLACEHOLDER

  const onError = useCallback(() => {
    setIdx((i) => (i + 1 < chain.length ? i + 1 : i))
  }, [chain.length])

  if (!youtubeThumbnail && !artwork) return null

  return <img src={src} alt={alt} onError={onError} {...imgProps} />
}
