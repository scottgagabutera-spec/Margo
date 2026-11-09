'use client'

type Props = {
  vibeFilterActive?: boolean
}

export function FeedShortsComingSoon({ vibeFilterActive = false }: Props) {
  const vibeClass = vibeFilterActive ? ' margo-feed-shorts-empty--with-vibe' : ''
  return (
    <div className={`margo-feed-shorts-empty margo-feed-shorts-coming-soon${vibeClass}`} role="status">
      <p className="margo-feed-shorts-coming-soon__title">Shorts are coming soon</p>
      <p className="margo-feed-shorts-coming-soon__body">Short clips of songs, back soon.</p>
    </div>
  )
}
