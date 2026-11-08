'use client'

import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { MargoSectionHeader } from '@/components/margo-section-header'
import type { FeedShortsStripTile } from '@/lib/feed-shorts-strip-types'
import { darkenFeedStripTileBg, feedStripTileInk } from '@/lib/feed-strip-tile-colors'
import { getShortsChromeTokens } from '@/lib/shorts-chrome-tokens'
import { pickShortsLook } from '@/lib/shorts-looks'
import { utcDayKey } from '@/lib/shorts-shelf-rotation'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import { openFeedTab } from '@/lib/feed-mix-nav'
import { useTapAck } from '@/hooks/use-tap-ack'

const lyricFont = LYRIC_FONT
const uiFont = UI_FONT


export function FeedShortsStrip({ tiles }: { tiles: FeedShortsStripTile[] }) {
  const router = useRouter()
  const { ack, isAcked } = useTapAck()
  const day = utcDayKey(new Date())

  return (
    <section className="margo-feed-shorts-strip" aria-label="Shorts">
      <MargoSectionHeader
        title="Shorts"
        className="margo-feed-shorts-strip__head"
        action={
          <button
            type="button"
            className="margo-feed-shorts-strip__see-all"
            aria-label="See all Shorts"
            data-margo-acked={isAcked('all') ? 1 : undefined}
            onPointerDown={() => ack('all')}
            onClick={() => openFeedTab(router, 'shorts')}
          >
            <ChevronRightIcon size={16} color="var(--gold)" />
          </button>
        }
      />
      <div className="margo-feed-shorts-strip__row">
        {tiles.map((tile) => {
          const look = pickShortsLook(tile.songId, tile.vibe, day)
          const tokens = getShortsChromeTokens(look.stageThemeId, look.atmosphereId)
          const bg = darkenFeedStripTileBg(tokens.progressFill)
          const ink = feedStripTileInk(bg)
          return (
            <button
              type="button"
              key={`${tile.songId}-${tile.lineId}`}
              data-margo-acked={isAcked(`${tile.songId}-${tile.lineId}`) ? 1 : undefined}
              onPointerDown={() => ack(`${tile.songId}-${tile.lineId}`)}
              onClick={() => openFeedTab(router, 'shorts', { shortsAt: tile.stripIndex })}
              className="margo-feed-shorts-strip__tile margo-mix-press"
              style={{
                background: bg,
                color: ink,
                ['--margo-feed-shorts-tile-ink' as string]: ink,
              }}
            >
              {tile.artworkThumb ? (
                <img
                  src={tile.artworkThumb}
                  alt=""
                  className="margo-feed-shorts-strip__thumb"
                  width={34}
                  height={34}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="margo-feed-shorts-strip__thumb margo-feed-shorts-strip__thumb--empty" aria-hidden />
              )}
              <p className="margo-feed-shorts-strip__line" style={{ fontFamily: lyricFont }}>
                {tile.line}
              </p>
              <p className="margo-feed-shorts-strip__song" style={{ fontFamily: uiFont }}>
                {tile.songTitle}
              </p>
            </button>
          )
        })}
        {Array.from({ length: Math.max(0, 3 - tiles.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="margo-feed-shorts-strip__tile margo-feed-shorts-strip__tile--empty" aria-hidden />
        ))}
        <button type="button" className="margo-feed-shorts-strip__more" aria-label="See all Shorts" onClick={() => openFeedTab(router, 'shorts')}>
          <span className="margo-feed-shorts-strip__more-btn">
            <ChevronRightIcon size={18} color="var(--gold)" />
          </span>
        </button>
      </div>
    </section>
  )
}
