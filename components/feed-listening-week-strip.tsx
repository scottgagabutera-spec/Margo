'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { MargoSectionHeader } from '@/components/margo-section-header'
import { MargoAvatar } from '@/components/margo-avatar'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import type { ListeningWeekRow } from '@/lib/feed-listening-week'
import { playFull } from '@/lib/audio-engine'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedListeningWeekStrip({ rows }: { rows: ListeningWeekRow[] }) {
  const router = useRouter()
  if (rows.length === 0) return null

  const seeAllHref = '/feed?tab=memories&filter=listening'

  return (
    <div className="margo-feed-listening-week">
      <MargoSectionHeader
        title="Listening this week"
        className="margo-feed-listening-week__head"
        action={
          <Link href={seeAllHref} className="margo-feed-memories-row__see-all" aria-label="See all listening">
            <ChevronRightIcon size={16} color="var(--gold)" />
          </Link>
        }
      />
      <ul className="margo-feed-listening-week__list">
        {rows.map((row) => (
          <li key={row.memoryId} className="margo-feed-listening-week__row">
            {row.artworkUrl ? (
              <img
                src={compactArtworkUrl(row.artworkUrl, 120)}
                alt=""
                width={40}
                height={40}
                className="margo-feed-listening-week__art"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="margo-feed-listening-week__art margo-feed-listening-week__art--empty" aria-hidden />
            )}
            <div className="margo-feed-listening-week__meta">
              <p className="margo-feed-listening-week__song" style={{ fontFamily: font }}>
                {row.songTitle}
              </p>
              <p className="margo-feed-listening-week__artist" style={{ fontFamily: font }}>
                {row.artistName}
              </p>
              <Link href={`/profile/${row.ownerUsername}`} className="margo-feed-listening-week__user">
                <MargoAvatar size="xs" imageUrl={row.ownerAvatarUrl} username={row.ownerUsername} displayName={row.ownerUsername} />
                <span style={{ fontFamily: font }}>@{row.ownerUsername}</span>
              </Link>
            </div>
            <button
              type="button"
              className="margo-feed-listening-week__play"
              aria-label={`Play ${row.songTitle}`}
              onClick={() => {
                if (row.songId && row.audioUrl && !row.isLyricOnly) {
                  void playFull({
                    songId: row.songId,
                    audioUrl: row.audioUrl,
                    title: row.songTitle,
                    artist: row.artistName,
                    artwork: row.artworkUrl,
                    autoplay: true,
                    source: 'feed-tier1',
                  })
                  return
                }
                router.push(`/memory/${row.memoryId}`)
              }}
            >
              <PlayPauseIcon playing={false} buffering={false} size={14} color="var(--bg)" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
