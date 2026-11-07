'use client'

import Link from 'next/link'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { MargoAvatar } from '@/components/margo-avatar'
import type { MemoryReplyRow } from '@/app/api/memories/[id]/replies/route'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function MemoryRepliesList({ replies }: { replies: MemoryReplyRow[] }) {
  if (replies.length === 0) {
    return (
      <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: '8px 0 0' }}>
        No replies yet.
      </p>
    )
  }
  return (
    <ul className="margo-memory-replies-list">
      {replies.map((r) => (
        <li key={r.id} className="margo-memory-replies-list__item">
          <div className="margo-memory-replies-list__head">
            <Link href={`/profile/${r.actorUsername}`} className="margo-memory-replies-list__user">
              <MargoAvatar size="xs" imageUrl={r.actorAvatarUrl} username={r.actorUsername} />
              <span>@{r.actorUsername}</span>
            </Link>
            <span className="margo-memory-replies-list__kind">{r.kind === 'lyric' ? 'Lyric back' : 'Reply'}</span>
          </div>
          {r.kind === 'lyric' && r.artworkUrl ? (
            <img src={compactArtworkUrl(r.artworkUrl, 80)} alt="" width={36} height={36} className="margo-memory-replies-list__art" />
          ) : null}
          <p className="margo-memory-replies-list__body" style={{ fontFamily: font }}>
            {r.kind === 'lyric' && r.songTitle ? (
              <span className="margo-memory-replies-list__song">
                {r.songTitle}
                {r.artistName ? ` · ${r.artistName}` : ''}
              </span>
            ) : null}
            {r.body}
          </p>
        </li>
      ))}
    </ul>
  )
}
