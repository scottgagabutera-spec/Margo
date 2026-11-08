'use client'

import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { EchoesSongStrip } from '@/components/echoes-song-strip'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'
import { openFeedEchoesPerson, openFeedEchoesSet } from '@/lib/feed-mix-nav'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedEchoesResultsBlock({ block }: { block: EchoFeedBlockSnapshot }) {
  const router = useRouter()
  const rows = block.preview.slice(0, 2)

  const openSet = () => {
    openFeedEchoesSet(router, block.setId)
  }

  const openPerson = (profileId: string) => {
    openFeedEchoesPerson(router, block.setId, profileId)
  }

  return (
    <article className="margo-feed-echoes-results margo-mix-press" data-feed-exit="echoes-results">
      <header className="margo-feed-echoes-results__head">
        <button type="button" className="margo-feed-echoes-results__head-main" onClick={openSet}>
          <p className="margo-feed-echoes-results__label" style={{ fontFamily: font }}>
            Echoes
          </p>
          <p className="margo-feed-echoes-results__title" style={{ fontFamily: font }}>
            {block.title}
          </p>
        </button>
        <button type="button" className="margo-icon-hit-44" aria-label="Open set" onClick={openSet}>
          <span className="margo-gold-square-30">
            <ChevronRightIcon size={18} color="var(--bg)" />
          </span>
        </button>
      </header>
      <ul className="margo-feed-echoes-results__people">
        {rows.map((row) => (
          <li key={row.answerId} className="margo-feed-echoes-results__person">
            <button
              type="button"
              className="margo-feed-echoes-results__person-link"
              onClick={() => openPerson(row.profileId)}
            >
              <div className="margo-feed-echoes-results__identity">
                <MargoAvatar size="md" imageUrl={row.avatarUrl} username={row.username} displayName={row.displayName} />
                <div className="margo-feed-echoes-results__who">
                  <span className="margo-feed-echoes-results__name" style={{ fontFamily: font }}>
                    {row.isOwn ? 'You' : row.displayName}
                  </span>
                  <span className="margo-feed-echoes-results__handle" style={{ fontFamily: font }}>
                    @{row.username}
                    <span className="margo-feed-echoes-results__time">{row.timeLabel}</span>
                  </span>
                </div>
              </div>
              <EchoesSongStrip payload={row.payload} onSongTap={() => openPerson(row.profileId)} />
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}
