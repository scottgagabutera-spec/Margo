'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import type { FeedShortsStripTile } from '@/lib/feed-shorts-strip-types'
import { getShortsChromeTokens } from '@/lib/shorts-chrome-tokens'
import { pickShortsLook } from '@/lib/shorts-looks'
import { utcDayKey } from '@/lib/shorts-shelf-rotation'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

function shortsHref(index: number) {
  return `/feed?tab=shorts&shortsAt=${index}`
}

function shortsTabHref() {
  return '/feed?tab=shorts'
}

export function FeedShortsStrip({ tiles }: { tiles: FeedShortsStripTile[] }) {
  const router = useRouter()
  const day = utcDayKey(new Date())

  return (
    <section className="margo-feed-shorts-strip" aria-label="Shorts">
      <StripHeader font={font} onSeeAll={() => router.push(shortsTabHref())} />
      <div className="margo-feed-shorts-strip__row">
        {tiles.map((tile) => {
          const look = pickShortsLook(tile.songId, tile.vibe, day)
          const tokens = getShortsChromeTokens(look.stageThemeId, look.atmosphereId)
          return (
            <Link
              key={`${tile.songId}-${tile.lineId}`}
              href={shortsHref(tile.stripIndex)}
              className="margo-feed-shorts-strip__tile"
              style={{
                background: tokens.progressFill,
              }}
            >
              {tile.artworkThumb ? (
                <img
                  src={tile.artworkThumb}
                  alt=""
                  className="margo-feed-shorts-strip__thumb"
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <p className="margo-feed-shorts-strip__line" style={{ fontFamily: font }}>
                {tile.line}
              </p>
            </Link>
          )
        })}
        {Array.from({ length: Math.max(0, 3 - tiles.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="margo-feed-shorts-strip__tile margo-feed-shorts-strip__tile--empty" aria-hidden />
        ))}
        <Link href={shortsTabHref()} className="margo-feed-shorts-strip__more" aria-label="See all Shorts">
          <span className="margo-feed-shorts-strip__more-btn">
            <ChevronRightIcon size={18} color="var(--gold)" />
          </span>
        </Link>
      </div>
    </section>
  )
}

function StripHeader({ font, onSeeAll }: { font: string; onSeeAll: () => void }) {
  return (
    <div className="margo-feed-shorts-strip__head">
      <h2 className="margo-feed-shorts-strip__title" style={{ fontFamily: font }}>
        Shorts
      </h2>
      <button type="button" className="margo-feed-shorts-strip__see-all" aria-label="See all Shorts" onClick={onSeeAll}>
        <ChevronRightIcon size={16} color="var(--gold)" />
      </button>
    </div>
  )
}
