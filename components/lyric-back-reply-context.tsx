'use client'

function formatHandle(username: string): string {
  const h = username.replace(/^@/, '').trim()
  return h ? `@${h}` : '@member'
}

export type LyricBackReplyContextProps = {
  /** Author of the post being answered (handle with or without @). */
  username: string
}

/** One-line compose target — lyric/song for nested focus live in the anchor row, not here. */
export function LyricBackReplyContext({ username }: LyricBackReplyContextProps) {
  const handle = formatHandle(username)
  return (
    <p className="margo-lb-reply-context margo-lb-reply-context--root">
      Replying to {handle}
    </p>
  )
}
